using Microsoft.EntityFrameworkCore;
using Spamira.Api.Contracts;
using Spamira.Api.Models;
using Spamira.Api.Services;

namespace Spamira.Api.Data;

public interface IClassificationRepository
{
    Task AddAsync(ClassificationResult result, CancellationToken ct);
    Task<ClassificationResult?> GetAsync(Guid id, CancellationToken ct);
    Task<PageResponse<ClassificationResponse>> ListAsync(int page, int pageSize, string? search, string? label, string sort, CancellationToken ct);
    Task<(int Total, int Spam, IReadOnlyList<ClassificationResponse> Recent)> StatsAsync(CancellationToken ct);
}

public sealed class ClassificationRepository(SpamiraDbContext db, CurrentUser currentUser) : IClassificationRepository
{
    private IQueryable<ClassificationResult> Owned()
    {
        var userId = currentUser.RequireId();
        return db.Classifications.AsNoTracking().Where(x => x.UserId == userId);
    }
    public async Task AddAsync(ClassificationResult result, CancellationToken ct)
    {
        result.UserId = currentUser.RequireId();
        db.Classifications.Add(result);
        await db.SaveChangesAsync(ct);
    }

    public Task<ClassificationResult?> GetAsync(Guid id, CancellationToken ct) =>
        Owned().SingleOrDefaultAsync(x => x.Id == id, ct);

    public async Task<PageResponse<ClassificationResponse>> ListAsync(int page, int pageSize, string? search, string? label, string sort, CancellationToken ct)
    {
        var query = Owned();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(x => x.Message.ToLower().Contains(term));
        }
        if (label is not null) query = query.Where(x => x.Label == label);
        var count = await query.CountAsync(ct);
        query = sort == "asc" ? query.OrderBy(x => x.CreatedAt).ThenBy(x => x.Id)
            : query.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id);
        var rows = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return new(rows.Select(ClassificationResponse.From).ToList(), page, pageSize, count, (int)Math.Ceiling(count / (double)pageSize));
    }

    public async Task<(int Total, int Spam, IReadOnlyList<ClassificationResponse> Recent)> StatsAsync(CancellationToken ct)
    {
        var counts = await Owned().GroupBy(x => x.Label)
            .Select(g => new { Label = g.Key, Count = g.Count() }).ToListAsync(ct);
        var recent = await Owned().OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).Take(5).ToListAsync(ct);
        return (counts.Sum(x => x.Count), counts.Where(x => x.Label == "spam").Sum(x => x.Count), recent.Select(ClassificationResponse.From).ToList());
    }
}
