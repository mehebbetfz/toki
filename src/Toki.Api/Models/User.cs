using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Toki.Api.Models;

public sealed class User
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    public string Email { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string AuthProvider { get; set; } = "";
    public string ExternalId { get; set; } = "";

    /// <summary>ASP.NET Identity PBKDF2 hash; только для <see cref="AuthProvider"/> == password.</summary>
    public string? PasswordHash { get; set; }

    /// <summary>GeoJSON Point, coordinates [lon, lat]. Indexed 2dsphere.</summary>
    public GeoJsonPoint<GeoJson2DGeographicCoordinates>? Location { get; set; }

    public bool WantsToChat { get; set; }
    public DateTime? WantsToChatExpiresUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? LastSeenUtc { get; set; }

    /// <summary>Expo push token — registered by the mobile app on login.</summary>
    public string? ExpoPushToken { get; set; }

    /// <summary>Spam block expiry; null or past = not blocked.</summary>
    public DateTime? SpamBlockedUntilUtc { get; set; }

    /// <summary>
    /// Escalating spam offense counter.
    /// 1 → 3 days | 2 → 7 days | 3 → 30 days | 4+ → manual admin unlock required.
    /// </summary>
    public int SpamOffenseCount { get; set; }

    /// <summary>When true the account requires admin approval to send messages again.</summary>
    public bool SpamRequiresAdminUnlock { get; set; }
}
