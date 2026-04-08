using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Toki.Api.Models;

public sealed class ProfileField
{
    public string Key { get; set; } = "";
    public string Label { get; set; } = "";
    public string Value { get; set; } = "";
    public bool Visible { get; set; } = true;
}

public sealed class UserProfile
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    public string UserId { get; set; } = "";
    public string Bio { get; set; } = "";
    public List<string> Hobbies { get; set; } = new();
    public List<ProfileField> Fields { get; set; } = new();
    public bool ShowGifts { get; set; } = true;
    public bool ShowFavoriteCount { get; set; } = true;
    public bool HideOnlineStatus { get; set; }

    /// <summary>Short message visible to others on the map ("I'm nearby, say hi!").</summary>
    public string? MapStatusMessage { get; set; }
    public DateTime? MapStatusMessageUpdatedAt { get; set; }

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
