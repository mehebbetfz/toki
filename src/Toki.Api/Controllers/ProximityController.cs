using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using MongoDB.Driver.GeoJsonObjectModel;
using Toki.Api.Models;
using Toki.Api.Services;

namespace Toki.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class ProximityController : ControllerBase
{
    private readonly IMongoCollection<User>        _users;
    private readonly IMongoCollection<UserProfile> _profiles;
    private readonly IPushNotificationService      _push;

    public ProximityController(IMongoDatabase db, IPushNotificationService push)
    {
        _users    = db.GetCollection<User>("users");
        _profiles = db.GetCollection<UserProfile>("profiles");
        _push     = push;
    }

    private string RequireUserId() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new InvalidOperationException("No user id");

    public sealed record ProximityStateRequest(double Latitude, double Longitude, bool WantsToChat);

    [HttpPost("state")]
    public async Task<IActionResult> SetState([FromBody] ProximityStateRequest body, CancellationToken ct)
    {
        var userId = RequireUserId();
        var point  = GeoJson.Point(GeoJson.Geographic(body.Longitude, body.Latitude));

        var update = Builders<User>.Update
            .Set(x => x.Location, point)
            .Set(x => x.WantsToChat, body.WantsToChat)
            .Set(x => x.WantsToChatExpiresUtc, body.WantsToChat ? DateTime.UtcNow.AddHours(4) : null)
            .Set(x => x.LastSeenUtc, DateTime.UtcNow);

        await _users.UpdateOneAsync(Builders<User>.Filter.Eq(x => x.Id, userId), update, cancellationToken: ct);

        // If user just became active, notify nearby friends with whom they chat most
        if (body.WantsToChat)
            _ = NotifyNearbyFriendsAsync(userId, point, ct);

        return NoContent();
    }

    [HttpGet("nearby")]
    public async Task<ActionResult<IReadOnlyList<NearbyUserDto>>> Nearby(
        [FromQuery] double latitude,
        [FromQuery] double longitude,
        CancellationToken ct)
    {
        var userId = RequireUserId();

        // Ensure caller is active; if not, return empty (mobile also enforces gate)
        var me = await _users.Find(u => u.Id == userId).FirstOrDefaultAsync(ct);
        if (me is null || !me.WantsToChat || me.WantsToChatExpiresUtc <= DateTime.UtcNow)
            return Ok(Array.Empty<NearbyUserDto>());

        var point = GeoJson.Point(GeoJson.Geographic(longitude, latitude));

        var filter = Builders<User>.Filter.And(
            Builders<User>.Filter.Ne(x => x.Id, userId),
            Builders<User>.Filter.Eq(x => x.WantsToChat, true),
            Builders<User>.Filter.Gt(x => x.WantsToChatExpiresUtc, DateTime.UtcNow),
            Builders<User>.Filter.Ne(x => x.Location, null),
            Builders<User>.Filter.Near(x => x.Location, point, maxDistance: 100, minDistance: 0));

        var list = await _users.Find(filter).Limit(50).ToListAsync(ct);

        // Load profiles for status messages
        var ids      = list.Select(u => u.Id!).ToList();
        var profiles = await _profiles.Find(p => ids.Contains(p.UserId)).ToListAsync(ct);
        var profMap  = profiles.ToDictionary(p => p.UserId, p => p.MapStatusMessage);

        var dto = list.Select(u => new NearbyUserDto(
            u.Id!,
            u.DisplayName,
            u.WantsToChat,
            profMap.GetValueOrDefault(u.Id!) ?? null
        )).ToList();

        return Ok(dto);
    }

    // ── Push nearby friends ──────────────────────────────────────────────────
    private async Task NotifyNearbyFriendsAsync(string userId, GeoJsonPoint<GeoJson2DGeographicCoordinates> point, CancellationToken ct)
    {
        try
        {
            var me = await _users.Find(u => u.Id == userId).FirstOrDefaultAsync(ct);
            if (me is null) return;

            // Find active users within 100m who have push tokens
            var filter = Builders<User>.Filter.And(
                Builders<User>.Filter.Ne(x => x.Id, userId),
                Builders<User>.Filter.Eq(x => x.WantsToChat, true),
                Builders<User>.Filter.Gt(x => x.WantsToChatExpiresUtc, DateTime.UtcNow),
                Builders<User>.Filter.Ne(x => x.Location, null),
                Builders<User>.Filter.Ne(x => x.ExpoPushToken, null),
                Builders<User>.Filter.Near(x => x.Location, point, maxDistance: 100));

            var nearby = await _users.Find(filter).Limit(30).ToListAsync(ct);
            if (nearby.Count == 0) return;

            var tokens = nearby.Select(u => u.ExpoPushToken!).Where(t => !string.IsNullOrEmpty(t)).ToList();
            await _push.SendBatchAsync(tokens,
                "Кто-то рядом! 📍",
                $"{me.DisplayName} сейчас рядом с вами и хочет пообщаться",
                new { type = "nearby", userId },
                ct);
        }
        catch { /* Non-critical */ }
    }
}

public sealed record NearbyUserDto(string Id, string DisplayName, bool WantsToChat, string? MapStatusMessage = null);
