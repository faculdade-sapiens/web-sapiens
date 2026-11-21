using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;
using Conecta.Api.Infraestrutura.Json;
using EmailValidation;

namespace Conecta.Api.Dominio.Tipos;

// Tipo de e-mail, parecido com o EmailStr do Pydantic.
// Se existe um Email, ele ja foi validado.
[JsonConverter(typeof(EmailJsonConverter))]
public sealed record Email : IParsable<Email>
{
    public const int TamanhoMaximo = 255; // mesmo tamanho da coluna no banco

    public string Valor { get; }

    public string Dominio => Valor[(Valor.LastIndexOf('@') + 1)..];

    private Email(string valor) => Valor = valor;

    public static Email Criar(string? texto) =>
        TentarCriar(texto, out var email, out var erro) ? email : throw new EmailInvalidoException(erro);

    public static bool TentarCriar(
        string? texto,
        [NotNullWhen(true)] out Email? email,
        [NotNullWhen(false)] out string? erro)
    {
        email = null;

        // minusculo porque o indice do banco e em lower(email)
        var normalizado = texto?.Trim().ToLowerInvariant() ?? "";

        if (normalizado.Length == 0)
        {
            erro = "Informe o e-mail.";
            return false;
        }
        if (normalizado.Length > TamanhoMaximo)
        {
            erro = $"O e-mail pode ter no máximo {TamanhoMaximo} caracteres.";
            return false;
        }
        // nao aceita "ana@localhost", mas aceita acento
        if (!EmailValidator.Validate(normalizado, allowTopLevelDomains: false, allowInternational: true))
        {
            erro = "Esse e-mail não é válido. Confira se digitou certo.";
            return false;
        }

        email = new Email(normalizado);
        erro = null;
        return true;
    }

    // o que vem do banco ja foi validado na hora de salvar
    internal static Email DoBanco(string valor) => new(valor);

    public override string ToString() => Valor;

    public static implicit operator string(Email email) => email.Valor;

    // para poder usar Email em rota e query string
    public static Email Parse(string s, IFormatProvider? provider) => Criar(s);

    public static bool TryParse(
        [NotNullWhen(true)] string? s,
        IFormatProvider? provider,
        [MaybeNullWhen(false)] out Email result) =>
        TentarCriar(s, out result, out _);
}

public sealed class EmailInvalidoException(string mensagem) : Exception(mensagem);
