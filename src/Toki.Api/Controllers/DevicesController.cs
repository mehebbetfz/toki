using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using Toki.Api.Models;

namespace Toki.Api.Controllers;

/// <summary>Manages Expo push tokens and map status messages.</summary>
[ApiController]
[Route("api/devices")]
[Authorize]
public sealed class DevicesController : ControllerBase
{
    private readonly IMongoCollection<User> _users;
    private readonly IMongoCollection<UserProfile> _profiles;

    public DevicesController(IMongoDatabase db)
    {
        _users    = db.GetCollection<User>("users");
        _profiles = db.GetCollection<UserProfile>("profiles");
    }

    private string RequireUserId() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new InvalidOperationException("No user id");

    // ── Register/update Expo push token ─────────────────────────────────────
    [HttpPost("push-token")]
    public async Task<IActionResult> RegisterToken([FromBody] RegisterTokenRequest body, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.Token)) return BadRequest("Token required");
        var userId = RequireUserId();

        await _users.UpdateOneAsync(
            Builders<User>.Filter.Eq(u => u.Id, userId),
            Builders<User>.Update.Set(u => u.ExpoPushToken, body.Token),
            cancellationToken: ct);

        return NoContent();
    }

    // ── Get map status message ────────────────────────────────────────────────
    [HttpGet("map-status")]
    public async Task<ActionResult<MapStatusResponse>> GetMapStatus(CancellationToken ct)
    {
        var userId = RequireUserId();
        var p = await _profiles.Find(x => x.UserId == userId).FirstOrDefaultAsync(ct);
        return Ok(new MapStatusResponse(p?.MapStatusMessage));
    }

    // ── Set map status message ───────────────────────────────────────────────
    [HttpPut("map-status")]
    public async Task<IActionResult> SetMapStatus([FromBody] MapStatusRequest body, CancellationToken ct)
    {
        var userId = RequireUserId();
        var msg    = body.Message?.Trim();
        if (msg?.Length > 140) msg = msg[..140];

        var filter = Builders<UserProfile>.Filter.Eq(p => p.UserId, userId);
        var update = Builders<UserProfile>.Update
            .Set(p => p.MapStatusMessage, string.IsNullOrEmpty(msg) ? null : msg)
            .Set(p => p.MapStatusMessageUpdatedAt, DateTime.UtcNow)
            .Set(p => p.UpdatedAtUtc, DateTime.UtcNow)
            .SetOnInsert(p => p.UserId, userId);

        await _profiles.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true }, ct);
        return NoContent();
    }
}

public record RegisterTokenRequest(string Token);
public record MapStatusRequest(string? Message);
public record MapStatusResponse(string? Message);
