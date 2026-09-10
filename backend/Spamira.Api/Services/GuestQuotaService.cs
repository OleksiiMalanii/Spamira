using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Spamira.Api.Contracts;
using Spamira.Api.Data;

namespace Spamira.Api.Services;

public sealed class GuestLimitException : Exception
{
    public GuestLimitException() : base("You have used your 10 free analyses for today. Sign in to keep analyzing, or return after 00:00 UTC.") { }
}

public sealed class GuestQuotaService(SpamiraDbContext db, IHttpContextAccessor accessor, TimeProvider clock)
{
    public const int DailyLimit = 10;

    private (string Id, DateOnly Day, DateTime Reset) Key()
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var day = DateOnly.FromDateTime(now);
        var ip = accessor.HttpContext?.Connection.RemoteIpAddress ?? IPAddress.Loopback;
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(ip.MapToIPv6().ToString())));
        return ($"{day:yyyyMMdd}:{hash}", day, now.Date.AddDays(1));
    }

    public async Task<QuotaResponse> StatusAsync(CancellationToken ct)
    {
        var (id, _, reset) = Key();
        var used = await db.GuestQuotas.Where(x => x.Id == id).Select(x => (int?)x.UsedCount).SingleOrDefaultAsync(ct) ?? 0;
        return new(DailyLimit, used, Math.Max(0, DailyLimit - used), reset);
    }

    public async Task<string> ReserveAsync(CancellationToken ct)
    {
        var (id, day, _) = Key();
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"INSERT INTO \"GuestQuotas\" (\"Id\", \"Day\", \"UsedCount\") VALUES ({id}, {day}, {0}) ON CONFLICT (\"Id\") DO NOTHING", ct);
        var changed = await db.GuestQuotas.Where(x => x.Id == id && x.UsedCount < DailyLimit)
            .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.UsedCount, x => x.UsedCount + 1), ct);
        if (changed == 0) throw new GuestLimitException();
        return id;
    }

    public Task RefundAsync(string reservation) => db.GuestQuotas.Where(x => x.Id == reservation && x.UsedCount > 0)
        .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.UsedCount, x => x.UsedCount - 1), CancellationToken.None);
}
