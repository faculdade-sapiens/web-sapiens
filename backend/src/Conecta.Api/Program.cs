using Conecta.Api.Configuracoes;
using Conecta.Api.Endpoints;
using Conecta.Api.Seguranca;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Options;

// le o backend/.env; no Railway as variaveis ja existem e nao sao sobrescritas
DotNetEnv.Env.NoClobber().TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

// porta do Railway
var porta = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(porta))
    builder.WebHost.UseUrls($"http://0.0.0.0:{porta}");

// nenhuma rota precisa receber mais que isso por enquanto
builder.WebHost.ConfigureKestrel(k => k.Limits.MaxRequestBodySize = 64 * 1024);

// servicos (cada metodo fica em Configuracoes/RegistroServicos.cs)
builder.Services
    .AddOpcoesConecta(builder.Configuration)
    .AddBancoConecta(builder.Configuration)            // falha ao iniciar se faltar Banco__Senha
    .AddAutenticacaoConecta(builder.Configuration)     // falha ao iniciar se Jwt__Secret tiver menos de 32 caracteres
    .AddLimiteTentativasConecta(builder.Configuration)
    .AddServicosConecta()
    .AddTratamentoErrosConecta()
    .AddCorsConecta(builder.Configuration)
    .AddOpenApi();

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
app.MapEstoqueEndpoints();

app.Run();
