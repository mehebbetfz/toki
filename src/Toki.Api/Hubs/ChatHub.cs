using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver;
using Toki.Api.Models;
using Toki.Api.Services;

namespace Toki.Api.Hubs;

[Authorize]
public sealed class ChatHub : Hub
{
    private readonly IMongoCollection<ChatMessage> _messages;
    private readonly IMongoCollection<User>        _users;
    private readonly IPushNotificationService      _push;

    // ── In-memory spam tracking: userId → queue of recent message timestamps ──
    private static readonly ConcurrentDictionary<string, Queue<DateTime>> _msgTimestamps = new();
    private const int SpamWindowSeconds = 30;
    private const int SpamMaxMessages   = 15;

    public ChatHub(IMongoDatabase db, IPushNotificationService push)
    {
        _messages = db.GetCollection<ChatMessage>("chat_messages");
        _users    = db.GetCollection<User>("users");
        _push     = push;
    }

    public async Task JoinConversation(string conversationId)
        => await Groups.AddToGroupAsync(Context.ConnectionId, $"conv:{conversationId}");

    public async Task LeaveConversation(string conversationId)
        => await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conv:{conversationId}");

    // ── SendCipher ────────────────────────────────────────────────────────────
    public async Task SendCipher(string conversationId, string ciphertextBase64, string? nonceBase64)
    {
        var userId = RequireUserId();
        await CheckSpamOrThrow(userId);

        var msg = new ChatMessage
        {
            ConversationId   = conversationId,
            SenderUserId     = userId,
            CiphertextBase64 = ciphertextBase64,
            NonceBase64      = nonceBase64,
            CreatedAtUtc     = DateTime.UtcNow
        };
        await _messages.InsertOneAsync(msg);

        await Clients.Group($"conv:{conversationId}").SendAsync("ReceiveCipher", new
        {
            messageId        = msg.Id,
            senderUserId     = userId,
            ciphertextBase64,
            nonceBase64,
            createdAtUtc     = msg.CreatedAtUtc
        });

        // Push to recipient (the other party in conv: {userA}_{userB})
        await PushNewMessageAsync(conversationId, userId);
    }

    // ── SendVoice ─────────────────────────────────────────────────────────────
    public async Task SendVoice(string conversationId, string audioBase64, int durationMs)
    {
        var userId = RequireUserId();
        await CheckSpamOrThrow(userId);

        var msg = new ChatMessage
        {
            ConversationId   = conversationId,
            SenderUserId     = userId,
            CiphertextBase64 = audioBase64,
            NonceBase64      = "voice",
            CreatedAtUtc     = DateTime.UtcNow
        };
        await _messages.InsertOneAsync(msg);

        await Clients.Group($"conv:{conversationId}").SendAsync("ReceiveVoice", new
        {
            messageId    = msg.Id,
            senderUserId = userId,
            audioBase64,
            durationMs,
            createdAtUtc = msg.CreatedAtUtc
        });

        await PushNewMessageAsync(conversationId, userId);
    }

    // ── Typing ────────────────────────────────────────────────────────────────
    public async Task SendTyping(string conversationId)
    {
        var userId = RequireUserId();
        await Clients.OthersInGroup($"conv:{conversationId}").SendAsync("UserTyping", new
        {
            senderUserId = userId,
            conversationId
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private async Task CheckSpamOrThrow(string userId)
    {
        // 1. Load current spam state from DB
        var user = await _users.Find(u => u.Id == userId)
                               .Project(u => new { u.SpamBlockedUntilUtc, u.SpamRequiresAdminUnlock, u.SpamOffenseCount })
                               .FirstOrDefaultAsync();

        if (user is null) return;

        // Permanent lock — admin must unblock
        if (user.SpamRequiresAdminUnlock)
            throw new HubException("Ваш аккаунт заблокирован за систематический спам. Обратитесь в поддержку.");

        // Active timed block
        if (user.SpamBlockedUntilUtc > DateTime.UtcNow)
            throw new HubException($"Вы заблокированы за спам до {user.SpamBlockedUntilUtc:HH:mm dd.MM.yyyy} UTC.");

        // 2. Sliding window counter (in-memory)
        var now    = DateTime.UtcNow;
        var cutoff = now.AddSeconds(-SpamWindowSeconds);
        var queue  = _msgTimestamps.GetOrAdd(userId, _ => new Queue<DateTime>());

        bool triggered;
        lock (queue)
        {
            while (queue.Count > 0 && queue.Peek() < cutoff) queue.Dequeue();
            queue.Enqueue(now);
            triggered = queue.Count > SpamMaxMessages;
            if (triggered) queue.Clear();
        }

        if (triggered)
        {
            // Escalate offense count and compute ban duration
            var newOffenseCount = user.SpamOffenseCount + 1;
            var requiresAdmin   = newOffenseCount >= 4;

            DateTime? blockUntil = newOffenseCount switch
            {
                1 => now.AddDays(3),
                2 => now.AddDays(7),
                3 => now.AddDays(30),
                _ => null   // admin unlock required — set far future so active check triggers
            };

            var update = Builders<User>.Update
                .Set(u => u.SpamOffenseCount, newOffenseCount)
                .Set(u => u.SpamRequiresAdminUnlock, requiresAdmin)
                .Set(u => u.SpamBlockedUntilUtc, requiresAdmin ? DateTime.UtcNow.AddYears(10) : blockUntil);

            _ = _users.UpdateOneAsync(Builders<User>.Filter.Eq(u => u.Id, userId), update);

            var msg = requiresAdmin
                ? "Ваш аккаунт заблокирован навсегда — систематический спам. Обратитесь к администратору для разблокировки."
                : $"Спам-блок #{newOffenseCount}: вы заблокированы на {BanLabel(newOffenseCount)}.";

            throw new HubException(msg);
        }
    }

    private static string BanLabel(int offense) => offense switch
    {
        1 => "3 дня",
        2 => "7 дней",
        3 => "30 дней",
        _ => "неограниченный срок"
    };

    /// <summary>Extracts recipient userId from conversationId format "userA_userB", pushes notification.</summary>
    private async Task PushNewMessageAsync(string conversationId, string senderUserId)
    {
        try
        {
            // conversation id is "{id1}_{id2}" — find the other party
            var parts = conversationId.Split('_');
            if (parts.Length != 2) return;
            var recipientId = parts[0] == senderUserId ? parts[1] : parts[0];

            var recipient = await _users
                .Find(u => u.Id == recipientId)
                .Project(u => new { u.ExpoPushToken, u.DisplayName })
                .FirstOrDefaultAsync();

            if (string.IsNullOrEmpty(recipient?.ExpoPushToken)) return;

            var sender = await _users
                .Find(u => u.Id == senderUserId)
                .Project(u => new { u.DisplayName })
                .FirstOrDefaultAsync();

            var senderName = sender?.DisplayName ?? "Кто-то";
            await _push.SendAsync(
                recipient.ExpoPushToken,
                "Новое сообщение",
                $"{senderName} написал(а) вам",
                new { type = "message", conversationId, senderUserId });
        }
        catch
        {
            // Non-critical — ignore push errors
        }
    }

    private string RequireUserId()
    {
        var id = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                 ?? Context.User?.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(id)) throw new HubException("Unauthorized");
        return id;
    }
}
