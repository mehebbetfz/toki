using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using Toki.Api.Models;

namespace Toki.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class PostsController : ControllerBase
{
    private readonly IMongoCollection<Post> _posts;

    public PostsController(IMongoDatabase db)
    {
        _posts = db.GetCollection<Post>("posts");
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IReadOnlyList<PostDto>>> GetByUser(string userId, CancellationToken ct)
    {
        var list = await _posts.Find(x => x.AuthorUserId == userId)
            .SortByDescending(x => x.CreatedAtUtc)
            .ToListAsync(ct);

        return Ok(list.Select(p => new PostDto(p.Id!, p.AuthorUserId, p.MediaUrl, p.MediaType, p.Caption, p.LikesCount, p.CreatedAtUtc)).ToList());
    }

    public sealed record CreatePostRequest(string MediaUrl, string MediaType, string Caption);

    [HttpPost]
    public async Task<ActionResult<PostDto>> Create([FromBody] CreatePostRequest body, CancellationToken ct)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var post = new Post
        {
            AuthorUserId = userId,
            MediaUrl = body.MediaUrl,
            MediaType = body.MediaType,
            Caption = body.Caption
        };
        await _posts.InsertOneAsync(post, cancellationToken: ct);
        return Ok(new PostDto(post.Id!, post.AuthorUserId, post.MediaUrl, post.MediaType, post.Caption, 0, post.CreatedAtUtc));
    }

    [HttpDelete("{postId}")]
    public async Task<IActionResult> Delete(string postId, CancellationToken ct)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        var res = await _posts.DeleteOneAsync(x => x.Id == postId && x.AuthorUserId == userId, ct);
        if (res.DeletedCount == 0) return NotFound();
        return NoContent();
    }
}

public sealed record PostDto(string Id, string AuthorUserId, string MediaUrl, string MediaType, string Caption, int LikesCount, DateTime CreatedAtUtc);
