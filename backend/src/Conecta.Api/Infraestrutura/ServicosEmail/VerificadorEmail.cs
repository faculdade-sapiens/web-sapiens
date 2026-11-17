using Conecta.Api.Configuracoes;
using Conecta.Api.Dominio.Tipos;
using DnsClient;
using Microsoft.Extensions.Options;

namespace Conecta.Api.Infraestrutura.ServicosEmail;

public enum ResultadoVerificacaoEmail
{
    DominioRecebeEmail,
    DominioNaoRecebeEmail,
    Indeterminado, // DNS fora do ar, nesse caso deixa passar
}

// Confere no DNS se o dominio do e-mail existe e recebe mensagem.
// Nao garante que a caixa existe, so o dominio.
public interface IVerificadorEmail
{
    Task<ResultadoVerificacaoEmail> VerificarDominioAsync(Email email, CancellationToken ct = default);
}

public sealed class VerificadorEmailDns(
    ILookupClient dns,
    IOptions<AuthOpcoes> opcoes,
    ILogger<VerificadorEmailDns> logger) : IVerificadorEmail
{
    public async Task<ResultadoVerificacaoEmail> VerificarDominioAsync(Email email, CancellationToken ct = default)
    {
        if (!opcoes.Value.VerificarDominioEmail)
            return ResultadoVerificacaoEmail.DominioRecebeEmail;

        try
        {
            var mx = await dns.QueryAsync(email.Dominio, QueryType.MX, cancellationToken: ct);
            if (mx.Answers.MxRecords().Any())
                return ResultadoVerificacaoEmail.DominioRecebeEmail;

            // sem MX, tenta o registro A
            var a = await dns.QueryAsync(email.Dominio, QueryType.A, cancellationToken: ct);
            return a.Answers.ARecords().Any()
                ? ResultadoVerificacaoEmail.DominioRecebeEmail
                : ResultadoVerificacaoEmail.DominioNaoRecebeEmail;
        }
        catch (DnsResponseException ex)
        {
            logger.LogWarning(ex, "Erro ao consultar DNS de {Dominio}", email.Dominio);
            return ResultadoVerificacaoEmail.Indeterminado;
        }
    }
}
