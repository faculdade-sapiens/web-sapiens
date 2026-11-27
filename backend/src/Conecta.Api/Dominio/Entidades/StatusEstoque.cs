namespace Conecta.Api.Dominio.Entidades;

// Status de um item de estoque (RF28, RF30). Nao e gravado no banco: sai da quantidade atual e da minima.
// Mesma regra de estoqueStatusInfo (frontend/js/components.js) e do filtro de status da listagem.
public static class StatusEstoque
{
    public const string Normal = "NORMAL";
    public const string Baixo = "BAIXO";
    public const string Esgotado = "ESGOTADO";

    public static string Calcular(int quantidadeAtual, int quantidadeMinima)
    {
        if (quantidadeAtual <= 0) return Esgotado;
        if (quantidadeAtual <= quantidadeMinima) return Baixo; // RF28: "menor ou igual" a minima
        return Normal;
    }

    // RF28: alerta visual quando a quantidade esta menor ou igual a minima (inclui esgotado)
    public static bool TemAlerta(int quantidadeAtual, int quantidadeMinima) =>
        Calcular(quantidadeAtual, quantidadeMinima) != Normal;
}
