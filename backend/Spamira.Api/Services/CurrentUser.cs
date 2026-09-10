using System.Security.Claims;

namespace Spamira.Api.Services;

public sealed class CurrentUser(IHttpContextAccessor accessor)
{
    public Guid? Id => accessor.HttpContext?.User.Identity?.IsAuthenticated == true
        && Guid.TryParse(accessor.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
    public Guid RequireId() => Id ?? throw new UnauthorizedAccessException("Sign in to access your history.");
}
