using System.Text.Json;
using Conecta.Api.Infraestrutura.Json;
using Microsoft.AspNetCore.Diagnostics;

namespace Conecta.Api.Infraestrutura;

// Transforma erros de leitura do JSON em resposta 400 com o campo certo,
// e qualquer outro erro em 500 sem mostrar detalhe interno.
public sealed class TratadorErros(IProblemDetailsService problemDetails, ILogger<TratadorErros> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception ex, CancellationToken ct)
    {
        int status;
        object? erros = null;
        string titulo;

        if (ex is BadHttpRequestException bad)
        {
            status = bad.StatusCode == StatusCodes.Status413PayloadTooLarge ? 413 : 400;
            titulo = status == 413 ? "Dados grandes demais." : "Dados inválidos.";

            if (bad.InnerException is JsonException json)
            {
                var campo = CampoDoCaminho(json.Path);
                // so mostra a mensagem quando fomos nos que escrevemos
                var mensagem = json is CampoInvalidoException ? json.Message : "Valor inválido.";
                erros = campo is null
                    ? null
                    : new Dictionary<string, string[]> { [campo] = [mensagem] };
            }
        }
        else
        {
            logger.LogError(ex, "Erro nao tratado em {Caminho}", http.Request.Path);
            status = 500;
            titulo = "Algo deu errado. Tente de novo em instantes.";
        }

        http.Response.StatusCode = status;
        var detalhes = new Microsoft.AspNetCore.Mvc.ProblemDetails { Status = status, Title = titulo };
        if (erros is not null) detalhes.Extensions["errors"] = erros;

        return await problemDetails.TryWriteAsync(new ProblemDetailsContext { HttpContext = http, ProblemDetails = detalhes, Exception = ex });
    }

    // "$.email" -> "email"
    private static string? CampoDoCaminho(string? caminho)
    {
        if (string.IsNullOrEmpty(caminho) || caminho == "$") return null;
        var campo = caminho.TrimStart('$', '.');
        var fim = campo.IndexOfAny(['.', '[']);
        if (fim > 0) campo = campo[..fim];
        return campo.Length == 0 ? null : char.ToLowerInvariant(campo[0]) + campo[1..];
    }
}
