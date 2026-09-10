namespace Spamira.Api.Models;

public sealed class ClassificationResult
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? UserId { get; set; }
    public required string Message { get; set; }
    public required string Label { get; set; }
    public double Confidence { get; set; }
    public double SpamProbability { get; set; }
    public double LegitimateProbability { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public long ProcessingTimeMs { get; set; }
    public required string ModelVersion { get; set; }
}
