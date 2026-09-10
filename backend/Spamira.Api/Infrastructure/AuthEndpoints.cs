using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;
using Spamira.Api.Contracts;
using Spamira.Api.Models;
using Spamira.Api.Services;

namespace Spamira.Api.Infrastructure;

public static class AuthEndpoints
{
    public static void MapAccountEndpoints(this WebApplication app)
    {
        var auth = app.MapGroup("/api/auth").WithTags("Accounts");
        auth.MapGet("/csrf", (HttpContext context, IAntiforgery antiforgery) =>
            Results.Ok(new { token = antiforgery.GetAndStoreTokens(context).RequestToken }));
        auth.MapGet("/session", async (HttpContext context, UserManager<ApplicationUser> users, GuestQuotaService quota, CancellationToken ct) =>
        {
            var user = await users.GetUserAsync(context.User);
            return Results.Ok(new SessionResponse(user is null ? null : UserResponse.From(user), user is null ? await quota.StatusAsync(ct) : null));
        });
        auth.MapPost("/register", async (RegisterRequest request, AccountService accounts) =>
            Results.Created("/api/auth/session", await accounts.RegisterAsync(request))).RequireRateLimiting("accounts");
        auth.MapPost("/login", async (LoginRequest request, AccountService accounts) =>
            Results.Ok(await accounts.LoginAsync(request))).RequireRateLimiting("accounts");
        auth.MapPost("/logout", async (AccountService accounts) =>
        {
            await accounts.LogoutAsync();
            return Results.Ok(new { signedOut = true });
        });
    }
}
