namespace Toki.Api.Services;

public static class ConversationId
{
    public static string ForUsers(string userIdA, string userIdB)
    {
        return string.CompareOrdinal(userIdA, userIdB) <= 0
            ? $"{userIdA}:{userIdB}"
            : $"{userIdB}:{userIdA}";
    }
}
