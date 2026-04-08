using MongoDB.Driver;
using Toki.Api.Models;

namespace Toki.Api.Infrastructure;

public sealed class MongoIndexesHostedService : IHostedService
{
    private readonly IMongoDatabase _db;

    public MongoIndexesHostedService(IMongoDatabase db) => _db = db;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var users = _db.GetCollection<User>("users");
        await users.Indexes.CreateOneAsync(
            new CreateIndexModel<User>(
                Builders<User>.IndexKeys.Geo2DSphere(x => x.Location!),
                new CreateIndexOptions { Name = "idx_users_location_2dsphere", Sparse = true }),
            cancellationToken: cancellationToken);

        var messages = _db.GetCollection<ChatMessage>("chat_messages");
        await messages.Indexes.CreateOneAsync(
            new CreateIndexModel<ChatMessage>(
                Builders<ChatMessage>.IndexKeys.Ascending(x => x.ConversationId).Descending(x => x.CreatedAtUtc),
                new CreateIndexOptions { Name = "idx_chat_conversation_time" }),
            cancellationToken: cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
