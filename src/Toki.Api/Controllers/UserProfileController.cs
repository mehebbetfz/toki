using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using Toki.Api.Models;

namespace Toki.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class UserProfileController : ControllerBase
{
    private readonly IMongoCollection<UserProfile> _profiles;

    public UserProfileController(IMongoDatabase db)
    {
        _profiles = db.GetCollection<UserProfile>("user_profiles");
    }

    [HttpGet("{userId}")]
    public async Task<ActionResult<UserProfileDto>> Get(string userId, CancellationToken ct)
    {
        var profile = await _profiles.Find(x => x.UserId == userId).FirstOrDefaultAsync(ct);
        if (profile is null) return Ok(new UserProfileDto(userId, "", new List<string>(), new List<ProfileFieldDto>(), true));

        var myId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        bool isOwn = myId == userId;

        var fields = profile.Fields
            .Where(f => isOwn || f.Visible)
            .Select(f => new ProfileFieldDto(f.Key, f.Label, f.Value, f.Visible))
            .ToList();

        return Ok(new UserProfileDto(userId, profile.Bio, profile.Hobbies, fields, profile.ShowGifts));
    }

    public sealed record UpdateProfileRequest(
        string Bio,
        List<string> Hobbies,
        List<ProfileFieldDto> Fields,
        bool ShowGifts);

    [HttpPut("me")]
    public async Task<IActionResult> Update([FromBody] UpdateProfileRequest body, CancellationToken ct)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var fields = body.Fields.Select(f => new ProfileField
        {
            Key = f.Key,
            Label = f.Label,
            Value = f.Value,
            Visible = f.Visible
        }).ToList();

        var update = Builders<UserProfile>.Update
            .Set(x => x.Bio, body.Bio)
            .Set(x => x.Hobbies, body.Hobbies)
            .Set(x => x.Fields, fields)
            .Set(x => x.ShowGifts, body.ShowGifts)
            .Set(x => x.UpdatedAtUtc, DateTime.UtcNow);

        await _profiles.UpdateOneAsync(
            x => x.UserId == userId,
            update,
            new UpdateOptions { IsUpsert = true },
            ct);

        return NoContent();
    }
}

public sealed record ProfileFieldDto(string Key, string Label, string Value, bool Visible);
public sealed record UserProfileDto(
    string UserId,
    string Bio,
    List<string> Hobbies,
    List<ProfileFieldDto> Fields,
    bool ShowGifts);
