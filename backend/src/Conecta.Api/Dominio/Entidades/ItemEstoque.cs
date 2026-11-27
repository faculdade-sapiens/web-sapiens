namespace Conecta.Api.Dominio.Entidades;

// Item do modulo Estoque (RF22). Tabela item_estoque do docs/schema.sql.
public sealed class ItemEstoque
{
    public int Id { get; set; }
    public int NegocioId { get; set; }
    public Negocio Negocio { get; set; } = null!;
    public string Nome { get; set; } = "";
    public int QuantidadeAtual { get; set; }
    public string UnidadeMedida { get; set; } = "unidade";
    public string? Categoria { get; set; }
    public int QuantidadeMinima { get; set; }

    public List<MovimentacaoEstoque> Movimentacoes { get; set; } = [];
}
