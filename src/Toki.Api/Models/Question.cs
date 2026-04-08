using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Toki.Api.Models;

public sealed class Question
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    public string Text { get; set; } = "";
    public string Category { get; set; } = "";
    public List<string> Options { get; set; } = new();
}

public sealed class UserAnswer
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    public string UserId { get; set; } = "";
    public string QuestionId { get; set; } = "";
    public int AnswerIndex { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
