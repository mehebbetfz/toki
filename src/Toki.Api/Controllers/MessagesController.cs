using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using Toki.Api.Models;
using Toki.Api.Services;

namespace Toki.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class MessagesController : ControllerBase
{
    private readonly IMongoCollection<ChatMessage> _messages;

    public MessagesController(IMongoDatabase db)
    {
        _messages = db.GetCollection<ChatMessage>("chat_messages");
    }

    [HttpGet("conversation/{conversationId}")]
    public async Task<ActionResult<IReadOnlyList<ChatMessageDto>>> GetHistory(
        string conversationId,
        [FromQuery] int limit = 50,
        CancellationToken ct = default)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        if (!conversationId.Contains(userId, StringComparison.Ordinal))
            return Forbid();

        limit = Math.Clamp(limit, 1, 200);
        var list = await _messages.Find(x => x.ConversationId == conversationId)
            .SortByDescending(x => x.CreatedAtUtc)
            .Limit(limit)
            .ToListAsync(ct);

        list.Reverse();
        return Ok(list.Select(m => new ChatMessageDto(m.Id!, m.SenderUserId, m.CiphertextBase64, m.NonceBase64, m.CreatedAtUtc)).ToList());
    }

    [HttpGet("conversation-id/{otherUserId}")]
    public ActionResult<string> GetConversationId(string otherUserId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Ok(ConversationId.ForUsers(userId, otherUserId));
    }
}

public sealed record ChatMessageDto(
    string Id,
    string SenderUserId,
    string CiphertextBase64,
    string? NonceBase64,
    DateTime CreatedAtUtc);
