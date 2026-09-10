using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Spamira.Api.Contracts;
using Spamira.Api.Data;
using Xunit;

namespace Spamira.Api.Tests;

public class AccountTests
{
    [Fact]
    public async Task GuestAllowanceResetsAtUtcMidnight()
    {
        using var factory = new ApiFactory(); using var client = await factory.ReadyClientAsync(false);
        (await client.PostWithCsrfAsync("/api/classifications", new { message = "hello" })).EnsureSuccessStatusCode();
        var before = (await client.GetFromJsonAsync<SessionResponse>("/api/auth/session"))!;
        Assert.Equal(9, before.GuestQuota!.Remaining);
        factory.Clock.Now = factory.Clock.Now.AddMinutes(2);
        var after = (await client.GetFromJsonAsync<SessionResponse>("/api/auth/session"))!;
        Assert.Equal(10, after.GuestQuota!.Remaining);
        Assert.True(after.GuestQuota.ResetsAt > before.GuestQuota.ResetsAt);
    }
    [Fact]
    public async Task GuestCannotReadHistoryStatisticsOrRecords()
    {
        using var factory = new ApiFactory(); using var client = await factory.ReadyClientAsync(false);
        foreach (var path in new[] { "/api/classifications", $"/api/classifications/{Guid.NewGuid()}", "/api/dashboard/stats" })
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(path)).StatusCode);
    }

    [Fact]
    public async Task GuestHasExactlyTenDailyAnalysesWithoutStoredMessages()
    {
        using var factory = new ApiFactory(); using var client = await factory.ReadyClientAsync(false);
        for (var i = 0; i < 10; i++)
        {
            var response = await client.PostWithCsrfAsync("/api/classifications", new { message = "hello" });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.False((await response.Content.ReadFromJsonAsync<ClassificationResponse>())!.SavedToHistory);
        }
        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.PostWithCsrfAsync("/api/classifications", new { message = "hello" })).StatusCode);
        using var freshBrowser = factory.CreateClient();
        var session = (await freshBrowser.GetFromJsonAsync<SessionResponse>("/api/auth/session"))!;
        Assert.Null(session.User);
        Assert.Equal(0, session.GuestQuota!.Remaining);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SpamiraDbContext>();
        Assert.Equal(0, await db.Classifications.CountAsync());
    }

    [Fact]
    public async Task FailedPredictionAndValidationDoNotUseGuestAllowance()
    {
        using var factory = new ApiFactory(); using var client = await factory.ReadyClientAsync(false);
        factory.Ml.Unavailable = true;
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.PostWithCsrfAsync("/api/classifications", new { message = "hello" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostWithCsrfAsync("/api/classifications", new { message = "   " })).StatusCode);
        var session = (await client.GetFromJsonAsync<SessionResponse>("/api/auth/session"))!;
        Assert.Equal(10, session.GuestQuota!.Remaining);
    }

    [Fact]
    public async Task MemberHasNoGuestLimitAndOtherAccountsCannotSeeTheirData()
    {
        using var factory = new ApiFactory(); using var alice = await factory.ReadyClientAsync();
        ClassificationResponse? saved = null;
        for (var i = 0; i < 11; i++)
        {
            var response = await alice.PostWithCsrfAsync("/api/classifications", new { message = "prize for alice" });
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            saved = await response.Content.ReadFromJsonAsync<ClassificationResponse>();
            Assert.True(saved!.SavedToHistory);
        }
        using var bob = factory.CreateClient();
        (await bob.PostWithCsrfAsync("/api/auth/register", new { displayName = "Bob", email = "bob@example.com", password = ApiFactory.TestPassword })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NotFound, (await bob.GetAsync($"/api/classifications/{saved!.Id}")).StatusCode);
        var history = (await bob.GetFromJsonAsync<PageResponse<ClassificationResponse>>("/api/classifications?search=alice"))!;
        Assert.Empty(history.Items);
        Assert.Equal(0, (await bob.GetFromJsonAsync<DashboardResponse>("/api/dashboard/stats"))!.TotalAnalyzed);
        Assert.Equal(11, (await alice.GetFromJsonAsync<DashboardResponse>("/api/dashboard/stats"))!.TotalAnalyzed);
    }

    [Fact]
    public async Task PasswordsAreHashedLogoutRevokesCookieAndLoginRestoresAccount()
    {
        using var factory = new ApiFactory(); using var client = await factory.ReadyClientAsync();
        using var scope = factory.Services.CreateScope();
        var user = await scope.ServiceProvider.GetRequiredService<SpamiraDbContext>().Users.SingleAsync();
        Assert.NotEqual(ApiFactory.TestPassword, user.PasswordHash);
        Assert.DoesNotContain(ApiFactory.TestPassword, user.PasswordHash!);
        (await client.PostWithCsrfAsync("/api/auth/logout", new { })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/classifications")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostWithCsrfAsync("/api/auth/login", new { email = factory.MemberEmail, password = "wrong" })).StatusCode);
        (await client.PostWithCsrfAsync("/api/auth/login", new { email = factory.MemberEmail.ToUpperInvariant(), password = ApiFactory.TestPassword })).EnsureSuccessStatusCode();
        Assert.Equal(user.Id, (await client.GetFromJsonAsync<SessionResponse>("/api/auth/session"))!.User!.Id);
    }

    [Fact]
    public async Task UnsafeRequestsRequireCsrfToken()
    {
        using var factory = new ApiFactory(); using var client = await factory.ReadyClientAsync(false);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/auth/register", new { displayName = "Alice", email = "alice@example.com", password = ApiFactory.TestPassword })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/classifications", new { message = "hello" })).StatusCode);
    }

    [Fact]
    public async Task DuplicateEmailAndWeakPasswordsAreRejected()
    {
        using var factory = new ApiFactory(); using var member = await factory.ReadyClientAsync(); using var guest = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Conflict, (await guest.PostWithCsrfAsync("/api/auth/register", new { displayName = "Other", email = factory.MemberEmail.ToUpperInvariant(), password = ApiFactory.TestPassword })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await guest.PostWithCsrfAsync("/api/auth/register", new { displayName = "Other", email = "other@example.com", password = "short" })).StatusCode);
    }

    [Fact]
    public async Task FiveFailedPasswordsLockSignInTemporarily()
    {
        using var factory = new ApiFactory(); using var member = await factory.ReadyClientAsync(); using var guest = factory.CreateClient();
        for (var i = 0; i < 5; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await guest.PostWithCsrfAsync("/api/auth/login", new { email = factory.MemberEmail, password = "incorrect" })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await guest.PostWithCsrfAsync("/api/auth/login", new { email = factory.MemberEmail, password = ApiFactory.TestPassword })).StatusCode);
    }
}
