using MongoDB.Driver;
using Toki.Api.Models;

namespace Toki.Api.Infrastructure;

public sealed class GiftSeedHostedService : IHostedService
{
    private readonly IMongoDatabase _db;

    public GiftSeedHostedService(IMongoDatabase db) => _db = db;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var col = _db.GetCollection<Gift>("gifts");
        var count = await col.CountDocumentsAsync(FilterDefinition<Gift>.Empty, cancellationToken: cancellationToken);
        if (count >= 20) return;

        await col.DeleteManyAsync(FilterDefinition<Gift>.Empty, cancellationToken);

        var gifts = new[]
        {
            new Gift { Name = "Роза", Description = "Классическая красная роза — символ любви", PriceUsd = 0.99m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M32 56s-18-14-18-28a18 18 0 0136 0c0 14-18 28-18 28z' fill='#F05A7E'/><path d='M32 8c-6 0-10 4-10 10' stroke='#c03060' strokeWidth='2' strokeLinecap='round'/><rect x='30' y='40' width='4' height='16' rx='2' fill='#34C97A'/></svg>" },
            new Gift { Name = "Сердце", Description = "Хрустальное сердце — я ценю тебя", PriceUsd = 1.99m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M32 52L8 30c-5-5-5-13 0-18s13-5 18 0l6 6 6-6c5-5 13-5 18 0s5 13 0 18L32 52z' fill='#5B6EF5'/></svg>" },
            new Gift { Name = "Огонь", Description = "Ты — огонь! 🔥", PriceUsd = 0.49m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M32 8c0 10-16 18-16 30a16 16 0 0032 0c0-8-6-14-6-20-4 4-6 8-6 12-4-6-4-16-4-22z' fill='#F5A623'/><path d='M32 40c0 4-4 8-4 12a4 4 0 008 0c0-4-4-8-4-12z' fill='#F05A7E'/></svg>" },
            new Gift { Name = "Звезда", Description = "Ты звезда! ⭐", PriceUsd = 0.99m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M32 6l6 18h20l-16 12 6 18-16-12-16 12 6-18L6 24h20z' fill='#F5A623'/></svg>" },
            new Gift { Name = "Корона", Description = "Корона для королевы/короля", PriceUsd = 4.99m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M8 48h48l-8-28-12 16-4-20-4 20-12-16z' fill='#F5A623' stroke='#c08000' strokeWidth='2'/><circle cx='16' cy='20' r='4' fill='#F05A7E'/><circle cx='32' cy='14' r='4' fill='#5B6EF5'/><circle cx='48' cy='20' r='4' fill='#34C97A'/></svg>" },
            new Gift { Name = "Алмаз", Description = "Дорогой подарок — алмаз", PriceUsd = 9.99m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M32 8l24 20-24 28L8 28z' fill='#5B6EF5' opacity='.8'/><path d='M8 28l24-20 24 20' stroke='#3040c0' strokeWidth='2'/><path d='M32 8l-8 20h16z' fill='#a0b0ff'/></svg>" },
            new Gift { Name = "Торт", Description = "День рождения или просто праздник!", PriceUsd = 1.49m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><rect x='10' y='32' width='44' height='22' rx='4' fill='#F5A623'/><rect x='10' y='24' width='44' height='10' rx='2' fill='#F05A7E'/><rect x='22' y='12' width='6' height='14' rx='3' fill='#c0c0c0'/><rect x='36' y='12' width='6' height='14' rx='3' fill='#c0c0c0'/><circle cx='25' cy='12' r='3' fill='#F5A623'/><circle cx='39' cy='12' r='3' fill='#F05A7E'/></svg>" },
            new Gift { Name = "Цветы", Description = "Букет полевых цветов", PriceUsd = 2.99m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><circle cx='20' cy='24' r='8' fill='#F05A7E'/><circle cx='32' cy='18' r='8' fill='#F5A623'/><circle cx='44' cy='24' r='8' fill='#5B6EF5'/><rect x='28' y='30' width='8' height='22' rx='4' fill='#34C97A'/></svg>" },
            new Gift { Name = "Шоколад", Description = "Плитка шоколада — сладкий подарок", PriceUsd = 0.99m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><rect x='8' y='16' width='48' height='32' rx='6' fill='#8B4513'/><line x1='24' y1='16' x2='24' y2='48' stroke='#6b3000' strokeWidth='2'/><line x1='40' y1='16' x2='40' y2='48' stroke='#6b3000' strokeWidth='2'/><line x1='8' y1='32' x2='56' y2='32' stroke='#6b3000' strokeWidth='2'/></svg>" },
            new Gift { Name = "Луна", Description = "Луна и звёзды для тебя", PriceUsd = 3.99m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M44 32a20 20 0 11-28-18 14 14 0 1020 18z' fill='#F5A623'/><circle cx='48' cy='16' r='3' fill='#F5A623'/><circle cx='54' cy='24' r='2' fill='#F5A623'/><circle cx='44' cy='10' r='2' fill='#F5A623'/></svg>" },
            new Gift { Name = "Самолёт", Description = "Отправляю тебя в путешествие!", PriceUsd = 2.49m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M8 36l10-4 6 10 6-4-6-10 16-6 8 4-2 6-8-2-4 8 10-2 2 6-28 8z' fill='#5B6EF5'/></svg>" },
            new Gift { Name = "Музыка", Description = "Нота для любителей музыки", PriceUsd = 0.79m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M24 48V20l24-8v28' stroke='#5B6EF5' strokeWidth='3' strokeLinecap='round'/><circle cx='20' cy='48' r='6' fill='#5B6EF5'/><circle cx='44' cy='40' r='6' fill='#5B6EF5'/></svg>" },
            new Gift { Name = "Котик", Description = "Котик — самый милый подарок!", PriceUsd = 1.99m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><ellipse cx='32' cy='38' rx='18' ry='16' fill='#F5A623'/><circle cx='24' cy='34' r='3' fill='#fff'/><circle cx='40' cy='34' r='3' fill='#fff'/><circle cx='24' cy='34' r='1.5' fill='#333'/><circle cx='40' cy='34' r='1.5' fill='#333'/><path d='M28 42c2 2 6 2 8 0' stroke='#c06000' strokeWidth='1.5' strokeLinecap='round'/><path d='M14 22l10 12M50 22l-10 12' stroke='#F5A623' strokeWidth='3' strokeLinecap='round'/></svg>" },
            new Gift { Name = "Ракета", Description = "До луны и обратно!", PriceUsd = 5.99m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M32 6c0 0-16 16-16 30h32C48 22 32 6 32 6z' fill='#5B6EF5'/><rect x='24' y='36' width='16' height='12' rx='2' fill='#A78BFA'/><path d='M20 48l-8 10h40l-8-10' fill='#F5A623'/><circle cx='32' cy='26' r='5' fill='#fff'/></svg>" },
            new Gift { Name = "Радуга", Description = "Яркая радуга настроения", PriceUsd = 1.29m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M8 44a24 24 0 0148 0' stroke='#F05A7E' strokeWidth='4' fill='none'/><path d='M12 44a20 20 0 0140 0' stroke='#F5A623' strokeWidth='4' fill='none'/><path d='M16 44a16 16 0 0132 0' stroke='#34C97A' strokeWidth='4' fill='none'/><path d='M20 44a12 12 0 0124 0' stroke='#5B6EF5' strokeWidth='4' fill='none'/></svg>" },
            new Gift { Name = "Кофе", Description = "Чашка ароматного кофе", PriceUsd = 0.59m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M12 24h32l-4 22H16z' fill='#8B4513'/><path d='M44 30h8a6 6 0 010 12h-8' stroke='#8B4513' strokeWidth='3'/><path d='M20 16c0-4 4-6 4-10M28 16c0-4 4-6 4-10M36 16c0-4 4-6 4-10' stroke='#888' strokeWidth='2' strokeLinecap='round'/></svg>" },
            new Gift { Name = "Книга", Description = "Для любителей чтения", PriceUsd = 1.99m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><rect x='10' y='10' width='36' height='44' rx='3' fill='#5B6EF5'/><rect x='12' y='10' width='6' height='44' rx='2' fill='#3040c0'/><path d='M22 22h18M22 30h18M22 38h12' stroke='#fff' strokeWidth='2' strokeLinecap='round'/></svg>" },
            new Gift { Name = "Магия", Description = "Волшебная пыль удачи ✨", PriceUsd = 3.49m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M32 8l4 12 12 4-12 4-4 12-4-12-12-4 12-4z' fill='#F5A623'/><circle cx='16' cy='48' r='3' fill='#5B6EF5'/><circle cx='48' cy='44' r='4' fill='#F05A7E'/><circle cx='44' cy='16' r='2' fill='#34C97A'/></svg>" },
            new Gift { Name = "Дельфин", Description = "Веселье и свобода!", PriceUsd = 2.99m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M8 36c4-8 12-14 24-12 8 1 16 8 20 4l-4 8c-4 2-8 0-12-2-6-3-12-2-16 4z' fill='#1DC8A8'/><path d='M44 16c2 4 4 10 4 16' stroke='#1DC8A8' strokeWidth='3' strokeLinecap='round'/><circle cx='18' cy='34' r='2' fill='#fff'/></svg>" },
            new Gift { Name = "Вселенная", Description = "Весь мир для тебя 🌍", PriceUsd = 14.99m, SvgIconMarkup = "<svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><circle cx='32' cy='32' r='22' fill='#0B0F14'/><ellipse cx='32' cy='32' rx='22' ry='10' stroke='#5B6EF5' strokeWidth='2' fill='none'/><ellipse cx='32' cy='32' rx='10' ry='22' stroke='#1DC8A8' strokeWidth='2' fill='none'/><circle cx='32' cy='32' r='6' fill='#F5A623'/><circle cx='18' cy='20' r='2' fill='#fff'/><circle cx='46' cy='44' r='1.5' fill='#fff'/><circle cx='48' cy='22' r='1' fill='#fff'/></svg>" },
        };

        foreach (var g in gifts) g.IsActive = true;
        await col.InsertManyAsync(gifts, cancellationToken: cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
