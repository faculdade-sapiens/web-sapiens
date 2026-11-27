using System.Threading.RateLimiting;
using Conecta.Api.Dominio.Entidades;
using Conecta.Api.Infraestrutura;
using Conecta.Api.Infraestrutura.Dados;
using Conecta.Api.Infraestrutura.ServicosEmail;
using Conecta.Api.Seguranca;
using Conecta.Api.Servicos;
using DnsClient;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;

namespace Conecta.Api.Configuracoes;

// Registro dos servicos da API, separado por assunto. O Program.cs so chama estes metodos.
// O codigo de cada metodo veio do Program.cs sem mudanca de comportamento.
public static class RegistroServicos
{
    public static IServiceCollection AddOpcoesConecta(this IServiceCollection services, IConfiguration config)
    {
        services.Configure<JwtOpcoes>(config.GetSection(JwtOpcoes.Secao));
        services.Configure<CorsOpcoes>(config.GetSection(CorsOpcoes.Secao));
        services.Configure<AppOpcoes>(config.GetSection(AppOpcoes.Secao));
        services.Configure<SmtpOpcoes>(config.GetSection(SmtpOpcoes.Secao));
        services.Configure<AuthOpcoes>(config.GetSection(AuthOpcoes.Secao));
        return services;
    }

    // banco
    public static IServiceCollection AddBancoConecta(this IServiceCollection services, IConfiguration config)
    {
        var banco = config.GetSection(BancoOpcoes.Secao).Get<BancoOpcoes>() ?? new BancoOpcoes();
        if (string.IsNullOrWhiteSpace(banco.Senha))
            throw new InvalidOperationException("Falta a senha do banco: Banco__Senha no backend/.env (local) ou em Variables (Railway).");

        var connectionString = new NpgsqlConnectionStringBuilder
        {
            Host = banco.Host,
            Port = banco.Porta,
            Database = banco.Database,
            Username = banco.Usuario,
            Password = banco.Senha,
            SslMode = SslMode.Require,
            // o Supabase nao usa Kerberos; sem isso o Npgsql tenta carregar libgssapi_krb5 no Linux e loga erro
            GssEncryptionMode = GssEncryptionMode.Disable,
        }.ConnectionString;

        services.AddDbContext<ConectaDbContext>(opcoes => opcoes
            .UseNpgsql(connectionString)
            .UseSnakeCaseNamingConvention());
        return services;
    }

    // login (JWT) e politicas de acesso
    public static IServiceCollection AddAutenticacaoConecta(this IServiceCollection services, IConfiguration config)
    {
        var jwt = config.GetSection(JwtOpcoes.Secao).Get<JwtOpcoes>() ?? new JwtOpcoes();
        if (jwt.Secret.Length < 32)
            throw new InvalidOperationException("Jwt__Secret precisa ter pelo menos 32 caracteres: backend/.env (local) ou Variables (Railway).");

        services.AddSingleton<GeradorToken>();
        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(o =>
            {
                o.MapInboundClaims = false;
                o.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = jwt.Issuer,
                    ValidAudience = jwt.Audience,
                    IssuerSigningKey = GeradorToken.Chave(jwt.Secret),
                    ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
                    ClockSkew = TimeSpan.FromSeconds(30),
                    NameClaimType = Claims.Nome,
                    RoleClaimType = Claims.Perfil,
                };
                o.Events = new JwtBearerEvents
                {
                    // o token so vale se o usuario continua ativo, no mesmo negocio e com o mesmo perfil (RF10, RNF08)
                    OnTokenValidated = async ctx =>
                    {
                        var user = ctx.Principal!;
                        if (!int.TryParse(user.FindFirst(Claims.UsuarioId)?.Value, out var id))
                        {
                            ctx.Fail("token sem usuario");
                            return;
                        }
                        var db = ctx.HttpContext.RequestServices.GetRequiredService<ConectaDbContext>();

                        // token de antes do ultimo "Sair" (sessao_versao mudou) nao vale mais (RF06)
                        var versaoToken = user.LerSessaoVersao();

                        if (user.EhCliente())
                        {
                            var cliente = await db.Clientes.AsNoTracking()
                                .Where(c => c.Id == id).Select(c => new { c.Ativo, c.SessaoVersao })
                                .FirstOrDefaultAsync(ctx.HttpContext.RequestAborted);
                            if (cliente is null || !cliente.Ativo || cliente.SessaoVersao != versaoToken
                                || user.FindFirst(Claims.NegocioId) is not null)
                                ctx.Fail("sessao invalida");
                            return;
                        }

                        var atual = await db.Usuarios.AsNoTracking()
                            .Where(u => u.Id == id)
                            .Select(u => new { u.Ativo, u.NegocioId, u.Perfil, u.SessaoVersao })
                            .FirstOrDefaultAsync(ctx.HttpContext.RequestAborted);

                        if (atual is null || !atual.Ativo || atual.SessaoVersao != versaoToken
                            || user.FindFirst(Claims.NegocioId)?.Value != atual.NegocioId.ToString()
                            || user.FindFirst(Claims.Perfil)?.Value != atual.Perfil)
                            ctx.Fail("sessao invalida");
                    },
                };
            });

        // rotas do sistema do negocio usam "equipe"; token de cliente nao passa
        services.AddAuthorizationBuilder()
            .AddPolicy("gerente", p => p.RequireClaim(Claims.Perfil, Perfis.Gerente))
            .AddPolicy("equipe", p => p.RequireClaim(Claims.Perfil, Perfis.Gerente, Perfis.Funcionario))
            .AddPolicy("cliente", p => p.RequireClaim(Claims.Perfil, Perfis.Cliente));
        return services;
    }

    // limite por IP nas rotas de login e cadastro
    public static IServiceCollection AddLimiteTentativasConecta(this IServiceCollection services, IConfiguration config)
    {
        var authOpcoes = config.GetSection(AuthOpcoes.Secao).Get<AuthOpcoes>() ?? new AuthOpcoes();
        var limitePorMinuto = authOpcoes.LimitePorMinuto;

        // No Railway todo acesso chega pelo proxy dele, entao o IP da conexao e o do proxy.
        // O IP real do cliente vem no cabecalho X-Real-IP (so configurado em producao).
        string IpDoCliente(HttpContext http)
        {
            if (!string.IsNullOrEmpty(authOpcoes.CabecalhoIp)
                && http.Request.Headers.TryGetValue(authOpcoes.CabecalhoIp, out var ip)
                && !string.IsNullOrWhiteSpace(ip))
                return ip.ToString();
            return http.Connection.RemoteIpAddress?.ToString() ?? "sem-ip";
        }

        services.AddRateLimiter(o =>
        {
            o.AddPolicy("auth", http => RateLimitPartition.GetFixedWindowLimiter(
                IpDoCliente(http),
                _ => new FixedWindowRateLimiterOptions { PermitLimit = limitePorMinuto, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
            o.OnRejected = async (ctx, ct) =>
            {
                ctx.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                await ctx.HttpContext.Response.WriteAsJsonAsync(
                    new { status = 429, title = "Muitas tentativas seguidas. Espere um minuto e tente de novo." }, ct);
            };
        });
        return services;
    }

    // servicos usados pelos endpoints
    public static IServiceCollection AddServicosConecta(this IServiceCollection services)
    {
        services.AddSingleton<IHasherSenha, HasherSenhaBcrypt>();
        services.AddSingleton<ILookupClient>(_ => new LookupClient(new LookupClientOptions { Timeout = TimeSpan.FromSeconds(3) }));
        services.AddScoped<IVerificadorEmail, VerificadorEmailDns>();
        services.AddScoped<EstoqueServico>(); // usa o DbContext, que tambem e scoped (um por requisicao)
        return services;
    }

    // erros de JSON viram 400 com o nome do campo
    public static IServiceCollection AddTratamentoErrosConecta(this IServiceCollection services)
    {
        services.Configure<RouteHandlerOptions>(o => o.ThrowOnBadRequest = true);
        services.Configure<JsonOptions>(o => o.SerializerOptions.UnmappedMemberHandling = System.Text.Json.Serialization.JsonUnmappedMemberHandling.Skip);
        services.AddProblemDetails();
        services.AddExceptionHandler<TratadorErros>();
        return services;
    }

    public static IServiceCollection AddCorsConecta(this IServiceCollection services, IConfiguration config)
    {
        var origens = config.GetSection(CorsOpcoes.Secao).Get<CorsOpcoes>()?.ListaOrigens() ?? [];
        services.AddCors(opcoes => opcoes.AddDefaultPolicy(politica => politica
            .WithOrigins(origens)
            .WithHeaders("Content-Type", "Authorization")
            .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")
            .WithExposedHeaders("X-Novo-Token")));
        return services;
    }
}
