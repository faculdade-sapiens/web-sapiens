namespace Conecta.Api.Servicos;

// Formato dos dados que entram e saem do modulo Estoque.
// Usados pelo EstoqueServico (regras) e pelo EstoqueEndpoints (HTTP).

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

// Filtros da listagem (RF30). Todos opcionais.
public sealed record FiltroEstoque(string? Nome, string? Categoria, string? Status);

// Por que uma operacao nao deu certo. O endpoint transforma em status HTTP.
public enum FalhaEstoque
{
    Nenhuma,        // deu certo
    Invalido,       // 400: erro de campo
    NaoEncontrado,  // 404: item nao existe ou e de outro negocio
    Conflito,       // 409: nome repetido, quantidade insuficiente ou limite
}

// Resultado de uma operacao do EstoqueServico: o valor, ou a falha com os erros por campo.
public sealed record ResultadoEstoque<T>(T? Valor, FalhaEstoque Falha, Dictionary<string, string[]>? Erros)
{
    public bool Sucesso => Falha == FalhaEstoque.Nenhuma;

    public static ResultadoEstoque<T> Ok(T valor) => new(valor, FalhaEstoque.Nenhuma, null);

    public static ResultadoEstoque<T> Invalido(Dictionary<string, string[]> erros) =>
        new(default, FalhaEstoque.Invalido, erros);

    public static ResultadoEstoque<T> Invalido(string campo, string mensagem) =>
        Invalido(new Dictionary<string, string[]> { [campo] = [mensagem] });

    public static ResultadoEstoque<T> NaoEncontrado() => new(default, FalhaEstoque.NaoEncontrado, null);

    public static ResultadoEstoque<T> Conflito(string campo, string mensagem) =>
        new(default, FalhaEstoque.Conflito, new Dictionary<string, string[]> { [campo] = [mensagem] });
}
