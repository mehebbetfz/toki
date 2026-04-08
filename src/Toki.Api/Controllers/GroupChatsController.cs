using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using Toki.Api.Models;

namespace Toki.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class GroupChatsController : ControllerBase
{
    private readonly IMongoCollection<GroupChat> _groups;

    public GroupChatsController(IMongoDatabase db)
    {
        _groups = db.GetCollection<GroupChat>("group_chats");
    }

    public sealed record CreateGroupRequest(string Name, List<string> InitialMemberIds);

    [HttpPost]
    public async Task<ActionResult<GroupChatDto>> Create([FromBody] CreateGroupRequest body, CancellationToken ct)
    {
        var userId = RequireUserId();
        var members = body.InitialMemberIds.Contains(userId)
            ? body.InitialMemberIds
            : body.InitialMemberIds.Prepend(userId).ToList();

        var group = new GroupChat
        {
            Name = body.Name,
            CreatedByUserId = userId,
            MemberUserIds = members
        };
        await _groups.InsertOneAsync(group, cancellationToken: ct);
        return Ok(ToDto(group));
    }

    [HttpGet("mine")]
    public async Task<ActionResult<IReadOnlyList<GroupChatDto>>> Mine(CancellationToken ct)
    {
        var userId = RequireUserId();
        var list = await _groups.Find(x => x.MemberUserIds.Contains(userId)).ToListAsync(ct);
        return Ok(list.Select(ToDto).ToList());
    }

    [HttpGet("join/{token}")]
    public async Task<ActionResult<GroupChatDto>> JoinByToken(string token, CancellationToken ct)
    {
        var userId = RequireUserId();
        var group = await _groups.Find(x => x.InviteToken == token).FirstOrDefaultAsync(ct);
        if (group is null) return NotFound();

        if (!group.MemberUserIds.Contains(userId))
        {
            var upd = Builders<GroupChat>.Update.AddToSet(x => x.MemberUserIds, userId);
            await _groups.UpdateOneAsync(x => x.Id == group.Id, upd, cancellationToken: ct);
            group.MemberUserIds.Add(userId);
        }
        return Ok(ToDto(group));
    }

    private static GroupChatDto ToDto(GroupChat g) =>
        new(g.Id!, g.Name, g.CreatedByUserId, g.MemberUserIds, g.InviteToken, g.CreatedAtUtc);

    private string RequireUserId()
    {
        var id = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(id)) throw new UnauthorizedAccessException();
        return id;
    }
}

public sealed record GroupChatDto(string Id, string Name, string CreatedByUserId, List<string> MemberUserIds, string InviteToken, DateTime CreatedAtUtc);
