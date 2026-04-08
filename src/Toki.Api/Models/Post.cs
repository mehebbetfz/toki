using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Toki.Api.Models;

public sealed class Post
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    public string AuthorUserId { get; set; } = "";
    public string MediaUrl { get; set; } = "";
    public string MediaType { get; set; } = "image"; // image | video
    public string Caption { get; set; } = "";
    public int LikesCount { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
