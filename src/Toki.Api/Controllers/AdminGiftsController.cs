using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using Toki.Api.Models;
using Toki.Api.Options;

namespace Toki.Api.Controllers;

[ApiController]
[Route("api/admin/[controller]")]
public sealed class AdminGiftsController : ControllerBase
{
    private readonly IMongoCollection<Gift> _gifts;
    private readonly AdminOptions _admin;

    public AdminGiftsController(IMongoDatabase db, IOptions<AdminOptions> admin)
    {
        _gifts = db.GetCollection<Gift>("gifts");
        _admin = admin.Value;
    }

    private bool IsAdmin()
    {
        if (string.IsNullOrEmpty(_admin.ApiKey))
            return false;
        if (!Request.Headers.TryGetValue("X-Admin-Key", out var key))
            return false;
        return key.ToString() == _admin.ApiKey;
    }

    public sealed record CreateGiftRequest(string Name, string Description, decimal PriceUsd, string SvgIconMarkup, bool IsActive);

    [HttpPost]
    public async Task<ActionResult<Gift>> Create([FromBody] CreateGiftRequest body, CancellationToken ct)
    {
        if (!IsAdmin())
            return Unauthorized();

        var g = new Gift
        {
            Name = body.Name,
            Description = body.Description,
            PriceUsd = body.PriceUsd,
            SvgIconMarkup = body.SvgIconMarkup,
            IsActive = body.IsActive
        };
        await _gifts.InsertOneAsync(g, cancellationToken: ct);
        return Ok(g);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] CreateGiftRequest body, CancellationToken ct)
    {
        if (!IsAdmin())
            return Unauthorized();

        var update = Builders<Gift>.Update
            .Set(x => x.Name, body.Name)
            .Set(x => x.Description, body.Description)
            .Set(x => x.PriceUsd, body.PriceUsd)
            .Set(x => x.SvgIconMarkup, body.SvgIconMarkup)
            .Set(x => x.IsActive, body.IsActive);

        var res = await _gifts.UpdateOneAsync(x => x.Id == id, update, cancellationToken: ct);
        if (res.MatchedCount == 0)
            return NotFound();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        if (!IsAdmin())
            return Unauthorized();

        var res = await _gifts.DeleteOneAsync(x => x.Id == id, ct);
        if (res.DeletedCount == 0)
            return NotFound();
        return NoContent();
    }
}
