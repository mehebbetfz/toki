using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;

namespace Toki.Api.Services;

public interface IAppleIdTokenValidator
{
    Task<AppleTokenResult?> ValidateAsync(string idToken, string clientId, CancellationToken ct);
}

public sealed record AppleTokenResult(string Subject, string Email);

public sealed class AppleIdTokenValidator : IAppleIdTokenValidator
{
    private static readonly JwtSecurityTokenHandler Handler = new();

    public async Task<AppleTokenResult?> ValidateAsync(string idToken, string clientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(idToken) || string.IsNullOrWhiteSpace(clientId))
            return null;

        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
        var keysJson = await http.GetStringAsync(new Uri("https://appleid.apple.com/auth/keys"), ct);
        var jwks = new JsonWebKeySet(keysJson);

        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = "https://appleid.apple.com",
            ValidateAudience = true,
            ValidAudience = clientId,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2),
            IssuerSigningKeys = jwks.GetSigningKeys(),
            ValidateIssuerSigningKey = true
        };

        var principal = Handler.ValidateToken(idToken, parameters, out _);
        var sub = principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (string.IsNullOrEmpty(sub))
            return null;

        var email = principal.FindFirst("email")?.Value ?? "";
        return new AppleTokenResult(sub, email);
    }
}
