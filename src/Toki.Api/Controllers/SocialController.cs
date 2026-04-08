using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using Toki.Api.Models;

namespace Toki.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class SocialController : ControllerBase
{
    private readonly IMongoCollection<Follow> _follows;
    private readonly IMongoCollection<Favorite> _favorites;
    private readonly IMongoCollection<UserProfile> _profiles;

    public SocialController(IMongoDatabase db)
    {
        _follows = db.GetCollection<Follow>("follows");
        _favorites = db.GetCollection<Favorite>("favorites");
        _profiles = db.GetCollection<UserProfile>("user_profiles");
    }

    // ─── Follow ──────────────────────────────────────────────────────────────

    [HttpPost("follow/{targetUserId}")]
    public async Task<IActionResult> Follow(string targetUserId, CancellationToken ct)
    {
        var me = RequireUserId();
        var exists = await _follows.Find(x => x.FollowerUserId == me && x.FolloweeUserId == targetUserId).AnyAsync(ct);
        if (!exists)
            await _follows.InsertOneAsync(new Follow { FollowerUserId = me, FolloweeUserId = targetUserId }, cancellationToken: ct);
        return NoContent();
    }

    [HttpDelete("follow/{targetUserId}")]
    public async Task<IActionResult> Unfollow(string targetUserId, CancellationToken ct)
    {
        var me = RequireUserId();
        await _follows.DeleteOneAsync(x => x.FollowerUserId == me && x.FolloweeUserId == targetUserId, ct);
        return NoContent();
    }

    [HttpGet("following")]
    public async Task<ActionResult<IReadOnlyList<string>>> MyFollowing(CancellationToken ct)
    {
        var me = RequireUserId();
        var list = await _follows.Find(x => x.FollowerUserId == me).ToListAsync(ct);
        return Ok(list.Select(f => f.FolloweeUserId).ToList());
    }

    [HttpGet("followers/{userId}")]
    public async Task<ActionResult<int>> FollowerCount(string userId, CancellationToken ct)
    {
        var count = await _follows.CountDocumentsAsync(x => x.FolloweeUserId == userId, cancellationToken: ct);
        return Ok(count);
    }

    // ─── Favorites ───────────────────────────────────────────────────────────

    [HttpPost("favorite/{targetUserId}")]
    public async Task<IActionResult> AddFavorite(string targetUserId, CancellationToken ct)
    {
        var me = RequireUserId();
        var exists = await _favorites.Find(x => x.UserId == me && x.TargetUserId == targetUserId).AnyAsync(ct);
        if (!exists)
            await _favorites.InsertOneAsync(new Favorite { UserId = me, TargetUserId = targetUserId }, cancellationToken: ct);
        return NoContent();
    }

    [HttpDelete("favorite/{targetUserId}")]
    public async Task<IActionResult> RemoveFavorite(string targetUserId, CancellationToken ct)
    {
        var me = RequireUserId();
        await _favorites.DeleteOneAsync(x => x.UserId == me && x.TargetUserId == targetUserId, ct);
        return NoContent();
    }

    [HttpGet("favorites")]
    public async Task<ActionResult<IReadOnlyList<string>>> MyFavorites(CancellationToken ct)
    {
        var me = RequireUserId();
        var list = await _favorites.Find(x => x.UserId == me).ToListAsync(ct);
        return Ok(list.Select(f => f.TargetUserId).ToList());
    }

    /// <summary>Количество людей, добавивших пользователя в фавориты (скрывается если ShowFavoriteCount=false).</summary>
    [HttpGet("favorite-count/{userId}")]
    public async Task<ActionResult<long>> FavoriteCount(string userId, CancellationToken ct)
    {
        var profile = await _profiles.Find(x => x.UserId == userId).FirstOrDefaultAsync(ct);
        if (profile?.ShowFavoriteCount == false)
            return Ok(-1L); // hidden
        var count = await _favorites.CountDocumentsAsync(x => x.TargetUserId == userId, cancellationToken: ct);
        return Ok(count);
    }

    private string RequireUserId()
    {
        var id = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(id)) throw new UnauthorizedAccessException();
        return id;
    }
}
