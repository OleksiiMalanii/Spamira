using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Spamira.Api.Contracts;
using Spamira.Api.Data;
using Spamira.Api.Services;
using Xunit;

namespace Spamira.Api.Tests;

public sealed class TestMl : IMlClient
{
    public bool Unavailable { get; set; }
    public Task<Prediction> PredictAsync(string text, CancellationToken ct) => Unavailable
        ? throw new MlUnavailableException("The classification service is temporarily unavailable.")
        : Task.FromResult(new Prediction(text.Contains("prize") ? "spam" : "legitimate", .9,
            text.Contains("prize") ? .9 : .1, text.Contains("prize") ? .1 : .9, "test-v1"));
    public Task<JsonElement> MetricsAsync(CancellationToken ct) => Task.FromResult(JsonSerializer.SerializeToElement(new { accuracy = .98 }));
    public Task<bool> IsHealthyAsync(CancellationToken ct) => Task.FromResult(!Unavailable);
}

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    public TestMl Ml { get; } = new();
    public TestClock Clock { get; } = new();
    public string MemberEmail { get; } = $"member-{Guid.NewGuid():N}@example.com";
    public const string TestPassword = "TestingPassword123";
    public ApiFactory() => connection.Open();
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        { ["ConnectionStrings:Default"] = "Host=localhost;Database=test", ["Database:AutoMigrate"] = "false" }));
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<SpamiraDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<SpamiraDbContext>>();
            services.AddDbContext<SpamiraDbContext>(options => options.UseSqlite(connection));
            services.RemoveAll<IMlClient>();
            services.AddSingleton<IMlClient>(Ml);
            services.AddSingleton<TimeProvider>(Clock);
        });
    }
    public async Task<HttpClient> ReadyClientAsync(bool authenticated = true)
    {
        var client = CreateClient();
        using var scope = Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<SpamiraDbContext>().Database.EnsureCreatedAsync();
        if (authenticated)
            (await client.PostWithCsrfAsync("/api/auth/register", new { displayName = "Test member", email = MemberEmail, password = TestPassword })).EnsureSuccessStatusCode();
        return client;
    }
    protected override void Dispose(bool disposing) { base.Dispose(disposing); if (disposing) connection.Dispose(); }
}

public sealed class TestClock : TimeProvider
{
    public DateTimeOffset Now { get; set; } = new(2026, 9, 9, 23, 59, 0, TimeSpan.Zero);
    public override DateTimeOffset GetUtcNow() => Now;
}

public class ApiTests
{
    [Fact]
    public async Task ClassificationIsPersistedAndQueryableAcrossRequests()
    {
        using var factory = new ApiFactory();
        using var client = await factory.ReadyClientAsync();
        var response = await client.PostWithCsrfAsync("/api/classifications", new { message = "  Claim your prize  " });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var item = (await response.Content.ReadFromJsonAsync<ClassificationResponse>())!;
        Assert.Equal("Claim your prize", item.Message);
        Assert.Equal("spam", item.Label);
        Assert.Equal(0, item.CreatedAt.Ticks % 10);
        Assert.Equal(1, item.SpamProbability + item.LegitimateProbability);
        using var secondClient = factory.CreateClient();
        (await secondClient.PostWithCsrfAsync("/api/auth/login", new { email = factory.MemberEmail, password = ApiFactory.TestPassword })).EnsureSuccessStatusCode();
        var saved = await secondClient.GetFromJsonAsync<ClassificationResponse>($"/api/classifications/{item.Id}");
        Assert.Equal(item, saved);
        var page = (await client.GetFromJsonAsync<PageResponse<ClassificationResponse>>("/api/classifications?label=spam&search=PRIZE&pageSize=1"))!;
        Assert.Single(page.Items);
        Assert.Equal(1, page.TotalCount);
        var dashboard = (await client.GetFromJsonAsync<DashboardResponse>("/api/dashboard/stats"))!;
        Assert.Equal(1, dashboard.TotalAnalyzed);
        Assert.Equal(100, dashboard.SpamPercentage);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task BlankMessageRejected(string? message)
    {
        using var factory = new ApiFactory(); using var client = await factory.ReadyClientAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostWithCsrfAsync("/api/classifications", new { message })).StatusCode);
    }

    [Fact]
    public async Task LongMessageRejected()
    {
        using var factory = new ApiFactory(); using var client = await factory.ReadyClientAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostWithCsrfAsync("/api/classifications", new { message = new string('x', 5001) })).StatusCode);
    }

    [Theory]
    [InlineData("page=0")]
    [InlineData("pageSize=101")]
    [InlineData("label=unknown")]
    [InlineData("sort=random")]
    [InlineData("page=abc")]
    public async Task InvalidQueryRejected(string query)
    {
        using var factory = new ApiFactory(); using var client = await factory.ReadyClientAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync($"/api/classifications?{query}")).StatusCode);
    }

    [Fact]
    public async Task PaginationFiltersAndDateSortingWork()
    {
        using var factory = new ApiFactory(); using var client = await factory.ReadyClientAsync();
        await client.PostWithCsrfAsync("/api/classifications", new { message = "prize first" });
        await client.PostWithCsrfAsync("/api/classifications", new { message = "hello second" });
        var oldest = (await client.GetFromJsonAsync<PageResponse<ClassificationResponse>>("/api/classifications?pageSize=1&sort=asc"))!;
        Assert.Equal("prize first", oldest.Items[0].Message);
        Assert.Equal(2, oldest.TotalPages);
        var newest = (await client.GetFromJsonAsync<PageResponse<ClassificationResponse>>("/api/classifications?pageSize=1&sort=desc"))!;
        Assert.Equal("hello second", newest.Items[0].Message);
        var filtered = (await client.GetFromJsonAsync<PageResponse<ClassificationResponse>>("/api/classifications?label=legitimate"))!;
        Assert.Single(filtered.Items);
        var empty = (await client.GetFromJsonAsync<PageResponse<ClassificationResponse>>("/api/classifications?search=missing"))!;
        Assert.Empty(empty.Items);
    }

    [Fact]
    public async Task MlFailureReturnsFriendlyErrorWithoutSaving()
    {
        using var factory = new ApiFactory(); using var client = await factory.ReadyClientAsync();
        factory.Ml.Unavailable = true;
        var response = await client.PostWithCsrfAsync("/api/classifications", new { message = "hello" });
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.DoesNotContain("stack", await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
        var history = (await client.GetFromJsonAsync<PageResponse<ClassificationResponse>>("/api/classifications"))!;
        Assert.Empty(history.Items);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.GetAsync("/health")).StatusCode);
    }

    [Fact]
    public async Task MissingDatabaseTableReturnsServiceUnavailable()
    {
        using var factory = new ApiFactory(); using var client = await factory.ReadyClientAsync();
        using var scope = factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<SpamiraDbContext>().Database.ExecuteSqlRawAsync("DROP TABLE ClassificationResults");
        var response = await client.GetAsync("/api/classifications");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Contains("temporarily unavailable", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task HealthMetricsOpenApiAndMissingId()
    {
        using var factory = new ApiFactory(); using var client = await factory.ReadyClientAsync();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/model/metrics")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/openapi/v1.json")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/classifications/{Guid.NewGuid()}")).StatusCode);
    }
}
