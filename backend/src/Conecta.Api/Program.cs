using Conecta.Api.Configuracoes;
using Conecta.Api.Endpoints;
using Conecta.Api.Infraestrutura.Dados;
using Conecta.Api.Infraestrutura.ServicosEmail;
using Conecta.Api.Seguranca;
using DnsClient;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Npgsql;

// le o backend/.env; no Railway as variaveis ja existem e nao sao sobrescritas
DotNetEnv.Env.NoClobber().TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

// porta do Railway
var porta = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(porta))
    builder.WebHost.UseUrls($"http://0.0.0.0:{porta}");

builder.Services.Configure<JwtOpcoes>(builder.Configuration.GetSection(JwtOpcoes.Secao));
builder.Services.Configure<CorsOpcoes>(builder.Configuration.GetSection(CorsOpcoes.Secao));
builder.Services.Configure<AppOpcoes>(builder.Configuration.GetSection(AppOpcoes.Secao));
builder.Services.Configure<SmtpOpcoes>(builder.Configuration.GetSection(SmtpOpcoes.Secao));
builder.Services.Configure<AuthOpcoes>(builder.Configuration.GetSection(AuthOpcoes.Secao));

// banco
var banco = builder.Configuration.GetSection(BancoOpcoes.Secao).Get<BancoOpcoes>() ?? new BancoOpcoes();
if (string.IsNullOrWhiteSpace(banco.Senha))
    throw new InvalidOperationException("Falta a senha do banco. Coloque Banco__Senha no backend/.env");

var connectionString = new NpgsqlConnectionStringBuilder
{
    Host = banco.Host,
    Port = banco.Porta,
    Database = banco.Database,
    Username = banco.Usuario,
    Password = banco.Senha,
    SslMode = SslMode.Require,
}.ConnectionString;

builder.Services.AddDbContext<ConectaDbContext>(opcoes => opcoes.UseNpgsql(connectionString));

builder.Services.AddSingleton<IHasherSenha, HasherSenhaBcrypt>();
builder.Services.AddSingleton<ILookupClient>(_ => new LookupClient(new LookupClientOptions { Timeout = TimeSpan.FromSeconds(3) }));
builder.Services.AddScoped<IVerificadorEmail, VerificadorEmailDns>();

var origens = builder.Configuration.GetSection(CorsOpcoes.Secao).Get<CorsOpcoes>()?.ListaOrigens() ?? [];
builder.Services.AddCors(opcoes => opcoes.AddDefaultPolicy(politica =>
    politica.WithOrigins(origens).AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddOpenApi();

var app = builder.Build();

// o HTTPS fica com o Railway, aqui so repassa o esquema certo
var cabecalhos = new ForwardedHeadersOptions { ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto };
cabecalhos.KnownIPNetworks.Clear();
cabecalhos.KnownProxies.Clear();
app.UseForwardedHeaders(cabecalhos);

if (app.Environment.IsDevelopment())
    app.MapOpenApi();
else
    app.UseHsts();

app.UseCors();

app.MapSaudeEndpoints();

app.Run();
