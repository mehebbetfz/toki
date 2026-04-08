using System.Net.Http.Json;
using System.Text.Json;

namespace Toki.Api.Services;

public interface IPushNotificationService
{
    Task SendAsync(string expoPushToken, string title, string body, object? data = null, CancellationToken ct = default);
    Task SendBatchAsync(IEnumerable<string> tokens, string title, string body, object? data = null, CancellationToken ct = default);
}

public sealed class PushNotificationService : IPushNotificationService
{
    private readonly HttpClient _http;
    private readonly ILogger<PushNotificationService> _logger;
    private static readonly Uri PushEndpoint = new("https://exp.host/--/exponent-push-notification-tool/api/v2/push/send");

    public PushNotificationService(IHttpClientFactory factory, ILogger<PushNotificationService> logger)
    {
        _http   = factory.CreateClient("expo-push");
        _logger = logger;
    }

    public Task SendAsync(string expoPushToken, string title, string body, object? data = null, CancellationToken ct = default)
        => SendBatchAsync([expoPushToken], title, body, data, ct);

    public async Task SendBatchAsync(IEnumerable<string> tokens, string title, string body, object? data = null, CancellationToken ct = default)
    {
        var validTokens = tokens.Where(t => !string.IsNullOrWhiteSpace(t)).ToList();
        if (validTokens.Count == 0) return;

        var messages = validTokens.Select(t => new
        {
            to            = t,
            title,
            body,
            data          = data ?? new { },
            sound         = "default",
            channelId     = "default",
            priority      = "high",
        }).ToList();

        try
        {
            var response = await _http.PostAsJsonAsync(PushEndpoint, messages, ct);
            if (!response.IsSuccessStatusCode)
                _logger.LogWarning("Expo push returned {Status}", response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send Expo push notifications");
        }
    }
}
