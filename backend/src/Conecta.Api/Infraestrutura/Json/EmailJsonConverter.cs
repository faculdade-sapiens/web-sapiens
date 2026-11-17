using System.Text.Json;
using System.Text.Json.Serialization;
using Conecta.Api.Dominio.Tipos;

namespace Conecta.Api.Infraestrutura.Json;

// e-mail invalido no corpo da requisicao -> 400
public sealed class EmailJsonConverter : JsonConverter<Email>
{
    public override Email Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String)
            throw new JsonException("O e-mail deve ser um texto.");

        return Email.TentarCriar(reader.GetString(), out var email, out var erro)
            ? email
            : throw new JsonException(erro);
    }

    public override void Write(Utf8JsonWriter writer, Email value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.Valor);
}
