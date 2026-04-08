using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Toki.Api.Models;

/// <summary>Хранится шифротекст с клиента (E2E): сервер не расшифровывает.</summary>
public sealed class ChatMessage
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    public string ConversationId { get; set; } = "";
    public string SenderUserId { get; set; } = "";
    public string CiphertextBase64 { get; set; } = "";
    public string? NonceBase64 { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
