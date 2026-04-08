using Google.Apis.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using Toki.Api.Models;
using Toki.Api.Options;
using Toki.Api.Services;

namespace Toki.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly IMongoCollection<User> _users;
    private readonly IJwtTokenService _jwt;
    private readonly GoogleAuthOptions _google;
    private readonly IAppleIdTokenValidator _apple;
    private readonly AppleAuthOptions _appleOpt;

    public AuthController(
        IMongoDatabase db,
        IJwtTokenService jwt,
        IOptions<GoogleAuthOptions> google,
        IOptions<AppleAuthOptions> appleOpt,
        IAppleIdTokenValidator apple)
    {
        _users = db.GetCollection<User>("users");
        _jwt = jwt;
        _google = google.Value;
        _appleOpt = appleOpt.Value;
        _apple = apple;
    }

    /// <summary>Google / Gmail: передайте id_token с клиента (OAuth / expo-auth-session).</summary>
    [HttpPost("google")]
    public async Task<ActionResult<AuthResponse>> Google([FromBody] IdTokenRequest body, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.IdToken))
            return BadRequest();
        if (string.IsNullOrWhiteSpace(_google.ClientId))
            return BadRequest("Configure Google:ClientId in appsettings (OAuth client id).");

        var settings = new GoogleJsonWebSignature.ValidationSettings
        {
            Audience = new[] { _google.ClientId }
        };

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(body.IdToken, settings);
        }
        catch (InvalidJwtException)
        {
            return Unauthorized();
        }

        var externalId = payload.Subject;
        var email = payload.Email ?? "";
        var name = payload.Name ?? email;

        var user = await UpsertOAuthUserAsync("google", externalId, email, name, ct);
        var token = _jwt.CreateAccessToken(user.Id!, user.Email);
        return Ok(new AuthResponse(token, new UserDto(user.Id!, user.Email, user.DisplayName)));
    }

    [HttpPost("apple")]
    public async Task<ActionResult<AuthResponse>> Apple([FromBody] IdTokenRequest body, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.IdToken) || string.IsNullOrWhiteSpace(_appleOpt.ClientId))
            return BadRequest();

        var apple = await _apple.ValidateAsync(body.IdToken, _appleOpt.ClientId, ct);
        if (apple is null)
            return Unauthorized();

        var email = string.IsNullOrEmpty(apple.Email) ? $"{apple.Subject}@privaterelay.appleid.com" : apple.Email;
        var user = await UpsertOAuthUserAsync("apple", apple.Subject, email, email.Split('@')[0], ct);
        var token = _jwt.CreateAccessToken(user.Id!, user.Email);
        return Ok(new AuthResponse(token, new UserDto(user.Id!, user.Email, user.DisplayName)));
    }

    private async Task<User> UpsertOAuthUserAsync(
        string provider,
        string externalId,
        string email,
        string displayName,
        CancellationToken ct)
    {
        var filter = Builders<User>.Filter.And(
            Builders<User>.Filter.Eq(x => x.AuthProvider, provider),
            Builders<User>.Filter.Eq(x => x.ExternalId, externalId));

        var existing = await _users.Find(filter).FirstOrDefaultAsync(ct);
        if (existing is not null)
        {
            var touch = Builders<User>.Update.Set(x => x.LastSeenUtc, DateTime.UtcNow);
            await _users.UpdateOneAsync(filter, touch, cancellationToken: ct);
            return existing;
        }

        var user = new User
        {
            Email = email,
            DisplayName = displayName,
            AuthProvider = provider,
            ExternalId = externalId,
            LastSeenUtc = DateTime.UtcNow
        };
        await _users.InsertOneAsync(user, cancellationToken: ct);
        return user;
    }
}

public sealed record IdTokenRequest(string IdToken);

public sealed record AuthResponse(string AccessToken, UserDto User);

public sealed record UserDto(string Id, string Email, string DisplayName);
