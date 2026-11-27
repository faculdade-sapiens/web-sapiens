using Conecta.Api.Dominio.Entidades;

namespace Conecta.Api.Testes;

// RF28 e RF30: status Normal / Baixo / Esgotado e alerta de estoque baixo
public class StatusEstoqueTestes
{
    [Theory]
    [InlineData(0, 5, StatusEstoque.Esgotado)]
    [InlineData(0, 0, StatusEstoque.Esgotado)] // zerado e sempre esgotado, mesmo com minima 0
    [InlineData(1, 5, StatusEstoque.Baixo)]
    [InlineData(5, 5, StatusEstoque.Baixo)]    // RF28: "menor ou igual" a minima
    [InlineData(6, 5, StatusEstoque.Normal)]
    [InlineData(1, 0, StatusEstoque.Normal)]
    [InlineData(1_000_000, 10, StatusEstoque.Normal)]
    public void Calcular_devolve_o_status_certo(int atual, int minima, string esperado)
    {
        Assert.Equal(esperado, StatusEstoque.Calcular(atual, minima));
    }

    [Theory]
    [InlineData(0, 5, true)]
    [InlineData(0, 0, true)]
    [InlineData(5, 5, true)]
    [InlineData(4, 5, true)]
    [InlineData(6, 5, false)]
    [InlineData(1, 0, false)]
    public void TemAlerta_liga_quando_esta_baixo_ou_esgotado(int atual, int minima, bool esperado)
    {
        Assert.Equal(esperado, StatusEstoque.TemAlerta(atual, minima));
    }

    // O filtro ?status= da listagem (EstoqueEndpoints.Listar) roda no banco com esta regra.
    // Se alguem mudar Calcular sem mudar o filtro (ou o contrario), este teste avisa.
    [Fact]
    public void Calcular_bate_com_a_regra_do_filtro_da_listagem()
    {
        for (var atual = 0; atual <= 30; atual++)
        for (var minima = 0; minima <= 30; minima++)
        {
            var doFiltro = atual == 0 ? StatusEstoque.Esgotado
                : atual <= minima ? StatusEstoque.Baixo
                : StatusEstoque.Normal;

            Assert.Equal(doFiltro, StatusEstoque.Calcular(atual, minima));
        }
    }
}
