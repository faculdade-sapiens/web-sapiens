namespace Conecta.Api.Dominio.Entidades;

// Valores aceitos pela coluna tipo (check do schema.sql).
public static class TiposMovimentacao
{
    public const string Entrada = "ENTRADA"; // RF24
    public const string Saida = "SAIDA";     // RF27, exige motivo
}

// Entrada ou saida de quantidade de um item (RF24, RF27, RF29). Tabela movimentacao_estoque.
public sealed class MovimentacaoEstoque
{
    public int Id { get; set; }
    public int ItemEstoqueId { get; set; }
    public ItemEstoque ItemEstoque { get; set; } = null!;
    public int? UsuarioId { get; set; } // null se o usuario for removido (on delete set null)
    public Usuario? Usuario { get; set; }
    public string Tipo { get; set; } = TiposMovimentacao.Entrada;
    public int Quantidade { get; set; }
    public string? Motivo { get; set; }
    public DateTime DataMovimentacao { get; set; }
}
