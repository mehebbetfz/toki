using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Toki.Api.Models;

public sealed class Follow
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }
    public string FollowerUserId { get; set; } = "";
    public string FolloweeUserId { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class Favorite
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }
    public string UserId { get; set; } = "";
    public string TargetUserId { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
