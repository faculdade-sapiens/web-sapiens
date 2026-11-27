using Conecta.Api.Dominio.Entidades;
using Conecta.Api.Dominio.Validacao;
using Conecta.Api.Infraestrutura.Dados;
using Microsoft.EntityFrameworkCore;

namespace Conecta.Api.Servicos;

// Regras de negocio do modulo Central de Controle de Estoque (RF22 a RF30).
// Nao conhece HTTP: recebe o negocio e o usuario ja lidos do token pelo EstoqueEndpoints
// e devolve um ResultadoEstoque, que o endpoint transforma em resposta.
// Toda consulta filtra pelo negocio: um item de outro negocio e tratado como inexistente.
public sealed class EstoqueServico(ConectaDbContext db)
{
    public const int LimiteListagem = 500;
    public const int LimiteHistorico = 200;
    private const string MsgNomeRepetido = "Já existe um item com esse nome no estoque.";
    private const string ResponsavelRemovido = "Usuário removido";

    // RF30: filtros por nome (parte do nome), categoria (exata) e status
    public async Task<ResultadoEstoque<List<ItemEstoqueResposta>>> Listar(int negocioId, FiltroEstoque filtro, CancellationToken ct)
    {
        var consulta = db.ItensEstoque.AsNoTracking().Where(i => i.NegocioId == negocioId);

        var nomeFiltro = Regras.LimparTexto(filtro.Nome);
        if (nomeFiltro.Length > 0)
        {
            var padrao = $"%{EscaparLike(nomeFiltro)}%";
            consulta = consulta.Where(i => EF.Functions.ILike(i.Nome, padrao, @"\"));
        }

        var categoriaFiltro = Regras.LimparTexto(filtro.Categoria).ToLower();
        if (categoriaFiltro.Length > 0)
            consulta = consulta.Where(i => i.Categoria != null && i.Categoria.ToLower() == categoriaFiltro);

        // Filtro feito no banco com a mesma regra de StatusEstoque.Calcular:
        // Esgotado: zerado. Baixo: acima de zero e ate a minima (RF28). Normal: acima da minima.
        switch (Regras.LimparTexto(filtro.Status).ToUpperInvariant())
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
                return ResultadoEstoque<List<ItemEstoqueResposta>>.Invalido(
                    "status", "Escolha um status: normal, baixo ou esgotado.");
        }

        var itens = await consulta
            .OrderBy(i => i.Nome)
            .Take(LimiteListagem)
            .ToListAsync(ct);

        return ResultadoEstoque<List<ItemEstoqueResposta>>.Ok(itens.Select(ParaResposta).ToList());
    }

    public async Task<ResultadoEstoque<ItemEstoqueResposta>> Obter(int negocioId, int id, CancellationToken ct)
    {
        var item = await db.ItensEstoque.AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == id && i.NegocioId == negocioId, ct);

        // item de outro negocio tambem da "nao encontrado", para nao revelar que ele existe
        return item is null
            ? ResultadoEstoque<ItemEstoqueResposta>.NaoEncontrado()
            : ResultadoEstoque<ItemEstoqueResposta>.Ok(ParaResposta(item));
    }

    // RF22
    public async Task<ResultadoEstoque<ItemEstoqueResposta>> Cadastrar(int negocioId, CriarItemEstoqueRequest req, CancellationToken ct)
    {
        var erros = new Dictionary<string, string[]>();
        var campos = ValidarCampos(req.Nome, req.UnidadeMedida, req.Categoria, req.QuantidadeMinima, erros);

        // sem valor = 0, igual ao default do banco
        var quantidadeAtual = req.QuantidadeAtual ?? 0;
        var erroQuantidade = Regras.ValidarQuantidadeAtual(quantidadeAtual);
        if (erroQuantidade is not null) erros["quantidadeAtual"] = [erroQuantidade];

        if (erros.Count > 0) return ResultadoEstoque<ItemEstoqueResposta>.Invalido(erros);

        if (await NomeEmUso(negocioId, campos.Nome, ignorarId: null, ct))
            return ResultadoEstoque<ItemEstoqueResposta>.Conflito("nome", MsgNomeRepetido);

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

        return ResultadoEstoque<ItemEstoqueResposta>.Ok(ParaResposta(item));
    }

    // RF23: edicao. Envia o item inteiro (como no cadastro); campo vazio volta ao padrao.
    public async Task<ResultadoEstoque<ItemEstoqueResposta>> Editar(int negocioId, int id, EditarItemEstoqueRequest req, CancellationToken ct)
    {
        var erros = new Dictionary<string, string[]>();
        var campos = ValidarCampos(req.Nome, req.UnidadeMedida, req.Categoria, req.QuantidadeMinima, erros);
        if (erros.Count > 0) return ResultadoEstoque<ItemEstoqueResposta>.Invalido(erros);

        var item = await db.ItensEstoque.FirstOrDefaultAsync(i => i.Id == id && i.NegocioId == negocioId, ct);
        if (item is null) return ResultadoEstoque<ItemEstoqueResposta>.NaoEncontrado();

        // o proprio item pode manter o nome (ou so mudar maiusculas)
        if (await NomeEmUso(negocioId, campos.Nome, ignorarId: item.Id, ct))
            return ResultadoEstoque<ItemEstoqueResposta>.Conflito("nome", MsgNomeRepetido);

        item.Nome = campos.Nome;
        item.UnidadeMedida = campos.Unidade;
        item.Categoria = campos.Categoria;
        item.QuantidadeMinima = campos.QuantidadeMinima;
        await db.SaveChangesAsync(ct);

        return ResultadoEstoque<ItemEstoqueResposta>.Ok(ParaResposta(item));
    }

    // RF23: exclusao (a permissao de Gerente fica no endpoint). As movimentacoes do item caem
    // junto (on delete cascade) e um item de venda ligado fica sem ligacao (on delete set null).
    public async Task<ResultadoEstoque<bool>> Excluir(int negocioId, int id, CancellationToken ct)
    {
        var apagados = await db.ItensEstoque
            .Where(i => i.Id == id && i.NegocioId == negocioId)
            .ExecuteDeleteAsync(ct);

        return apagados == 0
            ? ResultadoEstoque<bool>.NaoEncontrado()
            : ResultadoEstoque<bool>.Ok(true);
    }

    // RF24 (entrada) e RF27 (saida, com motivo obrigatorio).
    // A quantidade muda e a movimentacao e gravada na mesma transacao: ou as duas acontecem, ou nenhuma.
    public async Task<ResultadoEstoque<MovimentacaoRegistradaResposta>> Movimentar(
        int negocioId,
        int usuarioId,
        string nomeUsuario,
        int id,
        MovimentarEstoqueRequest req,
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

        if (erros.Count > 0) return ResultadoEstoque<MovimentacaoRegistradaResposta>.Invalido(erros);

        var quantidade = req.Quantidade!.Value;

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
            // nada mudou: ou o item nao existe (ou e de outro negocio), ou a quantidade nao permite.
            // A transacao e desfeita ao sair (await using sem Commit).
            var disponivel = await doItem.Select(i => (int?)i.QuantidadeAtual).FirstOrDefaultAsync(ct);
            if (disponivel is null) return ResultadoEstoque<MovimentacaoRegistradaResposta>.NaoEncontrado();

            var mensagem = tipo == TiposMovimentacao.Saida
                ? $"Não há quantidade suficiente em estoque. Disponível agora: {disponivel}."
                : "Essa entrada passaria do limite máximo do estoque.";
            return ResultadoEstoque<MovimentacaoRegistradaResposta>.Conflito("quantidade", mensagem);
        }

        var movimentacao = new MovimentacaoEstoque
        {
            ItemEstoqueId = id,
            UsuarioId = usuarioId, // responsavel pela acao (RF29)
            Tipo = tipo!,
            Quantidade = quantidade,
            Motivo = motivo.Length == 0 ? null : motivo,
            DataMovimentacao = DateTime.UtcNow, // data do servidor: ninguem registra com data falsa
        };
        db.MovimentacoesEstoque.Add(movimentacao);
        await db.SaveChangesAsync(ct);

        var item = await doItem.AsNoTracking().FirstAsync(ct);
        await transacao.CommitAsync(ct);

        return ResultadoEstoque<MovimentacaoRegistradaResposta>.Ok(
            new MovimentacaoRegistradaResposta(ParaResposta(item), ParaResposta(movimentacao, nomeUsuario)));
    }

    // RF29: historico do item, da mais recente para a mais antiga
    public async Task<ResultadoEstoque<List<MovimentacaoResposta>>> Historico(int negocioId, int id, CancellationToken ct)
    {
        // a movimentacao nao tem negocio_id: o dono e conferido pelo item
        var itemExiste = await db.ItensEstoque.AnyAsync(i => i.Id == id && i.NegocioId == negocioId, ct);
        if (!itemExiste) return ResultadoEstoque<List<MovimentacaoResposta>>.NaoEncontrado();

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
        var historico = linhas
            .Select(m => new MovimentacaoResposta(
                m.Id, m.Tipo, m.Quantidade, m.Motivo, m.DataMovimentacao, m.NomeUsuario ?? ResponsavelRemovido))
            .ToList();

        return ResultadoEstoque<List<MovimentacaoResposta>>.Ok(historico);
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

    private Task<bool> NomeEmUso(int negocioId, string nome, int? ignorarId, CancellationToken ct)
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

    private static ItemEstoqueResposta ParaResposta(ItemEstoque i) =>
        new(i.Id, i.Nome, i.QuantidadeAtual, i.UnidadeMedida, i.Categoria, i.QuantidadeMinima,
            StatusEstoque.Calcular(i.QuantidadeAtual, i.QuantidadeMinima),
            StatusEstoque.TemAlerta(i.QuantidadeAtual, i.QuantidadeMinima));

    private static MovimentacaoResposta ParaResposta(MovimentacaoEstoque m, string responsavel) =>
        new(m.Id, m.Tipo, m.Quantidade, m.Motivo, m.DataMovimentacao, responsavel);
}
