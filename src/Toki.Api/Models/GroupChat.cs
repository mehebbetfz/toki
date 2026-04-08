using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Toki.Api.Models;

public sealed class GroupChat
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    public string Name { get; set; } = "";
    public string CreatedByUserId { get; set; } = "";
    public List<string> MemberUserIds { get; set; } = new();
    public string InviteToken { get; set; } = Guid.NewGuid().ToString("N");
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
