using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Spamira.Api.Models;

namespace Spamira.Api.Data;

public sealed class SpamiraDbContext(DbContextOptions<SpamiraDbContext> options) : IdentityUserContext<ApplicationUser, Guid>(options)
{
    public DbSet<ClassificationResult> Classifications => Set<ClassificationResult>();
    public DbSet<GuestQuota> GuestQuotas => Set<GuestQuota>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<ApplicationUser>().Property(x => x.DisplayName).HasMaxLength(80).IsRequired();
        modelBuilder.Entity<ApplicationUser>().HasIndex(x => x.NormalizedEmail).IsUnique();
        modelBuilder.Entity<GuestQuota>(quota =>
        {
            quota.ToTable("GuestQuotas", table => table.HasCheckConstraint("CK_GuestQuotas_UsedCount", "\"UsedCount\" BETWEEN 0 AND 10"));
            quota.HasKey(x => x.Id);
            quota.Property(x => x.Id).HasMaxLength(80);
            quota.HasIndex(x => x.Day);
        });
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
        entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        entity.HasIndex(x => new { x.UserId, x.CreatedAt });
    }
}
