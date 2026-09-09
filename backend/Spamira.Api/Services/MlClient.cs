using System.Text.Json;
using Spamira.Api.Contracts;

namespace Spamira.Api.Services;

public sealed class MlUnavailableException(string message, Exception? inner = null) : Exception(message, inner);

public interface IMlClient
{
    Task<Prediction> PredictAsync(string text, CancellationToken ct);
    Task<JsonElement> MetricsAsync(CancellationToken ct);
    Task<bool> IsHealthyAsync(CancellationToken ct);
}

public sealed class MlClient(HttpClient http) : IMlClient
{
    public async Task<Prediction> PredictAsync(string text, CancellationToken ct)
    {
        try
        {
            using var response = await http.PostAsJsonAsync("predict", new { text }, ct);
            response.EnsureSuccessStatusCode();
            var prediction = await response.Content.ReadFromJsonAsync<Prediction>(ct)
                ?? throw new JsonException("Missing prediction.");
            var values = new[] { prediction.Confidence, prediction.SpamProbability, prediction.LegitimateProbability };
            if (prediction.Label is not ("spam" or "legitimate") || string.IsNullOrWhiteSpace(prediction.ModelVersion)
                || prediction.ModelVersion.Length > 128 || values.Any(x => !double.IsFinite(x) || x < 0 || x > 1)
                || Math.Abs(prediction.SpamProbability + prediction.LegitimateProbability - 1) > 0.00001
                || Math.Abs(prediction.Confidence - Math.Max(prediction.SpamProbability, prediction.LegitimateProbability)) > 0.00001
                || (prediction.Label == "spam" ? prediction.SpamProbability < prediction.LegitimateProbability : prediction.LegitimateProbability < prediction.SpamProbability))
                throw new JsonException("Invalid prediction contract.");
            return prediction;
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException || ex is OperationCanceledException && !ct.IsCancellationRequested)
        {
            throw new MlUnavailableException("The classification service is temporarily unavailable. Please try again.", ex);
        }
    }

    public async Task<JsonElement> MetricsAsync(CancellationToken ct)
    {
        try
        {
            var metrics = await http.GetFromJsonAsync<JsonElement>("metrics", ct);
            foreach (var key in new[] { "accuracy", "precision", "recall", "f1Score" })
                if (!metrics.TryGetProperty(key, out var value) || !value.TryGetDouble(out var score) || !double.IsFinite(score) || score < 0 || score > 1)
                    throw new JsonException("Invalid metrics contract.");
            if (!metrics.TryGetProperty("confusionMatrix", out var matrix) || matrix.ValueKind != JsonValueKind.Array || matrix.GetArrayLength() != 2)
                throw new JsonException("Invalid confusion matrix.");
            foreach (var row in matrix.EnumerateArray())
                if (row.ValueKind != JsonValueKind.Array || row.GetArrayLength() != 2
                    || row.EnumerateArray().Any(value => !value.TryGetInt32(out var count) || count < 0))
                    throw new JsonException("Invalid confusion matrix counts.");
            return metrics;
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException || ex is OperationCanceledException && !ct.IsCancellationRequested)
        {
            throw new MlUnavailableException("Model metrics are temporarily unavailable.", ex);
        }
    }

    public async Task<bool> IsHealthyAsync(CancellationToken ct)
    {
        try { using var response = await http.GetAsync("health", ct); return response.IsSuccessStatusCode; }
        catch (Exception ex) when (ex is HttpRequestException || ex is OperationCanceledException && !ct.IsCancellationRequested) { return false; }
    }
}
