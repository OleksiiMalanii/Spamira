using System.Threading.RateLimiting;
using System.Net;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Spamira.Api.Contracts;
using Spamira.Api.Data;
using Spamira.Api.Infrastructure;
using Spamira.Api.Services;
using Spamira.Api.Models;

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
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<CurrentUser>();
builder.Services.AddScoped<GuestQuotaService>();
builder.Services.AddScoped<AccountService>();
builder.Services.AddIdentityCore<ApplicationUser>(options =>
{
    options.User.RequireUniqueEmail = true;
    options.Password.RequiredLength = 10;
    options.Password.RequireNonAlphanumeric = false;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
}).AddEntityFrameworkStores<SpamiraDbContext>().AddSignInManager();
builder.Services.AddAuthentication(IdentityConstants.ApplicationScheme).AddIdentityCookies();
builder.Services.AddAuthorization();
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "spamira.session";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = builder.Configuration.GetValue<bool>("Auth:SecureCookies") ? CookieSecurePolicy.Always : CookieSecurePolicy.SameAsRequest;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.SlidingExpiration = true;
    options.Events.OnRedirectToLogin = context => { context.Response.StatusCode = 401; return Task.CompletedTask; };
    options.Events.OnRedirectToAccessDenied = context => { context.Response.StatusCode = 403; return Task.CompletedTask; };
});
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "spamira.csrf";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = builder.Configuration.GetValue<bool>("Auth:SecureCookies") ? CookieSecurePolicy.Always : CookieSecurePolicy.SameAsRequest;
});
var protection = builder.Services.AddDataProtection().SetApplicationName("Spamira");
if (builder.Configuration["Auth:DataProtectionPath"] is { Length: > 0 } keyPath)
    protection.PersistKeysToFileSystem(new DirectoryInfo(keyPath));
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    foreach (var proxy in builder.Configuration.GetSection("ReverseProxy:KnownProxies").Get<string[]>() ?? [])
        options.KnownProxies.Add(IPAddress.Parse(proxy));
});
builder.Services.AddHttpClient<IMlClient, MlClient>(client =>
{
    client.BaseAddress = new Uri((builder.Configuration["MlService:BaseUrl"] ?? "http://localhost:8000").TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:5173"])
        .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429;
    options.AddPolicy("accounts", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions
        { PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    options.AddPolicy("classification", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions
        { PermitLimit = 60, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    options.OnRejected = async (context, ct) => await context.HttpContext.Response.WriteAsJsonAsync(
        new { title = "Too many requests", detail = "Too many requests. Please wait a minute and try again.", status = 429 }, ct);
});

var app = builder.Build();
app.UseExceptionHandler();
app.UseForwardedHeaders();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.Headers.CacheControl = "no-store";
        if (!HttpMethods.IsGet(context.Request.Method) && !HttpMethods.IsHead(context.Request.Method) && !HttpMethods.IsOptions(context.Request.Method))
            await context.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(context);
    }
    await next(context);
});
app.MapOpenApi();
app.MapAccountEndpoints();
app.UseSwaggerUI(options => options.SwaggerEndpoint("/openapi/v1.json", "Spamira API v1"));

app.MapPost("/api/classifications", async (ClassificationRequest request, ClassificationService service, CancellationToken ct) =>
{
    var result = await service.ClassifyAsync(request, ct);
    return result.SavedToHistory ? Results.Created($"/api/classifications/{result.Id}", result) : Results.Ok(result);
}).RequireRateLimiting("classification").WithName("ClassifyMessage").WithSummary("Analyze and save a text message.")
    .Produces<ClassificationResponse>(201).Produces<ClassificationResponse>().ProducesProblem(400).ProducesProblem(503).ProducesProblem(429);

app.MapGet("/api/classifications", async (IClassificationRepository repository, CancellationToken ct,
    int page = 1, int pageSize = 10, string? search = null, string? label = null, string sort = "desc") =>
{
    if (page is < 1 or > 1000000 || pageSize is < 1 or > 100) throw new ArgumentException("Use page 1–1,000,000 and pageSize 1–100.");
    if (label is not (null or "spam" or "legitimate")) throw new ArgumentException("Label must be spam or legitimate.");
    if (sort is not ("asc" or "desc")) throw new ArgumentException("Sort must be asc or desc.");
    if (search?.Length > 5000) throw new ArgumentException("Search must contain at most 5,000 characters.");
    return Results.Ok(await repository.ListAsync(page, pageSize, search, label, sort, ct));
}).RequireAuthorization().WithName("ListClassifications").Produces<PageResponse<ClassificationResponse>>().ProducesProblem(400);

app.MapGet("/api/classifications/{id:guid}", async (Guid id, IClassificationRepository repository, CancellationToken ct) =>
    await repository.GetAsync(id, ct) is { } result ? Results.Ok(ClassificationResponse.From(result)) : Results.NotFound()).RequireAuthorization();
app.MapGet("/api/dashboard/stats", async (ClassificationService service, CancellationToken ct) => Results.Ok(await service.DashboardAsync(ct))).RequireAuthorization();
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
