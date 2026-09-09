using Microsoft.EntityFrameworkCore;
using Spamira.Api.Models;

namespace Spamira.Api.Data;

public sealed class SpamiraDbContext(DbContextOptions<SpamiraDbContext> options) : DbContext(options)
{
    public DbSet<ClassificationResult> Classifications => Set<ClassificationResult>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<ClassificationResult>();
        entity.ToTable("ClassificationResults", table =>
        {
            table.HasCheckConstraint("CK_Classifications_Label", "\"Label\" IN ('spam', 'legitimate')");
            table.HasCheckConstraint("CK_Classifications_Probabilities", "\"SpamProbability\" BETWEEN 0 AND 1 AND \"LegitimateProbability\" BETWEEN 0 AND 1 AND \"Confidence\" BETWEEN 0 AND 1");
        });
        entity.HasKey(x => x.Id);
        entity.Property(x => x.Message).HasMaxLength(5000).IsRequired();
        entity.Property(x => x.Label).HasMaxLength(16).IsRequired();
        entity.Property(x => x.ModelVersion).HasMaxLength(128).IsRequired();
        entity.HasIndex(x => x.CreatedAt);
        entity.HasIndex(x => new { x.Label, x.CreatedAt });
    }
}
