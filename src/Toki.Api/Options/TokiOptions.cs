namespace Toki.Api.Options;

public sealed class MongoDbOptions
{
    public const string SectionName = "MongoDb";
    public string ConnectionString { get; init; } = "";
    public string DatabaseName { get; init; } = "toki";
}

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";
    public string Issuer { get; init; } = "Toki";
    public string Audience { get; init; } = "TokiApp";
    public string SigningKey { get; init; } = "";
    public int AccessTokenMinutes { get; init; } = 60 * 24 * 14;
}

public sealed class GoogleAuthOptions
{
    public const string SectionName = "Google";
    public string ClientId { get; init; } = "";
}

public sealed class AppleAuthOptions
{
    public const string SectionName = "Apple";
    public string ClientId { get; init; } = "";
}

public sealed class AdminOptions
{
    public const string SectionName = "Admin";
    public string ApiKey { get; init; } = "";
}

public sealed class DevSeedOptions
{
    public const string SectionName = "DevSeed";
    public bool Enabled { get; init; }
}
