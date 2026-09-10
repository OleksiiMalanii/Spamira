using System.Diagnostics;
using Spamira.Api.Contracts;
using Spamira.Api.Data;
using Spamira.Api.Models;

namespace Spamira.Api.Services;

public sealed class ClassificationService(IClassificationRepository repository, IMlClient ml,
    CurrentUser currentUser, GuestQuotaService quota, ILogger<ClassificationService> logger)
{
    public async Task<ClassificationResponse> ClassifyAsync(ClassificationRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Message)) throw new ArgumentException("Please enter a message.");
        if (request.Message.Length > 5000) throw new ArgumentException("Messages must contain at most 5,000 characters.");
        var message = request.Message.Trim();
        var timer = Stopwatch.StartNew();
        var reservation = currentUser.Id is null ? await quota.ReserveAsync(ct) : null;
        Prediction prediction;
        try { prediction = await ml.PredictAsync(message, ct); }
        catch
        {
            if (reservation is not null)
            {
                try { await quota.RefundAsync(reservation); }
                catch (Exception ex) { logger.LogError(ex, "Could not refund a failed guest analysis."); }
            }
            throw;
        }
        var now = DateTime.UtcNow;
        var result = new ClassificationResult
        {
            UserId = currentUser.Id,
            CreatedAt = new DateTime(now.Ticks - now.Ticks % 10, DateTimeKind.Utc),
            Message = message, Label = prediction.Label, Confidence = prediction.Confidence,
            SpamProbability = prediction.SpamProbability, LegitimateProbability = prediction.LegitimateProbability,
            ModelVersion = prediction.ModelVersion, ProcessingTimeMs = timer.ElapsedMilliseconds
        };
        if (result.UserId.HasValue) await repository.AddAsync(result, ct);
        return ClassificationResponse.From(result);
    }

    public async Task<DashboardResponse> DashboardAsync(CancellationToken ct)
    {
        var (total, spam, recent) = await repository.StatsAsync(ct);
        return new(total, spam, total - spam, total == 0 ? 0 : spam * 100.0 / total,
            recent, await ml.IsHealthyAsync(ct) ? "online" : "offline");
    }
}
