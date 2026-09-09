using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Spamira.Api.Data.Migrations;

[DbContext(typeof(SpamiraDbContext))]
[Migration("20260909070000_InitialCreate")]
public sealed class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "ClassificationResults",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Message = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: false),
                Label = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                Confidence = table.Column<double>(type: "double precision", nullable: false),
                SpamProbability = table.Column<double>(type: "double precision", nullable: false),
                LegitimateProbability = table.Column<double>(type: "double precision", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                ProcessingTimeMs = table.Column<long>(type: "bigint", nullable: false),
                ModelVersion = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ClassificationResults", x => x.Id);
                table.CheckConstraint("CK_Classifications_Label", "\"Label\" IN ('spam', 'legitimate')");
                table.CheckConstraint("CK_Classifications_Probabilities", "\"SpamProbability\" BETWEEN 0 AND 1 AND \"LegitimateProbability\" BETWEEN 0 AND 1 AND \"Confidence\" BETWEEN 0 AND 1");
            });
        migrationBuilder.CreateIndex("IX_ClassificationResults_CreatedAt", "ClassificationResults", "CreatedAt");
        migrationBuilder.CreateIndex("IX_ClassificationResults_Label_CreatedAt", "ClassificationResults", new[] { "Label", "CreatedAt" });
    }

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropTable("ClassificationResults");
    protected override void BuildTargetModel(ModelBuilder modelBuilder) => InitialModel.Build(modelBuilder);
}
