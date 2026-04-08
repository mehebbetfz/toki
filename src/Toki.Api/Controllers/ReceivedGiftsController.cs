using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using Toki.Api.Models;

namespace Toki.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class ReceivedGiftsController : ControllerBase
{
    private readonly IMongoCollection<ReceivedGift> _received;
    private readonly IMongoCollection<UserProfile> _profiles;

    public ReceivedGiftsController(IMongoDatabase db)
    {
        _received = db.GetCollection<ReceivedGift>("received_gifts");
        _profiles = db.GetCollection<UserProfile>("user_profiles");
    }

    /// <summary>Список полученных подарков текущего пользователя (без информации об отправителе).</summary>
    [HttpGet("mine")]
    public async Task<ActionResult<IReadOnlyList<ReceivedGiftDto>>> Mine(CancellationToken ct)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var list = await _received.Find(x => x.RecipientUserId == userId).ToListAsync(ct);

        // Group by giftId, count
        var grouped = list
            .GroupBy(g => g.GiftId)
            .Select(grp => new ReceivedGiftDto(
                grp.Key,
                grp.First().GiftName,
                grp.First().GiftEmoji,
                grp.Count()))
            .OrderByDescending(g => g.Count)
            .ToList();

        return Ok(grouped);
    }

    /// <summary>Список подарков пользователя (публичный, если ShowGifts = true).</summary>
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IReadOnlyList<ReceivedGiftDto>>> ByUser(string userId, CancellationToken ct)
    {
        var profile = await _profiles.Find(x => x.UserId == userId).FirstOrDefaultAsync(ct);
        if (profile is not null && !profile.ShowGifts)
            return Ok(Array.Empty<ReceivedGiftDto>());

        var list = await _received.Find(x => x.RecipientUserId == userId).ToListAsync(ct);
        var grouped = list
            .GroupBy(g => g.GiftId)
            .Select(grp => new ReceivedGiftDto(grp.Key, grp.First().GiftName, grp.First().GiftEmoji, grp.Count()))
            .ToList();

        return Ok(grouped);
    }
}

public sealed record ReceivedGiftDto(string GiftId, string Name, string Emoji, int Count);
