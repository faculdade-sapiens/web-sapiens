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

// A quantidade atual nao entra aqui: ela so muda por entrada ou saida (RF24, RF27),
// para todo ajuste ficar no historico (RF29).
public sealed record EditarItemEstoqueRequest(
    string? Nome,
    string? UnidadeMedida,
    string? Categoria,
    int? QuantidadeMinima);

// RF24 (entrada) e RF27 (saida). A data e o responsavel vem do servidor, nao do corpo.
public sealed record MovimentarEstoqueRequest(
    string? Tipo,
    int? Quantidade,
    string? Motivo);

// Status: NORMAL, BAIXO ou ESGOTADO. Alerta: true quando BAIXO ou ESGOTADO (RF28).
public sealed record ItemEstoqueResposta(
    int Id,
    string Nome,
    int QuantidadeAtual,
    string UnidadeMedida,
    string? Categoria,
    int QuantidadeMinima,
    string Status,
    bool Alerta);

// RF29: data, tipo, quantidade e responsavel pela acao
public sealed record MovimentacaoResposta(
    int Id,
    string Tipo,
    int Quantidade,
    string? Motivo,
    DateTime DataMovimentacao,
    string Responsavel);

public sealed record MovimentacaoRegistradaResposta(
    ItemEstoqueResposta Item,
    MovimentacaoResposta Movimentacao);

// Modulo Central de Controle de Estoque (RF22 a RF30).
// O negocio sempre vem do token (negocio_id): nunca do corpo nem da URL.
public static class EstoqueEndpoints
{
    private const int LimiteListagem = 500;
    private const int LimiteHistorico = 200;
    private const string MsgNomeRepetido = "Já existe um item com esse nome no estoque.";
    private const string ResponsavelRemovido = "Usuário removido";

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

    // RF22
    private static async Task<IResult> Cadastrar(
        CriarItemEstoqueRequest req,
        HttpContext http,
        ConectaDbContext db,
        CancellationToken ct)
    {
        var erros = new Dictionary<string, string[]>();
        var campos = ValidarCampos(req.Nome, req.UnidadeMedida, req.Categoria, req.QuantidadeMinima, erros);

        // sem valor = 0, igual ao default do banco
        var quantidadeAtual = req.QuantidadeAtual ?? 0;
        var erroQuantidade = Regras.ValidarQuantidadeAtual(quantidadeAtual);
        if (erroQuantidade is not null) erros["quantidadeAtual"] = [erroQuantidade];

        if (erros.Count > 0) return Results.ValidationProblem(erros);

        var negocioId = http.User.LerNegocioId();
        if (await NomeEmUso(db, negocioId, campos.Nome, ignorarId: null, ct))
            return NomeRepetido();

        var item = new ItemEstoque
        {
            NegocioId = negocioId,
            Nome = campos.Nome,
            QuantidadeAtual = quantidadeAtual,
            UnidadeMedida = campos.Unidade,
            Categoria = campos.Categoria,
            QuantidadeMinima = campos.QuantidadeMinima,
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

        // Filtro feito no banco com a mesma regra de StatusEstoque.Calcular:
        // Esgotado: zerado. Baixo: acima de zero e ate a minima (RF28). Normal: acima da minima.
        switch (Regras.LimparTexto(status).ToUpperInvariant())
        {
            case "":
                break;
            case StatusEstoque.Esgotado:
                consulta = consulta.Where(i => i.QuantidadeAtual == 0);
                break;
            case StatusEstoque.Baixo:
                consulta = consulta.Where(i => i.QuantidadeAtual > 0 && i.QuantidadeAtual <= i.QuantidadeMinima);
                break;
            case StatusEstoque.Normal:
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
            .ToListAsync(ct);

        return Results.Ok(itens.Select(ParaResposta));
    }

    private static async Task<IResult> Obter(int id, HttpContext http, ConectaDbContext db, CancellationToken ct)
    {
        var negocioId = http.User.LerNegocioId();
        var item = await db.ItensEstoque.AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == id && i.NegocioId == negocioId, ct);

        // item de outro negocio tambem da 404, para nao revelar que ele existe
        return item is null ? ItemNaoEncontrado() : Results.Ok(ParaResposta(item));
    }

    // RF23: edicao. Envia o item inteiro (como no cadastro); campo vazio volta ao padrao.
    private static async Task<IResult> Editar(
        int id,
        EditarItemEstoqueRequest req,
        HttpContext http,
        ConectaDbContext db,
        CancellationToken ct)
    {
        var erros = new Dictionary<string, string[]>();
        var campos = ValidarCampos(req.Nome, req.UnidadeMedida, req.Categoria, req.QuantidadeMinima, erros);
        if (erros.Count > 0) return Results.ValidationProblem(erros);

        var negocioId = http.User.LerNegocioId();
        var item = await db.ItensEstoque.FirstOrDefaultAsync(i => i.Id == id && i.NegocioId == negocioId, ct);
        if (item is null) return ItemNaoEncontrado();

        // o proprio item pode manter o nome (ou so mudar maiusculas)
        if (await NomeEmUso(db, negocioId, campos.Nome, ignorarId: item.Id, ct))
            return NomeRepetido();

        item.Nome = campos.Nome;
        item.UnidadeMedida = campos.Unidade;
        item.Categoria = campos.Categoria;
        item.QuantidadeMinima = campos.QuantidadeMinima;
        await db.SaveChangesAsync(ct);

        return Results.Ok(ParaResposta(item));
    }

    // RF23: exclusao, so Gerente. As movimentacoes do item caem junto (on delete cascade)
    // e um item de venda ligado a ele fica sem ligacao (on delete set null), pelo schema.sql.
    private static async Task<IResult> Excluir(int id, HttpContext http, ConectaDbContext db, CancellationToken ct)
    {
        var negocioId = http.User.LerNegocioId();
        var apagados = await db.ItensEstoque
            .Where(i => i.Id == id && i.NegocioId == negocioId)
            .ExecuteDeleteAsync(ct);

        return apagados == 0 ? ItemNaoEncontrado() : Results.NoContent();
    }

    // RF24 (entrada) e RF27 (saida, com motivo obrigatorio).
    // A quantidade muda e a movimentacao e gravada na mesma transacao: ou as duas acontecem, ou nenhuma.
    private static async Task<IResult> Movimentar(
        int id,
        MovimentarEstoqueRequest req,
        HttpContext http,
        ConectaDbContext db,
        CancellationToken ct)
    {
        var erros = new Dictionary<string, string[]>();
        void Erro(string campo, string? msg) { if (msg is not null) erros[campo] = [msg]; }

        var tipo = Regras.NormalizarTipoMovimentacao(req.Tipo, out var erroTipo);
        Erro("tipo", erroTipo);

        if (req.Quantidade is null) Erro("quantidade", "Informe a quantidade.");
        else Erro("quantidade", Regras.ValidarQuantidadeMovimentacao(req.Quantidade.Value));

        // sem tipo valido nao da para saber se o motivo e obrigatorio
        var motivo = Regras.LimparTexto(req.Motivo);
        if (tipo is not null) Erro("motivo", Regras.ValidarMotivo(tipo, motivo));

        if (erros.Count > 0) return Results.ValidationProblem(erros);

        var quantidade = req.Quantidade!.Value;
        var negocioId = http.User.LerNegocioId();

        await using var transacao = await db.Database.BeginTransactionAsync(ct);

        // Atualiza direto no banco, com a condicao no WHERE: se duas pessoas tirarem do mesmo
        // item ao mesmo tempo, a segunda ve o valor ja atualizado e nunca deixa o estoque negativo.
        var doItem = db.ItensEstoque.Where(i => i.Id == id && i.NegocioId == negocioId);
        var alterados = tipo == TiposMovimentacao.Saida
            ? await doItem
                .Where(i => i.QuantidadeAtual >= quantidade)
                .ExecuteUpdateAsync(s => s.SetProperty(i => i.QuantidadeAtual, i => i.QuantidadeAtual - quantidade), ct)
            : await doItem
                .Where(i => i.QuantidadeAtual <= Regras.QuantidadeMaxima - quantidade)
                .ExecuteUpdateAsync(s => s.SetProperty(i => i.QuantidadeAtual, i => i.QuantidadeAtual + quantidade), ct);

        if (alterados == 0)
        {
            // nada mudou: ou o item nao existe (ou e de outro negocio), ou a quantidade nao permite
            var disponivel = await doItem.Select(i => (int?)i.QuantidadeAtual).FirstOrDefaultAsync(ct);
            if (disponivel is null) return ItemNaoEncontrado();

            var mensagem = tipo == TiposMovimentacao.Saida
                ? $"Não há quantidade suficiente em estoque. Disponível agora: {disponivel}."
                : "Essa entrada passaria do limite máximo do estoque.";
            return Results.ValidationProblem(
                new Dictionary<string, string[]> { ["quantidade"] = [mensagem] },
                statusCode: StatusCodes.Status409Conflict);
        }

        var movimentacao = new MovimentacaoEstoque
        {
            ItemEstoqueId = id,
            UsuarioId = http.User.LerUsuarioId(), // responsavel pela acao (RF29)
            Tipo = tipo!,
            Quantidade = quantidade,
            Motivo = motivo.Length == 0 ? null : motivo,
            DataMovimentacao = DateTime.UtcNow, // data do servidor: ninguem registra com data falsa
        };
        db.MovimentacoesEstoque.Add(movimentacao);
        await db.SaveChangesAsync(ct);

        var item = await doItem.AsNoTracking().FirstAsync(ct);
        await transacao.CommitAsync(ct);

        // o nome vem do token (o mesmo usuario que acabou de registrar)
        var responsavel = http.User.Identity?.Name ?? "";
        return Results.Created(
            $"/api/estoque/{id}/movimentacoes",
            new MovimentacaoRegistradaResposta(ParaResposta(item), ParaResposta(movimentacao, responsavel)));
    }

    // RF29: historico do item, da mais recente para a mais antiga
    private static async Task<IResult> Historico(int id, HttpContext http, ConectaDbContext db, CancellationToken ct)
    {
        var negocioId = http.User.LerNegocioId();

        // a movimentacao nao tem negocio_id: o dono e conferido pelo item
        var itemExiste = await db.ItensEstoque.AnyAsync(i => i.Id == id && i.NegocioId == negocioId, ct);
        if (!itemExiste) return ItemNaoEncontrado();

        var linhas = await db.MovimentacoesEstoque.AsNoTracking()
            .Where(m => m.ItemEstoqueId == id)
            .OrderByDescending(m => m.DataMovimentacao)
            .ThenByDescending(m => m.Id)
            .Take(LimiteHistorico)
            .Select(m => new
            {
                m.Id,
                m.Tipo,
                m.Quantidade,
                m.Motivo,
                m.DataMovimentacao,
                NomeUsuario = m.Usuario != null ? m.Usuario.Nome : null,
            })
            .ToListAsync(ct);

        // usuario_id vira null se a conta for apagada (on delete set null)
        var historico = linhas.Select(m => new MovimentacaoResposta(
            m.Id, m.Tipo, m.Quantidade, m.Motivo, m.DataMovimentacao, m.NomeUsuario ?? ResponsavelRemovido));

        return Results.Ok(historico);
    }

    // Campos comuns do cadastro e da edicao. Os erros vao para o dicionario, um por campo.
    private static CamposItem ValidarCampos(
        string? nomeBruto,
        string? unidadeBruta,
        string? categoriaBruta,
        int? quantidadeMinimaBruta,
        Dictionary<string, string[]> erros)
    {
        void Erro(string campo, string? msg) { if (msg is not null) erros[campo] = [msg]; }

        var nome = Regras.LimparTexto(nomeBruto);
        Erro("nome", Regras.ValidarNomeItem(nome));

        var unidade = Regras.NormalizarUnidade(unidadeBruta, out var erroUnidade);
        Erro("unidadeMedida", erroUnidade);

        var categoria = Regras.LimparTexto(categoriaBruta);
        Erro("categoria", Regras.ValidarCategoriaEstoque(categoria));

        // sem valor = 0, igual ao default do banco
        var quantidadeMinima = quantidadeMinimaBruta ?? 0;
        Erro("quantidadeMinima", Regras.ValidarQuantidadeMinima(quantidadeMinima)); // RN04

        return new CamposItem(nome, unidade ?? "", categoria.Length == 0 ? null : categoria, quantidadeMinima);
    }

    private sealed record CamposItem(string Nome, string Unidade, string? Categoria, int QuantidadeMinima);

    private static Task<bool> NomeEmUso(ConectaDbContext db, int negocioId, string nome, int? ignorarId, CancellationToken ct)
    {
        var nomeMinusculo = nome.ToLower();
        return db.ItensEstoque.AnyAsync(i =>
            i.NegocioId == negocioId
            && i.Nome.ToLower() == nomeMinusculo
            && (ignorarId == null || i.Id != ignorarId), ct);
    }

    // % e _ sao curingas no ILIKE. A barra e o escape, passado explicitamente no ILike:
    // sem ele o Npgsql gera ESCAPE '' e a busca por "50%" nao funcionaria.
    private static string EscaparLike(string texto) =>
        texto.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_");

    private static IResult NomeRepetido() =>
        Results.ValidationProblem(
            new Dictionary<string, string[]> { ["nome"] = [MsgNomeRepetido] },
            statusCode: StatusCodes.Status409Conflict);

    private static IResult ItemNaoEncontrado() =>
        Results.Problem("Item não encontrado no estoque.", statusCode: StatusCodes.Status404NotFound);

    private static ItemEstoqueResposta ParaResposta(ItemEstoque i) =>
        new(i.Id, i.Nome, i.QuantidadeAtual, i.UnidadeMedida, i.Categoria, i.QuantidadeMinima,
            StatusEstoque.Calcular(i.QuantidadeAtual, i.QuantidadeMinima),
            StatusEstoque.TemAlerta(i.QuantidadeAtual, i.QuantidadeMinima));

    private static MovimentacaoResposta ParaResposta(MovimentacaoEstoque m, string responsavel) =>
        new(m.Id, m.Tipo, m.Quantidade, m.Motivo, m.DataMovimentacao, responsavel);
}
