using Conecta.Api.Dominio.Entidades;
using Conecta.Api.Dominio.Validacao;
using Conecta.Api.Infraestrutura.Dados;
using Conecta.Api.Seguranca;
using Microsoft.EntityFrameworkCore;

namespace Conecta.Api.Endpoints;

public sealed record CriarItemEstoqueRequest(
    string? Nome,
    int? QuantidadeAtual,
    string? UnidadeMedida,
    string? Categoria,
    int? QuantidadeMinima);

public sealed record ItemEstoqueResposta(
    int Id,
    string Nome,
    int QuantidadeAtual,
    string UnidadeMedida,
    string? Categoria,
    int QuantidadeMinima);

// Modulo Central de Controle de Estoque (RF22 a RF30).
// O negocio sempre vem do token (negocio_id): nunca do corpo nem da URL.
public static class EstoqueEndpoints
{
    private const int LimiteListagem = 500;
    private const string MsgNomeRepetido = "Já existe um item com esse nome no estoque.";

    public static IEndpointRouteBuilder MapEstoqueEndpoints(this IEndpointRouteBuilder app)
    {
        // Gerente e Funcionario (matriz de permissoes, secao 4 dos requisitos). Token de cliente nao passa.
        var grupo = app.MapGroup("/api/estoque").RequireAuthorization("equipe");

        grupo.MapGet("/", Listar);
        grupo.MapGet("/{id:int}", Obter);
        grupo.MapPost("/", Cadastrar);

        return app;
    }

    // RF22
    private static async Task<IResult> Cadastrar(
        CriarItemEstoqueRequest req,
        HttpContext http,
        ConectaDbContext db,
        CancellationToken ct)
    {
        var erros = new Dictionary<string, string[]>();
        void Erro(string campo, string? msg) { if (msg is not null) erros[campo] = [msg]; }

        var nome = Regras.LimparTexto(req.Nome);
        Erro("nome", Regras.ValidarNomeItem(nome));

        var unidade = Regras.NormalizarUnidade(req.UnidadeMedida, out var erroUnidade);
        Erro("unidadeMedida", erroUnidade);

        var categoria = Regras.LimparTexto(req.Categoria);
        Erro("categoria", Regras.ValidarCategoriaEstoque(categoria));

        // sem valor = 0, igual ao default do banco
        var quantidadeAtual = req.QuantidadeAtual ?? 0;
        var quantidadeMinima = req.QuantidadeMinima ?? 0;
        Erro("quantidadeAtual", Regras.ValidarQuantidadeAtual(quantidadeAtual));
        Erro("quantidadeMinima", Regras.ValidarQuantidadeMinima(quantidadeMinima)); // RN04

        if (erros.Count > 0) return Results.ValidationProblem(erros);

        var negocioId = http.User.LerNegocioId();
        if (await NomeEmUso(db, negocioId, nome, ct))
            return Results.ValidationProblem(
                new Dictionary<string, string[]> { ["nome"] = [MsgNomeRepetido] },
                statusCode: StatusCodes.Status409Conflict);

        var item = new ItemEstoque
        {
            NegocioId = negocioId,
            Nome = nome,
            QuantidadeAtual = quantidadeAtual,
            UnidadeMedida = unidade!,
            Categoria = categoria.Length == 0 ? null : categoria,
            QuantidadeMinima = quantidadeMinima,
        };
        db.ItensEstoque.Add(item);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/estoque/{item.Id}", ParaResposta(item));
    }

    // RF30: filtros por nome (parte do nome), categoria (exata) e status
    private static async Task<IResult> Listar(
        string? nome,
        string? categoria,
        string? status,
        HttpContext http,
        ConectaDbContext db,
        CancellationToken ct)
    {
        var negocioId = http.User.LerNegocioId();
        var consulta = db.ItensEstoque.AsNoTracking().Where(i => i.NegocioId == negocioId);

        var nomeFiltro = Regras.LimparTexto(nome);
        if (nomeFiltro.Length > 0)
        {
            var padrao = $"%{EscaparLike(nomeFiltro)}%";
            consulta = consulta.Where(i => EF.Functions.ILike(i.Nome, padrao, @"\"));
        }

        var categoriaFiltro = Regras.LimparTexto(categoria).ToLower();
        if (categoriaFiltro.Length > 0)
            consulta = consulta.Where(i => i.Categoria != null && i.Categoria.ToLower() == categoriaFiltro);

        // Esgotado: zerado. Baixo: acima de zero e ate a minima (RF28). Normal: o resto.
        switch (Regras.LimparTexto(status).ToLowerInvariant())
        {
            case "":
                break;
            case "esgotado":
                consulta = consulta.Where(i => i.QuantidadeAtual == 0);
                break;
            case "baixo":
                consulta = consulta.Where(i => i.QuantidadeAtual > 0 && i.QuantidadeAtual <= i.QuantidadeMinima);
                break;
            case "normal":
                consulta = consulta.Where(i => i.QuantidadeAtual > 0 && i.QuantidadeAtual > i.QuantidadeMinima);
                break;
            default:
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["status"] = ["Escolha um status: normal, baixo ou esgotado."],
                });
        }

        var itens = await consulta
            .OrderBy(i => i.Nome)
            .Take(LimiteListagem)
            .Select(i => new ItemEstoqueResposta(i.Id, i.Nome, i.QuantidadeAtual, i.UnidadeMedida, i.Categoria, i.QuantidadeMinima))
            .ToListAsync(ct);

        return Results.Ok(itens);
    }

    private static async Task<IResult> Obter(int id, HttpContext http, ConectaDbContext db, CancellationToken ct)
    {
        var negocioId = http.User.LerNegocioId();
        var item = await db.ItensEstoque.AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == id && i.NegocioId == negocioId, ct);

        // item de outro negocio tambem da 404, para nao revelar que ele existe
        return item is null ? ItemNaoEncontrado() : Results.Ok(ParaResposta(item));
    }

    private static Task<bool> NomeEmUso(ConectaDbContext db, int negocioId, string nome, CancellationToken ct)
    {
        var nomeMinusculo = nome.ToLower();
        return db.ItensEstoque.AnyAsync(i => i.NegocioId == negocioId && i.Nome.ToLower() == nomeMinusculo, ct);
    }

    // % e _ sao curingas no ILIKE. A barra e o escape, passado explicitamente no ILike:
    // sem ele o Npgsql gera ESCAPE '' e a busca por "50%" nao funcionaria.
    private static string EscaparLike(string texto) =>
        texto.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_");

    private static IResult ItemNaoEncontrado() =>
        Results.Problem("Item não encontrado no estoque.", statusCode: StatusCodes.Status404NotFound);

    private static ItemEstoqueResposta ParaResposta(ItemEstoque i) =>
        new(i.Id, i.Nome, i.QuantidadeAtual, i.UnidadeMedida, i.Categoria, i.QuantidadeMinima);
}
