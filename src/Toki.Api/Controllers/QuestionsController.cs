using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using Toki.Api.Models;

namespace Toki.Api.Controllers;

[ApiController]
[Route("api/questions")]
[Authorize]
public class QuestionsController : ControllerBase
{
    private readonly IMongoCollection<Question>   _questions;
    private readonly IMongoCollection<UserAnswer> _answers;
    private readonly IMongoCollection<UserProfile> _profiles;

    public QuestionsController(IMongoDatabase db)
    {
        _questions = db.GetCollection<Question>("questions");
        _answers   = db.GetCollection<UserAnswer>("user_answers");
        _profiles  = db.GetCollection<UserProfile>("profiles");
    }

    private string RequireUserId() =>
        User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new InvalidOperationException("No user id in token");

    // ── GET next unanswered question ─────────────────────────────────────────
    [HttpGet("next")]
    public async Task<ActionResult<QuestionDto>> GetNext(CancellationToken ct)
    {
        var userId = RequireUserId();

        // IDs already answered
        var answered = await _answers
            .Find(a => a.UserId == userId)
            .Project(a => a.QuestionId)
            .ToListAsync(ct);

        // Pick random unanswered
        var filter = answered.Count > 0
            ? Builders<Question>.Filter.Nin(q => q.Id, answered)
            : Builders<Question>.Filter.Empty;

        var total = await _questions.CountDocumentsAsync(filter, cancellationToken: ct);
        if (total == 0) return NoContent(); // all answered

        var skip = Random.Shared.NextInt64(total);
        var q = await _questions.Find(filter).Skip((int)skip).Limit(1).FirstOrDefaultAsync(ct);
        if (q is null) return NoContent();

        return Ok(new QuestionDto(q.Id!, q.Text, q.Category, q.Options));
    }

    // ── POST answer ──────────────────────────────────────────────────────────
    [HttpPost("{questionId}/answer")]
    public async Task<IActionResult> SubmitAnswer(string questionId, [FromBody] AnswerRequest body, CancellationToken ct)
    {
        var userId = RequireUserId();

        var q = await _questions.Find(x => x.Id == questionId).FirstOrDefaultAsync(ct);
        if (q is null) return NotFound();
        if (body.AnswerIndex < 0 || body.AnswerIndex >= q.Options.Count)
            return BadRequest("Invalid answer index");

        // Upsert (one answer per question per user)
        var filter = Builders<UserAnswer>.Filter.Where(a => a.UserId == userId && a.QuestionId == questionId);
        var update = Builders<UserAnswer>.Update
            .Set(a => a.AnswerIndex, body.AnswerIndex)
            .Set(a => a.CreatedAtUtc, DateTime.UtcNow)
            .SetOnInsert(a => a.UserId, userId)
            .SetOnInsert(a => a.QuestionId, questionId);

        await _answers.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true }, ct);
        return Ok();
    }

    // ── GET my answers ───────────────────────────────────────────────────────
    [HttpGet("my-answers")]
    public async Task<ActionResult<List<UserAnswer>>> GetMyAnswers(CancellationToken ct)
    {
        var userId = RequireUserId();
        var list = await _answers.Find(a => a.UserId == userId).ToListAsync(ct);
        return Ok(list);
    }

    // ── GET compatibility score with another user (0-100) ───────────────────
    [HttpGet("compatibility/{targetUserId}")]
    public async Task<ActionResult<CompatibilityDto>> GetCompatibility(string targetUserId, CancellationToken ct)
    {
        var myId = RequireUserId();
        if (myId == targetUserId) return Ok(new CompatibilityDto(100, 0));

        var myAnswers     = await _answers.Find(a => a.UserId == myId).ToListAsync(ct);
        var theirAnswers  = await _answers.Find(a => a.UserId == targetUserId).ToListAsync(ct);

        var theirMap = theirAnswers.ToDictionary(a => a.QuestionId, a => a.AnswerIndex);

        int shared  = 0;
        int matched = 0;
        foreach (var a in myAnswers)
        {
            if (!theirMap.TryGetValue(a.QuestionId, out var theirIdx)) continue;
            shared++;
            if (theirIdx == a.AnswerIndex) matched++;
        }

        if (shared == 0) return Ok(new CompatibilityDto(50, 0)); // no shared → neutral
        int score = (int)Math.Round(matched * 100.0 / shared);
        return Ok(new CompatibilityDto(score, shared));
    }

    // ── GET question stats ───────────────────────────────────────────────────
    [HttpGet("stats")]
    public async Task<ActionResult> GetStats(CancellationToken ct)
    {
        var userId   = RequireUserId();
        var total    = await _questions.CountDocumentsAsync(FilterDefinition<Question>.Empty, cancellationToken: ct);
        var answered = await _answers.CountDocumentsAsync(a => a.UserId == userId, cancellationToken: ct);
        return Ok(new { total, answered, remaining = total - answered });
    }
}

public record QuestionDto(string Id, string Text, string Category, List<string> Options);
public record AnswerRequest(int AnswerIndex);
public record CompatibilityDto(int Score, int SharedCount);
