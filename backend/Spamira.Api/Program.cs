using System.Threading.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Spamira.Api.Contracts;
using Spamira.Api.Data;
using Spamira.Api.Infrastructure;
using Spamira.Api.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.Configure<Microsoft.AspNetCore.Routing.RouteHandlerOptions>(options => options.ThrowOnBadRequest = true);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 32768);
builder.Services.AddDbContext<SpamiraDbContext>(options => options.UseNpgsql(
    builder.Configuration.GetConnectionString("Default") ?? throw new InvalidOperationException("ConnectionStrings__Default is required.")));
builder.Services.AddScoped<IClassificationRepository, ClassificationRepository>();
builder.Services.AddScoped<ClassificationService>();
builder.Services.AddHttpClient<IMlClient, MlClient>(client =>
{
    client.BaseAddress = new Uri((builder.Configuration["MlService:BaseUrl"] ?? "http://localhost:8000").TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:5173"])
        .AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429;
    options.AddPolicy("classification", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions
        { PermitLimit = 60, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    options.OnRejected = async (context, ct) => await context.HttpContext.Response.WriteAsJsonAsync(
        new { title = "Too many requests", detail = "Please wait a minute before analyzing another message.", status = 429 }, ct);
});

var app = builder.Build();
app.UseExceptionHandler();
app.UseCors();
app.UseRateLimiter();
app.MapOpenApi();
app.UseSwaggerUI(options => options.SwaggerEndpoint("/openapi/v1.json", "Spamira API v1"));

app.MapPost("/api/classifications", async (ClassificationRequest request, ClassificationService service, CancellationToken ct) =>
{
    var result = await service.ClassifyAsync(request, ct);
    return Results.Created($"/api/classifications/{result.Id}", result);
}).RequireRateLimiting("classification").WithName("ClassifyMessage").WithSummary("Analyze and save a text message.")
    .Produces<ClassificationResponse>(201).ProducesProblem(400).ProducesProblem(503).ProducesProblem(429);

app.MapGet("/api/classifications", async (IClassificationRepository repository, CancellationToken ct,
    int page = 1, int pageSize = 10, string? search = null, string? label = null, string sort = "desc") =>
{
    if (page is < 1 or > 1000000 || pageSize is < 1 or > 100) throw new ArgumentException("Use page 1–1,000,000 and pageSize 1–100.");
    if (label is not (null or "spam" or "legitimate")) throw new ArgumentException("Label must be spam or legitimate.");
    if (sort is not ("asc" or "desc")) throw new ArgumentException("Sort must be asc or desc.");
    if (search?.Length > 5000) throw new ArgumentException("Search must contain at most 5,000 characters.");
    return Results.Ok(await repository.ListAsync(page, pageSize, search, label, sort, ct));
}).WithName("ListClassifications").Produces<PageResponse<ClassificationResponse>>().ProducesProblem(400);

app.MapGet("/api/classifications/{id:guid}", async (Guid id, IClassificationRepository repository, CancellationToken ct) =>
    await repository.GetAsync(id, ct) is { } result ? Results.Ok(ClassificationResponse.From(result)) : Results.NotFound());
app.MapGet("/api/dashboard/stats", async (ClassificationService service, CancellationToken ct) => Results.Ok(await service.DashboardAsync(ct)));
app.MapGet("/api/model/metrics", async (IMlClient ml, CancellationToken ct) => Results.Ok(await ml.MetricsAsync(ct)));
app.MapGet("/health", async (SpamiraDbContext db, IMlClient ml, CancellationToken ct) =>
{
    var database = await db.Database.CanConnectAsync(ct);
    var model = await ml.IsHealthyAsync(ct);
    return Results.Json(new { status = database && model ? "healthy" : "degraded", database, model }, statusCode: database && model ? 200 : 503);
});
if (builder.Configuration.GetValue<bool>("Database:AutoMigrate"))
{
    await using var scope = app.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<SpamiraDbContext>().Database.MigrateAsync();
}
app.Run();

public partial class Program;
