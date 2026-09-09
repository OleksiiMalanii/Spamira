using Microsoft.EntityFrameworkCore;
using Spamira.Api.Data;
using Xunit;

namespace Spamira.Api.Tests;

public class MigrationTests
{
    [Fact]
    public void MigrationSnapshotMatchesCurrentPostgresModel()
    {
        var options = new DbContextOptionsBuilder<SpamiraDbContext>().UseNpgsql("Host=localhost;Database=unused").Options;
        using var db = new SpamiraDbContext(options);
        Assert.False(db.Database.HasPendingModelChanges());
        Assert.Contains("20260909070000_InitialCreate", db.Database.GetMigrations());
    }
}
