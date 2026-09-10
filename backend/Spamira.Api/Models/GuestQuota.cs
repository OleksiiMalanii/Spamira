namespace Spamira.Api.Models;

public sealed class GuestQuota
{
    public required string Id { get; set; }
    public DateOnly Day { get; set; }
    public int UsedCount { get; set; }
}
