using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MongoDB.Driver.GeoJsonObjectModel;
using Toki.Api.Models;
using Toki.Api.Options;

namespace Toki.Api.Infrastructure;

/// <summary>
/// В Development при DevSeed:Enabled создаёт двух пользователей с email+паролем (для входа и proximity).
/// Учётные данные см. константы ниже (только для локальной разработки).
/// </summary>
public sealed class DevUserSeedHostedService : IHostedService
{
    public const string SeedAliceEmail = "dev-alice@toki.local";
    public const string SeedAlicePassword = "DevAlice123!";

    public const string SeedBobEmail = "dev-bob@toki.local";
    public const string SeedBobPassword = "DevBob123!";

    private const string Provider = "password";

    private readonly IMongoCollection<User> _users;
    private readonly IHostEnvironment _env;
    private readonly DevSeedOptions _options;
    private readonly IPasswordHasher<object> _passwordHasher;
    private readonly ILogger<DevUserSeedHostedService> _logger;

    public DevUserSeedHostedService(
        IMongoDatabase db,
        IHostEnvironment env,
        IOptions<DevSeedOptions> options,
        IPasswordHasher<object> passwordHasher,
        ILogger<DevUserSeedHostedService> logger)
    {
        _users = db.GetCollection<User>("users");
        _env = env;
        _options = options.Value;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_env.IsDevelopment() || !_options.Enabled)
            return;

        var expires = DateTime.UtcNow.AddDays(1);

        var seeds = new[]
        {
            new
            {
                Email = SeedAliceEmail,
                Password = SeedAlicePassword,
                DisplayName = "Alice (dev)",
                Point = GeoJson.Point(GeoJson.Geographic(49.8671, 40.40926))
            },
            new
            {
                Email = SeedBobEmail,
                Password = SeedBobPassword,
                DisplayName = "Bob (dev)",
                Point = GeoJson.Point(GeoJson.Geographic(49.86715, 40.40931))
            }
        };

        foreach (var s in seeds)
        {
            var email = NormalizeEmail(s.Email);
            var hash = _passwordHasher.HashPassword(SeedUserMarker.Instance, s.Password);
            var filter = Builders<User>.Filter.And(
                Builders<User>.Filter.Eq(x => x.AuthProvider, Provider),
                Builders<User>.Filter.Eq(x => x.ExternalId, email));

            var now = DateTime.UtcNow;
            var update = Builders<User>.Update
                .Set(x => x.Email, email)
                .Set(x => x.DisplayName, s.DisplayName)
                .Set(x => x.AuthProvider, Provider)
                .Set(x => x.ExternalId, email)
                .Set(x => x.PasswordHash, hash)
                .Set(x => x.Location, s.Point)
                .Set(x => x.WantsToChat, true)
                .Set(x => x.WantsToChatExpiresUtc, expires)
                .Set(x => x.LastSeenUtc, now)
                .SetOnInsert(x => x.CreatedAtUtc, now);

            await _users.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true }, cancellationToken);
        }

        _logger.LogInformation(
            "DevSeed: two password users upserted ({AliceEmail}, {BobEmail}). Passwords: see {Type}.Seed*Password constants.",
            SeedAliceEmail,
            SeedBobEmail,
            nameof(DevUserSeedHostedService));
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static class SeedUserMarker
    {
        public static readonly object Instance = new();
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
