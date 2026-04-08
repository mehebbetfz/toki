using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using Toki.Api.Models;

namespace Toki.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class GiftsController : ControllerBase
{
    private readonly IMongoCollection<Gift> _gifts;
    private readonly IMongoCollection<GiftPurchase> _purchases;

    public GiftsController(IMongoDatabase db)
    {
        _gifts = db.GetCollection<Gift>("gifts");
        _purchases = db.GetCollection<GiftPurchase>("gift_purchases");
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<GiftDto>>> List(CancellationToken ct)
    {
        var list = await _gifts.Find(x => x.IsActive).ToListAsync(ct);
        return Ok(list.Select(g => new GiftDto(g.Id!, g.Name, g.Description, g.PriceUsd, g.SvgIconMarkup)).ToList());
    }

    public sealed record OrderGiftRequest(string RecipientUserId);

    /// <summary>Создаёт заказ; интеграцию Stripe / IAP подключите здесь (сейчас заглушка).</summary>
    [HttpPost("{giftId}/order")]
    public async Task<ActionResult<OrderGiftResponse>> Order(string giftId, [FromBody] OrderGiftRequest body, CancellationToken ct)
    {
        var buyerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(buyerId))
            return Unauthorized();

        var gift = await _gifts.Find(x => x.Id == giftId && x.IsActive).FirstOrDefaultAsync(ct);
        if (gift is null)
            return NotFound();

        var purchase = new GiftPurchase
        {
            BuyerUserId = buyerId,
            RecipientUserId = body.RecipientUserId,
            GiftId = giftId,
            AmountUsd = gift.PriceUsd,
            Status = "pending"
        };
        await _purchases.InsertOneAsync(purchase, cancellationToken: ct);

        return Ok(new OrderGiftResponse(
            purchase.Id!,
            "pending",
            "Replace with Stripe Checkout Session URL or mobile IAP receipt validation."));
    }
}

public sealed record GiftDto(string Id, string Name, string Description, decimal PriceUsd, string SvgIconMarkup);

public sealed record OrderGiftResponse(string PurchaseId, string Status, string NextStepHint);
