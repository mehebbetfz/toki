using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Toki.Api.Models;

public sealed class ReceivedGift
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    public string RecipientUserId { get; set; } = "";
    public string GiftId { get; set; } = "";
    public string GiftName { get; set; } = "";
    public string GiftEmoji { get; set; } = "";
    /// <summary>Кто подарил — НЕ раскрывается клиенту.</summary>
    public string BuyerUserId { get; set; } = "";
    public DateTime ReceivedAtUtc { get; set; } = DateTime.UtcNow;
}
