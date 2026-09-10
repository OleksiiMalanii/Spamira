using Spamira.Api.Models;

namespace Spamira.Api.Contracts;

public sealed record RegisterRequest(string? DisplayName, string? Email, string? Password);
public sealed record LoginRequest(string? Email, string? Password, bool RememberMe = false);
public sealed record UserResponse(Guid Id, string DisplayName, string Email)
{
    public static UserResponse From(ApplicationUser user) => new(user.Id, user.DisplayName, user.Email!);
}
public sealed record QuotaResponse(int Limit, int Used, int Remaining, DateTime ResetsAt);
public sealed record SessionResponse(UserResponse? User, QuotaResponse? GuestQuota);
