using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace Toki.Api.Hubs;

public sealed class UserIdClaimProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection) =>
        connection.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? connection.User?.FindFirst("sub")?.Value;
}
