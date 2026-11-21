using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Conecta.Api.Dominio.Validacao;

// Regras de campo usadas pela API. O frontend tem uma copia em js/validacao.js,
// mas quem decide e sempre o servidor.
public static partial class Regras
{
    public const int SenhaMinimo = 8;
    public const int SenhaMaximoBytes = 72; // limite do bcrypt

    public static readonly string[] Categorias =
        ["Restaurante", "Lanchonete", "Mercadinho", "Loja", "Salão / Barbearia", "Prestador de serviço", "Outro"];

    // tira espacos das pontas e junta espacos repetidos
    public static string LimparTexto(string? texto) =>
        EspacosRepetidos().Replace(texto?.Trim() ?? "", " ");

    public static string? ValidarNome(string nome, string rotulo, int max = 120)
    {
        if (nome.Length == 0) return $"Informe {rotulo}.";
        if (nome.Length < 2) return $"{Primeira(rotulo)} está muito curto.";
        if (nome.Length > max) return $"{Primeira(rotulo)} pode ter no máximo {max} caracteres.";
        if (nome.Any(char.IsControl) || nome.IndexOfAny(['<', '>']) >= 0)
            return $"{Primeira(rotulo)} tem caracteres que não são permitidos.";
        return null;
    }

    public static string? ValidarSenha(string? senha)
    {
        if (string.IsNullOrEmpty(senha)) return "Informe uma senha.";
        if (senha.Length < SenhaMinimo) return $"A senha precisa ter pelo menos {SenhaMinimo} caracteres.";
        if (Encoding.UTF8.GetByteCount(senha) > SenhaMaximoBytes) return "A senha está muito longa.";
        if (!senha.Any(char.IsLetter) || !senha.Any(char.IsDigit))
            return "A senha precisa ter letras e números.";
        return null;
    }

    // guarda so os numeros: 10 (fixo) ou 11 (celular) digitos com DDD
    public static string? NormalizarTelefone(string? telefone, out string? erro)
    {
        erro = null;
        var digitos = new string((telefone ?? "").Where(char.IsAsciiDigit).ToArray());
        if (digitos.Length == 0)
        {
            if (!string.IsNullOrWhiteSpace(telefone)) erro = "Telefone inválido. Use o formato (00) 00000-0000.";
            return null;
        }
        if (digitos.Length is not (10 or 11) || digitos[0] == '0')
        {
            erro = "Telefone inválido. Use o formato (00) 00000-0000.";
            return null;
        }
        return digitos;
    }

    // Aceita o CNPJ numerico e o alfanumerico (novos CNPJs a partir de julho/2026).
    // Guarda sem mascara, em maiusculas.
    public static string? NormalizarCnpj(string? cnpj, out string? erro)
    {
        erro = null;
        if (string.IsNullOrWhiteSpace(cnpj)) return null;

        var valor = cnpj.Trim().ToUpperInvariant().Replace(".", "").Replace("/", "").Replace("-", "").Replace(" ", "");
        if (!CnpjFormato().IsMatch(valor) || valor.Distinct().Count() == 1 || !DigitosCnpjOk(valor))
        {
            erro = "CNPJ inválido. Confira os números.";
            return null;
        }
        return valor;
    }

    private static bool DigitosCnpjOk(string cnpj)
    {
        static int Digito(string baseCnpj)
        {
            int[] pesos = baseCnpj.Length == 12
                ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
                : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
            var soma = 0;
            for (var i = 0; i < baseCnpj.Length; i++)
                soma += (baseCnpj[i] - '0') * pesos[i]; // letra vale (codigo ASCII - 48)
            var resto = soma % 11;
            return resto < 2 ? 0 : 11 - resto;
        }

        var dv1 = Digito(cnpj[..12]);
        var dv2 = Digito(cnpj[..12] + dv1);
        return cnpj[12] - '0' == dv1 && cnpj[13] - '0' == dv2;
    }

    // "Padaria São João" -> "padaria-sao-joao"
    public static string GerarSlug(string nome)
    {
        var semAcento = new string(nome.Normalize(NormalizationForm.FormD)
            .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            .ToArray()).ToLowerInvariant();

        var slug = ForaDoSlug().Replace(semAcento, "-").Trim('-');
        if (slug.Length > 50) slug = slug[..50].Trim('-');
        return slug.Length == 0 ? "negocio" : slug;
    }

    private static string Primeira(string texto) => char.ToUpperInvariant(texto[0]) + texto[1..];

    [GeneratedRegex(@"\s+")]
    private static partial Regex EspacosRepetidos();

    [GeneratedRegex("^[0-9A-Z]{12}[0-9]{2}$")]
    private static partial Regex CnpjFormato();

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex ForaDoSlug();
}
