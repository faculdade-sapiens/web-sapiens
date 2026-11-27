using Conecta.Api.Dominio.Entidades;
using Conecta.Api.Dominio.Validacao;

namespace Conecta.Api.Testes;

// Validacoes de campo do modulo Estoque (Regras.cs): RF22, RF24, RF27 e RN04.
// As funcoes devolvem a mensagem de erro, ou null quando o valor esta certo.
public class RegrasEstoqueTestes
{
    // ===== Nome do item (RF22) =====

    [Theory]
    [InlineData("Ovo")]
    [InlineData("Farinha de trigo")]
    public void Nome_valido_passa(string nome)
    {
        Assert.Null(Regras.ValidarNomeItem(nome));
    }

    [Fact]
    public void Nome_vazio_e_recusado()
    {
        Assert.Equal("Informe o nome do item.", Regras.ValidarNomeItem(""));
    }

    [Theory]
    [InlineData("A")]                       // curto demais
    [InlineData("<script>")]                // caracteres proibidos
    public void Nome_invalido_e_recusado(string nome)
    {
        Assert.NotNull(Regras.ValidarNomeItem(nome));
    }

    [Fact]
    public void Nome_respeita_o_tamanho_do_banco()
    {
        Assert.Null(Regras.ValidarNomeItem(new string('a', Regras.NomeItemMaximo)));
        Assert.NotNull(Regras.ValidarNomeItem(new string('a', Regras.NomeItemMaximo + 1)));
    }

    // ===== Unidade de medida (RF22) =====

    [Theory]
    [InlineData(" KG ", "kg")]
    [InlineData("Litro", "litro")]
    [InlineData("dúzia", "dúzia")]
    [InlineData("", "unidade")]   // vazio usa o mesmo padrao do banco
    [InlineData(null, "unidade")]
    public void Unidade_valida_e_normalizada(string? entrada, string esperado)
    {
        var unidade = Regras.NormalizarUnidade(entrada, out var erro);

        Assert.Equal(esperado, unidade);
        Assert.Null(erro);
    }

    [Fact]
    public void Unidade_fora_da_lista_e_recusada()
    {
        var unidade = Regras.NormalizarUnidade("tonelada", out var erro);

        Assert.Null(unidade);
        Assert.Equal("Escolha uma unidade da lista: unidade, kg, g, litro, ml, caixa, pacote, dúzia.", erro);
    }

    // ===== Categoria (RF22, RF30) =====

    [Fact]
    public void Categoria_e_opcional()
    {
        Assert.Null(Regras.ValidarCategoriaEstoque(""));
    }

    [Fact]
    public void Categoria_respeita_o_tamanho_do_banco()
    {
        Assert.Null(Regras.ValidarCategoriaEstoque("Insumos"));
        Assert.NotNull(Regras.ValidarCategoriaEstoque(new string('a', Regras.CategoriaEstoqueMaximo + 1)));
    }

    // ===== Quantidades (RF22, RN04) =====

    [Theory]
    [InlineData(0)]
    [InlineData(50)]
    [InlineData(Regras.QuantidadeMaxima)]
    public void Quantidade_atual_valida_passa(int quantidade)
    {
        Assert.Null(Regras.ValidarQuantidadeAtual(quantidade));
    }

    [Fact]
    public void Quantidade_atual_negativa_e_recusada()
    {
        Assert.Equal("A quantidade não pode ser negativa.", Regras.ValidarQuantidadeAtual(-1));
    }

    [Fact]
    public void Quantidade_atual_acima_do_maximo_e_recusada()
    {
        // o numero e escrito fixo: no servidor (Railway) o idioma nao e pt-BR
        Assert.Equal("A quantidade pode ser no máximo 1.000.000.", Regras.ValidarQuantidadeAtual(2_000_000));
    }

    [Fact]
    public void RN04_quantidade_minima_negativa_e_recusada()
    {
        Assert.Equal("A quantidade mínima não pode ser negativa.", Regras.ValidarQuantidadeMinima(-1));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(5)]
    public void Quantidade_minima_zero_ou_positiva_passa(int quantidade)
    {
        Assert.Null(Regras.ValidarQuantidadeMinima(quantidade));
    }

    // ===== Movimentacao (RF24, RF27) =====

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    [InlineData(Regras.QuantidadeMaxima + 1)]
    public void Quantidade_da_movimentacao_invalida_e_recusada(int quantidade)
    {
        Assert.NotNull(Regras.ValidarQuantidadeMovimentacao(quantidade));
    }

    [Fact]
    public void Quantidade_da_movimentacao_zero_tem_mensagem_clara()
    {
        Assert.Equal("A quantidade precisa ser maior que zero.", Regras.ValidarQuantidadeMovimentacao(0));
    }

    [Theory]
    [InlineData("entrada", TiposMovimentacao.Entrada)]
    [InlineData("ENTRADA", TiposMovimentacao.Entrada)]
    [InlineData("saida", TiposMovimentacao.Saida)]
    [InlineData("Saída", TiposMovimentacao.Saida)]
    [InlineData(" saída ", TiposMovimentacao.Saida)]
    public void Tipo_valido_e_normalizado(string entrada, string esperado)
    {
        var tipo = Regras.NormalizarTipoMovimentacao(entrada, out var erro);

        Assert.Equal(esperado, tipo);
        Assert.Null(erro);
    }

    [Theory]
    [InlineData("troca")]
    [InlineData("")]
    [InlineData(null)]
    public void Tipo_invalido_e_recusado(string? entrada)
    {
        var tipo = Regras.NormalizarTipoMovimentacao(entrada, out var erro);

        Assert.Null(tipo);
        Assert.Equal("Escolha entrada ou saída.", erro);
    }

    [Fact]
    public void RF27_saida_sem_motivo_e_recusada()
    {
        Assert.Equal(
            "Informe o motivo da saída (perda, descarte ou ajuste).",
            Regras.ValidarMotivo(TiposMovimentacao.Saida, ""));
    }

    [Fact]
    public void Entrada_sem_motivo_passa()
    {
        Assert.Null(Regras.ValidarMotivo(TiposMovimentacao.Entrada, ""));
    }

    [Fact]
    public void Saida_com_motivo_passa()
    {
        Assert.Null(Regras.ValidarMotivo(TiposMovimentacao.Saida, "Descarte: embalagem rasgada"));
    }

    [Fact]
    public void Motivo_respeita_o_tamanho_do_banco()
    {
        Assert.Null(Regras.ValidarMotivo(TiposMovimentacao.Saida, new string('a', Regras.MotivoMaximo)));
        Assert.Equal(
            "O motivo pode ter no máximo 255 caracteres.",
            Regras.ValidarMotivo(TiposMovimentacao.Saida, new string('a', Regras.MotivoMaximo + 1)));
    }

    [Fact]
    public void Motivo_com_caracteres_proibidos_e_recusado()
    {
        Assert.NotNull(Regras.ValidarMotivo(TiposMovimentacao.Saida, "<b>perda</b>"));
    }
}
