using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using Toki.Api.Models;
using Toki.Api.Options;

namespace Toki.Api.Controllers;

/// <summary>Admin endpoints for spam management and user moderation.</summary>
[ApiController]
[Route("api/admin/users")]
public sealed class AdminUsersController : ControllerBase
{
    private readonly IMongoCollection<User> _users;
    private readonly AdminOptions           _admin;

    public AdminUsersController(IMongoDatabase db, IOptions<AdminOptions> admin)
    {
        _users = db.GetCollection<User>("users");
        _admin = admin.Value;
    }

    private bool IsAdmin()
    {
        if (string.IsNullOrEmpty(_admin.ApiKey)) return false;
        return Request.Headers.TryGetValue("X-Admin-Key", out var key)
               && key.ToString() == _admin.ApiKey;
    }

    // ── GET /api/admin/users/spam-blocked ────────────────────────────────────
    /// <summary>Returns all users who are currently spam-blocked or require admin unlock.</summary>
    [HttpGet("spam-blocked")]
    public async Task<IActionResult> GetSpamBlocked(CancellationToken ct)
    {
        if (!IsAdmin()) return Forbid();

        var filter = Builders<User>.Filter.Or(
            Builders<User>.Filter.Eq(u => u.SpamRequiresAdminUnlock, true),
            Builders<User>.Filter.Gt(u => u.SpamBlockedUntilUtc, DateTime.UtcNow)
        );

        var users = await _users.Find(filter).ToListAsync(ct);

        var result = users.Select(u => new
        {
            u.Id,
            u.DisplayName,
            u.Email,
            u.SpamOffenseCount,
            u.SpamRequiresAdminUnlock,
            spamBlockedUntilUtc = u.SpamBlockedUntilUtc,
            status = u.SpamRequiresAdminUnlock
                ? "permanent_lock"
                : u.SpamBlockedUntilUtc > DateTime.UtcNow
                    ? $"blocked_until_{u.SpamBlockedUntilUtc:yyyy-MM-dd}"
                    : "active",
        });

        return Ok(result);
    }

    // ── POST /api/admin/users/{userId}/unblock-spam ──────────────────────────
    /// <summary>Removes spam block and optionally resets the offense counter.</summary>
    [HttpPost("{userId}/unblock-spam")]
    public async Task<IActionResult> UnblockSpam(string userId, [FromBody] UnblockRequest? body, CancellationToken ct)
    {
        if (!IsAdmin()) return Forbid();

        var user = await _users.Find(u => u.Id == userId).FirstOrDefaultAsync(ct);
        if (user is null) return NotFound($"User {userId} not found.");

        var update = Builders<User>.Update
            .Set(u => u.SpamBlockedUntilUtc,     null)
            .Set(u => u.SpamRequiresAdminUnlock,  false);

        if (body?.ResetOffenseCount == true)
            update = update.Set(u => u.SpamOffenseCount, 0);

        await _users.UpdateOneAsync(Builders<User>.Filter.Eq(u => u.Id, userId), update, cancellationToken: ct);

        return Ok(new
        {
            message      = $"User {user.DisplayName} ({userId}) unblocked.",
            offenseCount = body?.ResetOffenseCount == true ? 0 : user.SpamOffenseCount,
        });
    }

    // ── POST /api/admin/users/{userId}/force-block ───────────────────────────
    /// <summary>Manually applies a permanent spam lock (useful for manual moderation).</summary>
    [HttpPost("{userId}/force-block")]
    public async Task<IActionResult> ForceBlock(string userId, CancellationToken ct)
    {
        if (!IsAdmin()) return Forbid();

        var update = Builders<User>.Update
            .Set(u => u.SpamRequiresAdminUnlock, true)
            .Set(u => u.SpamBlockedUntilUtc,     DateTime.UtcNow.AddYears(10))
            .Inc(u => u.SpamOffenseCount,         1);

        var result = await _users.UpdateOneAsync(
            Builders<User>.Filter.Eq(u => u.Id, userId), update, cancellationToken: ct);

        if (result.MatchedCount == 0) return NotFound();
        return Ok(new { message = $"User {userId} permanently blocked." });
    }
}

public record UnblockRequest(bool ResetOffenseCount = false);
