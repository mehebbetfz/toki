using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using MongoDB.Driver.GeoJsonObjectModel;
using Toki.Api.Models;

namespace Toki.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class ProximityController : ControllerBase
{
    private readonly IMongoCollection<User> _users;

    public ProximityController(IMongoDatabase db)
    {
        _users = db.GetCollection<User>("users");
    }

    public sealed record ProximityStateRequest(double Latitude, double Longitude, bool WantsToChat);

    [HttpPost("state")]
    public async Task<IActionResult> SetState([FromBody] ProximityStateRequest body, CancellationToken ct)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var point = GeoJson.Point(GeoJson.Geographic(body.Longitude, body.Latitude));

        var update = Builders<User>.Update
            .Set(x => x.Location, point)
            .Set(x => x.WantsToChat, body.WantsToChat)
            .Set(x => x.WantsToChatExpiresUtc, body.WantsToChat ? DateTime.UtcNow.AddHours(4) : null)
            .Set(x => x.LastSeenUtc, DateTime.UtcNow);

        await _users.UpdateOneAsync(Builders<User>.Filter.Eq(x => x.Id, userId), update, cancellationToken: ct);
        return NoContent();
    }

    [HttpGet("nearby")]
    public async Task<ActionResult<IReadOnlyList<NearbyUserDto>>> Nearby(
        [FromQuery] double latitude,
        [FromQuery] double longitude,
        CancellationToken ct)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var point = GeoJson.Point(GeoJson.Geographic(longitude, latitude));

        var filter = Builders<User>.Filter.And(
            Builders<User>.Filter.Ne(x => x.Id, userId),
            Builders<User>.Filter.Eq(x => x.WantsToChat, true),
            Builders<User>.Filter.Gt(x => x.WantsToChatExpiresUtc, DateTime.UtcNow),
            Builders<User>.Filter.Ne(x => x.Location, null),
            Builders<User>.Filter.Near(x => x.Location, point, maxDistance: 100, minDistance: 0));

        var list = await _users.Find(filter).Limit(50).ToListAsync(ct);
        var dto = list.Select(u => new NearbyUserDto(u.Id!, u.DisplayName, u.WantsToChat)).ToList();
        return Ok(dto);
    }
}

public sealed record NearbyUserDto(string Id, string DisplayName, bool WantsToChat);
