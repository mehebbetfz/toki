using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Toki.Api.Models;

public sealed class Gift
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public decimal PriceUsd { get; set; }
    public string SvgIconMarkup { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
