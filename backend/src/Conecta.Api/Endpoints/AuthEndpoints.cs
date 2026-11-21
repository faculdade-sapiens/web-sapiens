using Conecta.Api.Configuracoes;
using Conecta.Api.Dominio.Entidades;
using Conecta.Api.Dominio.Tipos;
using Conecta.Api.Dominio.Validacao;
using Conecta.Api.Infraestrutura.Dados;
using Conecta.Api.Infraestrutura.ServicosEmail;
using Conecta.Api.Seguranca;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Conecta.Api.Endpoints;

public sealed record CadastroRequest(
    string? Nome,
    Email? Email,
    string? Senha,
    string? ConfirmarSenha,
    string? NomeNegocio,
    string? Telefone,
    string? Categoria,
    string? Cnpj);

public sealed record LoginRequest(Email? Email, string? Senha);

public sealed record UsuarioResposta(int Id, string Nome, string Email, string Perfil, bool DeveTrocarSenha);
public sealed record NegocioResposta(int Id, string Nome, string Slug);
public sealed record SessaoResposta(string Token, DateTime ExpiraEm, UsuarioResposta Usuario, NegocioResposta Negocio);

public static class AuthEndpoints
{
    private const string MsgLoginInvalido = "E-mail ou senha incorretos.";

    // usado quando o e-mail nao existe, para a resposta demorar o mesmo tempo
    private static readonly Lazy<string> HashFalso = new(() => BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString(), 12));

    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/auth");

        grupo.MapPost("/cadastro", Cadastrar).RequireRateLimiting("auth");
        grupo.MapPost("/login", Entrar).RequireRateLimiting("auth");
        grupo.MapGet("/eu", UsuarioAtual).RequireAuthorization();

        return app;
    }

    // RF01, RF02, RF02A-C
    private static async Task<IResult> Cadastrar(
        CadastroRequest req,
        ConectaDbContext db,
        IHasherSenha hasher,
        IVerificadorEmail verificador,
        GeradorToken gerador,
        CancellationToken ct)
    {
        var erros = new Dictionary<string, string[]>();
        void Erro(string campo, string? msg) { if (msg is not null) erros[campo] = [msg]; }

        var nome = Regras.LimparTexto(req.Nome);
        var nomeNegocio = Regras.LimparTexto(req.NomeNegocio);
        Erro("nome", Regras.ValidarNome(nome, "seu nome"));
        Erro("nomeNegocio", Regras.ValidarNome(nomeNegocio, "o nome do negócio"));

        if (req.Email is null) Erro("email", "Informe o e-mail.");
        Erro("senha", Regras.ValidarSenha(req.Senha));
        if (req.Senha != req.ConfirmarSenha) Erro("confirmarSenha", "As senhas não são iguais.");

        var telefone = Regras.NormalizarTelefone(req.Telefone, out var erroTel);
        Erro("telefone", erroTel);

        var categoria = string.IsNullOrWhiteSpace(req.Categoria) ? null : req.Categoria.Trim();
        if (categoria is not null && !Regras.Categorias.Contains(categoria)) Erro("categoria", "Escolha um tipo de negócio da lista.");

        var cnpj = Regras.NormalizarCnpj(req.Cnpj, out var erroCnpj);
        Erro("cnpj", erroCnpj);

        if (req.Email is not null &&
            await verificador.VerificarDominioAsync(req.Email, ct) == ResultadoVerificacaoEmail.DominioNaoRecebeEmail)
            Erro("email", "Esse e-mail não parece existir. Confira se digitou certo.");

        if (erros.Count > 0) return Results.ValidationProblem(erros);

        // RF02 e RF02C
        if (await db.Usuarios.AnyAsync(u => u.Email == req.Email, ct))
            Erro("email", "Já existe uma conta com esse e-mail.");
        if (cnpj is not null && await db.Negocios.AnyAsync(n => n.Cnpj == cnpj, ct))
            Erro("cnpj", "Esse CNPJ já está cadastrado em outra conta.");
        if (erros.Count > 0) return Results.ValidationProblem(erros, statusCode: StatusCodes.Status409Conflict);

        var agora = DateTime.UtcNow;
        var negocio = new Negocio
        {
            Nome = nomeNegocio,
            Slug = await SlugLivre(db, Regras.GerarSlug(nomeNegocio), ct),
            Cnpj = cnpj,
            Telefone = telefone,
            Categoria = categoria,
            CriadoEm = agora,
        };
        var gerente = new Usuario
        {
            Negocio = negocio,
            Nome = nome,
            Email = req.Email!,
            SenhaHash = hasher.GerarHash(req.Senha!),
            Perfil = Perfis.Gerente,
            Ativo = true,
            CriadoEm = agora,
        };
        db.Add(gerente);
        db.Add(new ConfigAgenda { Negocio = negocio });

        // salva tudo junto; se alguem cadastrar o mesmo e-mail/cnpj ao mesmo tempo, o banco barra
        for (var tentativa = 1; ; tentativa++)
        {
            try
            {
                await db.SaveChangesAsync(ct);
                break;
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } pg)
            {
                switch (pg.ConstraintName)
                {
                    case "usuario_email_uk":
                        return Results.ValidationProblem(new Dictionary<string, string[]> { ["email"] = ["Já existe uma conta com esse e-mail."] }, statusCode: StatusCodes.Status409Conflict);
                    case "negocio_cnpj_key":
                        return Results.ValidationProblem(new Dictionary<string, string[]> { ["cnpj"] = ["Esse CNPJ já está cadastrado em outra conta."] }, statusCode: StatusCodes.Status409Conflict);
                    case "negocio_slug_key" when tentativa < 3:
                        negocio.Slug = $"{Regras.GerarSlug(nomeNegocio)}-{Random.Shared.Next(1000, 9999)}";
                        continue;
                    default:
                        throw;
                }
            }
        }

        var sessao = MontarSessao(gerador, gerente, negocio);
        return Results.Created("/api/auth/eu", sessao);
    }

    // RF03, RF04, RF10
    private static async Task<IResult> Entrar(
        LoginRequest req,
        ConectaDbContext db,
        IHasherSenha hasher,
        GeradorToken gerador,
        IOptions<AuthOpcoes> opcoes,
        CancellationToken ct)
    {
        if (req.Email is null || string.IsNullOrEmpty(req.Senha))
        {
            var erros = new Dictionary<string, string[]>();
            if (req.Email is null) erros["email"] = ["Informe o e-mail."];
            if (string.IsNullOrEmpty(req.Senha)) erros["senha"] = ["Informe a senha."];
            return Results.ValidationProblem(erros);
        }

        var usuario = await db.Usuarios.Include(u => u.Negocio).FirstOrDefaultAsync(u => u.Email == req.Email, ct);

        if (usuario is null)
        {
            hasher.Verificar(req.Senha, HashFalso.Value);
            return Results.Problem(MsgLoginInvalido, statusCode: StatusCodes.Status401Unauthorized);
        }

        var agora = DateTime.UtcNow;
        if (usuario.BloqueadoAte > agora)
            return Bloqueado(usuario.BloqueadoAte.Value - agora);

        if (!hasher.Verificar(req.Senha, usuario.SenhaHash))
        {
            // conta a tentativa direto no banco, para duas requisicoes ao mesmo tempo nao se perderem
            var o = opcoes.Value;
            var bloqueadoAte = (await db.Database.SqlQuery<DateTime?>($"""
                update usuario set
                  tentativas_login_falhas = case when tentativas_login_falhas + 1 >= {o.MaxTentativas} then 0 else tentativas_login_falhas + 1 end,
                  bloqueado_ate = case when tentativas_login_falhas + 1 >= {o.MaxTentativas} then now() + make_interval(mins => {o.BloqueioMin}) else bloqueado_ate end
                where id = {usuario.Id}
                returning bloqueado_ate as "Value"
                """).ToListAsync(ct)).Single();

            return bloqueadoAte > agora
                ? Bloqueado(bloqueadoAte.Value - agora)
                : Results.Problem(MsgLoginInvalido, statusCode: StatusCodes.Status401Unauthorized);
        }

        if (!usuario.Ativo)
            return Results.Problem("Seu acesso foi desativado. Fale com o gerente do estabelecimento.", statusCode: StatusCodes.Status403Forbidden);

        if (usuario.TentativasLoginFalhas != 0 || usuario.BloqueadoAte is not null)
        {
            await db.Usuarios.Where(u => u.Id == usuario.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.TentativasLoginFalhas, (short)0).SetProperty(u => u.BloqueadoAte, (DateTime?)null), ct);
        }

        return Results.Ok(MontarSessao(gerador, usuario, usuario.Negocio));
    }

    private static async Task<IResult> UsuarioAtual(HttpContext http, ConectaDbContext db, CancellationToken ct)
    {
        var id = http.User.LerUsuarioId();
        var usuario = await db.Usuarios.AsNoTracking().Include(u => u.Negocio).FirstAsync(u => u.Id == id, ct);
        return Results.Ok(new
        {
            usuario = ParaResposta(usuario),
            negocio = new NegocioResposta(usuario.Negocio.Id, usuario.Negocio.Nome, usuario.Negocio.Slug),
        });
    }

    private static IResult Bloqueado(TimeSpan restante)
    {
        var minutos = Math.Max(1, (int)Math.Round(restante.TotalMinutes));
        return Results.Problem(
            $"Você errou a senha muitas vezes. Tente de novo em {minutos} minuto{(minutos > 1 ? "s" : "")}.",
            statusCode: StatusCodes.Status423Locked);
    }

    private static SessaoResposta MontarSessao(GeradorToken gerador, Usuario usuario, Negocio negocio)
    {
        var (token, expiraEm) = gerador.Gerar(usuario.Id, negocio.Id, usuario.Perfil, usuario.Nome);
        return new SessaoResposta(token, expiraEm, ParaResposta(usuario), new NegocioResposta(negocio.Id, negocio.Nome, negocio.Slug));
    }

    private static UsuarioResposta ParaResposta(Usuario u) => new(u.Id, u.Nome, u.Email, u.Perfil, u.DeveTrocarSenha);

    private static async Task<string> SlugLivre(ConectaDbContext db, string baseSlug, CancellationToken ct)
    {
        var usados = await db.Negocios
            .Where(n => n.Slug == baseSlug || n.Slug.StartsWith(baseSlug + "-"))
            .Select(n => n.Slug)
            .ToListAsync(ct);

        if (!usados.Contains(baseSlug)) return baseSlug;
        for (var i = 2; ; i++)
        {
            var candidato = $"{baseSlug}-{i}";
            if (!usados.Contains(candidato)) return candidato;
        }
    }
}
