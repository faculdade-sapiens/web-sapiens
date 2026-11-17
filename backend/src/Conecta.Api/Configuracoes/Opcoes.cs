namespace Conecta.Api.Configuracoes;

public sealed class BancoOpcoes
{
    public const string Secao = "Banco";
    public string Host { get; init; } = "";
    public int Porta { get; init; } = 5432;
    public string Database { get; init; } = "postgres";
    public string Usuario { get; init; } = "";
    public string Senha { get; init; } = "";
}

public sealed class JwtOpcoes
{
    public const string Secao = "Jwt";
    public string Secret { get; init; } = "";
    public string Issuer { get; init; } = "conecta-api";
    public string Audience { get; init; } = "conecta-web";
    public int ExpiracaoMin { get; init; } = 120;
}

public sealed class CorsOpcoes
{
    public const string Secao = "Cors";

    // separado por virgula
    public string OrigensPermitidas { get; init; } = "";

    public string[] ListaOrigens() =>
        OrigensPermitidas.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}

public sealed class AppOpcoes
{
    public const string Secao = "App";
    public string FrontendUrl { get; init; } = "";
}

public sealed class SmtpOpcoes
{
    public const string Secao = "Smtp";
    public string Host { get; init; } = "";
    public int Porta { get; init; } = 587;
    public string Usuario { get; init; } = "";
    public string Senha { get; init; } = "";
    public string Remetente { get; init; } = "";
}

public sealed class AuthOpcoes
{
    public const string Secao = "Auth";
    public int MaxTentativas { get; init; } = 5;         // RF04
    public int BloqueioMin { get; init; } = 15;          // RF04
    public int TokenRedefinicaoMin { get; init; } = 30;  // RF05
    public bool VerificarDominioEmail { get; init; } = true;
}
