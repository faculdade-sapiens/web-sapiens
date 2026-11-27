using Conecta.Api.Seguranca;
using Conecta.Api.Servicos;

namespace Conecta.Api.Endpoints;

// Rotas HTTP do modulo Estoque. So cuidam de HTTP: leem o negocio e o usuario do token,
// chamam o EstoqueServico (onde ficam as regras) e transformam o resultado em resposta.
// O negocio sempre vem do token (negocio_id): nunca do corpo nem da URL.
public static class EstoqueEndpoints
{
    public static IEndpointRouteBuilder MapEstoqueEndpoints(this IEndpointRouteBuilder app)
    {
        // Gerente e Funcionario (matriz de permissoes, secao 4 dos requisitos). Token de cliente nao passa.
        var grupo = app.MapGroup("/api/estoque").RequireAuthorization("equipe");

        grupo.MapGet("/", Listar);
        grupo.MapGet("/{id:int}", Obter);
        grupo.MapPost("/", Cadastrar);
        grupo.MapPut("/{id:int}", Editar);
        // matriz de permissoes: so o Gerente exclui item de estoque
        grupo.MapDelete("/{id:int}", Excluir).RequireAuthorization("gerente");
        // matriz de permissoes: Gerente e Funcionario registram movimentacao
        grupo.MapPost("/{id:int}/movimentacoes", Movimentar);
        grupo.MapGet("/{id:int}/movimentacoes", Historico);

        return app;
    }

    // RF30
    private static async Task<IResult> Listar(
        string? nome,
        string? categoria,
        string? status,
        HttpContext http,
        EstoqueServico servico,
        CancellationToken ct)
    {
        var resultado = await servico.Listar(http.User.LerNegocioId(), new FiltroEstoque(nome, categoria, status), ct);
        return Responder(resultado, itens => Results.Ok(itens));
    }

    private static async Task<IResult> Obter(int id, HttpContext http, EstoqueServico servico, CancellationToken ct)
    {
        var resultado = await servico.Obter(http.User.LerNegocioId(), id, ct);
        return Responder(resultado, item => Results.Ok(item));
    }

    // RF22
    private static async Task<IResult> Cadastrar(
        CriarItemEstoqueRequest req,
        HttpContext http,
        EstoqueServico servico,
        CancellationToken ct)
    {
        var resultado = await servico.Cadastrar(http.User.LerNegocioId(), req, ct);
        return Responder(resultado, item => Results.Created($"/api/estoque/{item.Id}", item));
    }

    // RF23
    private static async Task<IResult> Editar(
        int id,
        EditarItemEstoqueRequest req,
        HttpContext http,
        EstoqueServico servico,
        CancellationToken ct)
    {
        var resultado = await servico.Editar(http.User.LerNegocioId(), id, req, ct);
        return Responder(resultado, item => Results.Ok(item));
    }

    // RF23 (so Gerente, pela politica na rota)
    private static async Task<IResult> Excluir(int id, HttpContext http, EstoqueServico servico, CancellationToken ct)
    {
        var resultado = await servico.Excluir(http.User.LerNegocioId(), id, ct);
        return Responder(resultado, _ => Results.NoContent());
    }

    // RF24 e RF27. O responsavel e quem esta logado; o nome vem do token.
    private static async Task<IResult> Movimentar(
        int id,
        MovimentarEstoqueRequest req,
        HttpContext http,
        EstoqueServico servico,
        CancellationToken ct)
    {
        var resultado = await servico.Movimentar(
            http.User.LerNegocioId(),
            http.User.LerUsuarioId(),
            http.User.Identity?.Name ?? "",
            id,
            req,
            ct);
        return Responder(resultado, registro => Results.Created($"/api/estoque/{id}/movimentacoes", registro));
    }

    // RF29
    private static async Task<IResult> Historico(int id, HttpContext http, EstoqueServico servico, CancellationToken ct)
    {
        var resultado = await servico.Historico(http.User.LerNegocioId(), id, ct);
        return Responder(resultado, historico => Results.Ok(historico));
    }

    // Transforma o resultado do servico na resposta HTTP. Mesmo formato de erro do AuthEndpoints.
    private static IResult Responder<T>(ResultadoEstoque<T> resultado, Func<T, IResult> sucesso) => resultado.Falha switch
    {
        FalhaEstoque.Nenhuma => sucesso(resultado.Valor!),
        FalhaEstoque.Invalido => Results.ValidationProblem(resultado.Erros!),
        FalhaEstoque.Conflito => Results.ValidationProblem(resultado.Erros!, statusCode: StatusCodes.Status409Conflict),
        // item de outro negocio tambem da 404, para nao revelar que ele existe
        _ => Results.Problem("Item não encontrado no estoque.", statusCode: StatusCodes.Status404NotFound),
    };
}
