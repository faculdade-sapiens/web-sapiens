using System.Threading.RateLimiting;
using Conecta.Api.Configuracoes;
using Conecta.Api.Dominio.Entidades;
using Conecta.Api.Endpoints;
using Conecta.Api.Infraestrutura;
using Conecta.Api.Infraestrutura.Dados;
using Conecta.Api.Infraestrutura.ServicosEmail;
using Conecta.Api.Seguranca;
using DnsClient;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Npgsql;

// le o backend/.env; no Railway as variaveis ja existem e nao sao sobrescritas
DotNetEnv.Env.NoClobber().TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

// porta do Railway
var porta = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(porta))
    builder.WebHost.UseUrls($"http://0.0.0.0:{porta}");

// nenhuma rota precisa receber mais que isso por enquanto
builder.WebHost.ConfigureKestrel(k => k.Limits.MaxRequestBodySize = 64 * 1024);

builder.Services.Configure<JwtOpcoes>(builder.Configuration.GetSection(JwtOpcoes.Secao));
builder.Services.Configure<CorsOpcoes>(builder.Configuration.GetSection(CorsOpcoes.Secao));
builder.Services.Configure<AppOpcoes>(builder.Configuration.GetSection(AppOpcoes.Secao));
builder.Services.Configure<SmtpOpcoes>(builder.Configuration.GetSection(SmtpOpcoes.Secao));
builder.Services.Configure<AuthOpcoes>(builder.Configuration.GetSection(AuthOpcoes.Secao));

// banco
var banco = builder.Configuration.GetSection(BancoOpcoes.Secao).Get<BancoOpcoes>() ?? new BancoOpcoes();
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

builder.Services.AddDbContext<ConectaDbContext>(opcoes => opcoes
    .UseNpgsql(connectionString)
    .UseSnakeCaseNamingConvention());

// login (JWT)
var jwt = builder.Configuration.GetSection(JwtOpcoes.Secao).Get<JwtOpcoes>() ?? new JwtOpcoes();
if (jwt.Secret.Length < 32)
    throw new InvalidOperationException("Jwt__Secret precisa ter pelo menos 32 caracteres: backend/.env (local) ou Variables (Railway).");

builder.Services.AddSingleton<GeradorToken>();
builder.Services
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
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("gerente", p => p.RequireClaim(Claims.Perfil, Perfis.Gerente))
    .AddPolicy("equipe", p => p.RequireClaim(Claims.Perfil, Perfis.Gerente, Perfis.Funcionario))
    .AddPolicy("cliente", p => p.RequireClaim(Claims.Perfil, Perfis.Cliente));

// limite por IP nas rotas de login e cadastro
var authOpcoes = builder.Configuration.GetSection(AuthOpcoes.Secao).Get<AuthOpcoes>() ?? new AuthOpcoes();
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

builder.Services.AddRateLimiter(o =>
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

builder.Services.AddSingleton<IHasherSenha, HasherSenhaBcrypt>();
builder.Services.AddSingleton<ILookupClient>(_ => new LookupClient(new LookupClientOptions { Timeout = TimeSpan.FromSeconds(3) }));
builder.Services.AddScoped<IVerificadorEmail, VerificadorEmailDns>();

// erros de JSON viram 400 com o nome do campo
builder.Services.Configure<RouteHandlerOptions>(o => o.ThrowOnBadRequest = true);
builder.Services.Configure<JsonOptions>(o => o.SerializerOptions.UnmappedMemberHandling = System.Text.Json.Serialization.JsonUnmappedMemberHandling.Skip);
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<TratadorErros>();

var origens = builder.Configuration.GetSection(CorsOpcoes.Secao).Get<CorsOpcoes>()?.ListaOrigens() ?? [];
builder.Services.AddCors(opcoes => opcoes.AddDefaultPolicy(politica => politica
    .WithOrigins(origens)
    .WithHeaders("Content-Type", "Authorization")
    .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")
    .WithExposedHeaders("X-Novo-Token")));

builder.Services.AddOpenApi();

var app = builder.Build();

app.UseExceptionHandler();

// no Railway o HTTPS fica no proxy; isso so repassa que a requisicao original era https
if (!app.Environment.IsDevelopment())
{
    var cabecalhos = new ForwardedHeadersOptions { ForwardedHeaders = ForwardedHeaders.XForwardedProto };
    cabecalhos.KnownIPNetworks.Clear();
    cabecalhos.KnownProxies.Clear();
    app.UseForwardedHeaders(cabecalhos);
    app.UseHsts();
}
else
{
    app.MapOpenApi();
}

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// RNF09: o token vale 30 min; se a pessoa continua usando, manda um novo no cabecalho
app.Use(async (http, next) =>
{
    var validadeMin = http.RequestServices.GetRequiredService<IOptions<JwtOpcoes>>().Value.ExpiracaoMin;
    if (http.User.Identity?.IsAuthenticated == true
        && long.TryParse(http.User.FindFirst("exp")?.Value, out var exp)
        && DateTimeOffset.FromUnixTimeSeconds(exp) - DateTimeOffset.UtcNow < TimeSpan.FromMinutes(validadeMin / 2.0))
    {
        var gerador = http.RequestServices.GetRequiredService<GeradorToken>();
        http.Response.Headers["X-Novo-Token"] = gerador.Renovar(http.User).Token;
    }
    await next();
});

app.MapSaudeEndpoints();
app.MapAuthEndpoints();

app.Run();
