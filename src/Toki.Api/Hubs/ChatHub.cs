using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver;
using Toki.Api.Models;

namespace Toki.Api.Hubs;

[Authorize]
public sealed class ChatHub : Hub
{
    private readonly IMongoCollection<ChatMessage> _messages;

    public ChatHub(IMongoDatabase db)
    {
        _messages = db.GetCollection<ChatMessage>("chat_messages");
    }

    public async Task JoinConversation(string conversationId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"conv:{conversationId}");
    }

    public async Task LeaveConversation(string conversationId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conv:{conversationId}");
    }

    /// <summary>Клиенты шлют уже зашифрованный полезный груз; сервер только ретранслирует и сохраняет.</summary>
    public async Task SendCipher(string conversationId, string ciphertextBase64, string? nonceBase64)
    {
        var userId = RequireUserId();
        var msg = new ChatMessage
        {
            ConversationId = conversationId,
            SenderUserId = userId,
            CiphertextBase64 = ciphertextBase64,
            NonceBase64 = nonceBase64,
            CreatedAtUtc = DateTime.UtcNow
        };
        await _messages.InsertOneAsync(msg);

        await Clients.Group($"conv:{conversationId}").SendAsync("ReceiveCipher", new
        {
            messageId = msg.Id,
            senderUserId = userId,
            ciphertextBase64,
            nonceBase64,
            createdAtUtc = msg.CreatedAtUtc
        });
    }

    private string RequireUserId()
    {
        var id = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                 ?? Context.User?.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(id))
            throw new HubException("Unauthorized");
        return id;
    }
}
