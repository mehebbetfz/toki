using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Toki.Api.Hubs;

[Authorize]
public sealed class CallHub : Hub
{
    public async Task SendOffer(string targetUserId, string sdp)
    {
        var from = RequireUserId();
        await Clients.User(targetUserId).SendAsync("Offer", new { fromUserId = from, sdp });
    }

    public async Task SendAnswer(string targetUserId, string sdp)
    {
        var from = RequireUserId();
        await Clients.User(targetUserId).SendAsync("Answer", new { fromUserId = from, sdp });
    }

    public async Task SendIceCandidate(string targetUserId, string candidateJson)
    {
        var from = RequireUserId();
        await Clients.User(targetUserId).SendAsync("IceCandidate", new { fromUserId = from, candidateJson });
    }

    public async Task NotifyCallEnded(string targetUserId)
    {
        var from = RequireUserId();
        await Clients.User(targetUserId).SendAsync("CallEnded", new { fromUserId = from });
    }

    private string RequireUserId()
    {
        var id = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                 ?? Context.User?.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(id))
            throw new HubException("Unauthorized");
        return id;
    }
}
