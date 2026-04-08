using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Toki.Api.Models;

public sealed class GiftPurchase
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    public string BuyerUserId { get; set; } = "";
    public string RecipientUserId { get; set; } = "";
    public string GiftId { get; set; } = "";
    public decimal AmountUsd { get; set; }
    public string Status { get; set; } = "pending";
    public string? ExternalPaymentId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
