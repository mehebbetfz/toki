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
        // 1. Check if currently blocked in DB
        var user = await _users.Find(u => u.Id == userId)
                               .Project(u => new { u.SpamBlockedUntilUtc })
                               .FirstOrDefaultAsync();

        if (user?.SpamBlockedUntilUtc > DateTime.UtcNow)
            throw new HubException($"Вы заблокированы за спам до {user.SpamBlockedUntilUtc:HH:mm dd.MM.yyyy} UTC.");

        // 2. Sliding window counter
        var now     = DateTime.UtcNow;
        var cutoff  = now.AddSeconds(-SpamWindowSeconds);
        var queue   = _msgTimestamps.GetOrAdd(userId, _ => new Queue<DateTime>());

        lock (queue)
        {
            while (queue.Count > 0 && queue.Peek() < cutoff) queue.Dequeue();
            queue.Enqueue(now);

            if (queue.Count > SpamMaxMessages)
            {
                // Block for 24 hours — fire-and-forget update
                var until = DateTime.UtcNow.AddHours(24);
                _ = _users.UpdateOneAsync(
                    Builders<User>.Filter.Eq(u => u.Id, userId),
                    Builders<User>.Update.Set(u => u.SpamBlockedUntilUtc, until));

                queue.Clear();
                throw new HubException($"Спам-блок активирован на 24 часа.");
            }
        }
    }

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
