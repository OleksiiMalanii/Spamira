using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace Spamira.Api.Data.Migrations;

[DbContext(typeof(SpamiraDbContext))]
public sealed class SpamiraDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder) => InitialModel.Build(modelBuilder);
}

internal static class InitialModel
{
    public static void Build(ModelBuilder modelBuilder)
    {
        modelBuilder.HasAnnotation("ProductVersion", "10.0.12").HasAnnotation("Relational:MaxIdentifierLength", 63);
        NpgsqlModelBuilderExtensions.UseIdentityByDefaultColumns(modelBuilder);
        modelBuilder.Entity("Spamira.Api.Models.ClassificationResult", entity =>
        {
            entity.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid");
            entity.Property<string>("Message").IsRequired().HasMaxLength(5000).HasColumnType("character varying(5000)");
            entity.Property<string>("Label").IsRequired().HasMaxLength(16).HasColumnType("character varying(16)");
            entity.Property<double>("Confidence").HasColumnType("double precision");
            entity.Property<double>("SpamProbability").HasColumnType("double precision");
            entity.Property<double>("LegitimateProbability").HasColumnType("double precision");
            entity.Property<DateTime>("CreatedAt").HasColumnType("timestamp with time zone");
            entity.Property<long>("ProcessingTimeMs").HasColumnType("bigint");
            entity.Property<string>("ModelVersion").IsRequired().HasMaxLength(128).HasColumnType("character varying(128)");
            entity.HasKey("Id");
            entity.HasIndex("CreatedAt");
            entity.HasIndex("Label", "CreatedAt");
            entity.ToTable("ClassificationResults", table =>
            {
                table.HasCheckConstraint("CK_Classifications_Label", "\"Label\" IN ('spam', 'legitimate')");
                table.HasCheckConstraint("CK_Classifications_Probabilities", "\"SpamProbability\" BETWEEN 0 AND 1 AND \"LegitimateProbability\" BETWEEN 0 AND 1 AND \"Confidence\" BETWEEN 0 AND 1");
            });
        });
    }
}
