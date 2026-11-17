using Conecta.Api.Infraestrutura.Dados;
using Microsoft.EntityFrameworkCore;

namespace Conecta.Api.Endpoints;

public static class SaudeEndpoints
{
    // GET /saude -> testa se a API e o banco estao respondendo
    public static IEndpointRouteBuilder MapSaudeEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/saude", async (ConectaDbContext db, IHostEnvironment env, ILogger<ConectaDbContext> logger, CancellationToken ct) =>
        {
            try
            {
                var tabelas = await db.Database
                    .SqlQuery<int>($"select count(*)::int as \"Value\" from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'")
                    .SingleAsync(ct);

                return Results.Ok(new { api = "ok", banco = "ok", tabelas });
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Erro ao conectar no banco");
                var detalhe = env.IsDevelopment() ? ex.GetBaseException().Message : null;
                return Results.Json(new { api = "ok", banco = "erro", detalhe }, statusCode: StatusCodes.Status503ServiceUnavailable);
            }
        })
        .WithName("Saude");

        return app;
    }
}
