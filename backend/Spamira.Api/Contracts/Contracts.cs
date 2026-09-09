using System.Text.Json.Serialization;
using Spamira.Api.Models;

namespace Spamira.Api.Contracts;

public sealed record ClassificationRequest(string? Message);
public sealed record ClassificationResponse(Guid Id, string Message, string Label, double Confidence,
    double SpamProbability, double LegitimateProbability, DateTime CreatedAt, long ProcessingTimeMs, string ModelVersion)
{
    public static ClassificationResponse From(ClassificationResult r) => new(r.Id, r.Message, r.Label,
        r.Confidence, r.SpamProbability, r.LegitimateProbability, r.CreatedAt, r.ProcessingTimeMs, r.ModelVersion);
}
public sealed record PageResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount, int TotalPages);
public sealed record DashboardResponse(int TotalAnalyzed, int SpamCount, int LegitimateCount, double SpamPercentage,
    IReadOnlyList<ClassificationResponse> RecentClassifications, string ModelStatus);
public sealed record Prediction(
    [property: JsonRequired] string Label, [property: JsonRequired] double Confidence,
    [property: JsonRequired, JsonPropertyName("spam_probability")] double SpamProbability,
    [property: JsonRequired, JsonPropertyName("legitimate_probability")] double LegitimateProbability,
    [property: JsonRequired, JsonPropertyName("model_version")] string ModelVersion);
