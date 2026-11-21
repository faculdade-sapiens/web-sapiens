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

public sealed record CadastroClienteRequest(
    string? Nome,
    Email? Email,
    string? Senha,
    string? ConfirmarSenha,
    string? Telefone,
    bool? AceitouTermos);

public sealed record LoginRequest(Email? Email, string? Senha);

public sealed record UsuarioResposta(int Id, string Nome, string Email, string Perfil, bool DeveTrocarSenha);
public sealed record NegocioResposta(int Id, string Nome, string Slug);
public sealed record SessaoResposta(string Token, DateTime ExpiraEm, UsuarioResposta Usuario, NegocioResposta? Negocio);

public static class AuthEndpoints
{
    private const string MsgLoginInvalido = "E-mail ou senha incorretos.";
    private const string MsgEmailEmUso = "Já existe uma conta com esse e-mail.";

    // usado quando o e-mail nao existe, para a resposta demorar o mesmo tempo
    private static readonly Lazy<string> HashFalso = new(() => BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString(), 12));

    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/auth");

        grupo.MapPost("/cadastro", Cadastrar).RequireRateLimiting("auth");
        grupo.MapPost("/cadastro-cliente", CadastrarCliente).RequireRateLimiting("auth");
        grupo.MapPost("/login", Entrar).RequireRateLimiting("auth");
        grupo.MapGet("/eu", UsuarioAtual).RequireAuthorization();
        grupo.MapPost("/sair", Sair).RequireAuthorization();

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

        if (req.Email is not null && !await DominioOk(verificador, req.Email, ct))
            Erro("email", "Esse e-mail não parece existir. Confira se digitou certo.");

        if (erros.Count > 0) return Results.ValidationProblem(erros);

        // RF02 e RF02C
        if (await EmailEmUso(db, req.Email!, ct)) Erro("email", MsgEmailEmUso);
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
                        return ErroCampo("email", MsgEmailEmUso);
                    case "negocio_cnpj_key":
                        return ErroCampo("cnpj", "Esse CNPJ já está cadastrado em outra conta.");
                    case "negocio_slug_key" when tentativa < 3:
                        negocio.Slug = $"{Regras.GerarSlug(nomeNegocio)}-{Random.Shared.Next(1000, 9999)}";
                        continue;
                    default:
                        throw;
                }
            }
        }

        var (token, expiraEm) = gerador.Gerar(gerente.Id, negocio.Id, gerente.Perfil, gerente.Nome, gerente.SessaoVersao);
        return Results.Created("/api/auth/eu", new SessaoResposta(token, expiraEm, ParaResposta(gerente), ParaResposta(negocio)));
    }

    // RF18A: conta opcional do cliente
    private static async Task<IResult> CadastrarCliente(
        CadastroClienteRequest req,
        ConectaDbContext db,
        IHasherSenha hasher,
        IVerificadorEmail verificador,
        GeradorToken gerador,
        CancellationToken ct)
    {
        var erros = new Dictionary<string, string[]>();
        void Erro(string campo, string? msg) { if (msg is not null) erros[campo] = [msg]; }

        var nome = Regras.LimparTexto(req.Nome);
        Erro("nome", Regras.ValidarNome(nome, "seu nome"));
        if (req.Email is null) Erro("email", "Informe o e-mail.");
        Erro("senha", Regras.ValidarSenha(req.Senha));
        if (req.Senha != req.ConfirmarSenha) Erro("confirmarSenha", "As senhas não são iguais.");

        var telefone = Regras.NormalizarTelefone(req.Telefone, out var erroTel);
        Erro("telefone", erroTel);

        // LGPD: sem aceite nao cria a conta, mesmo que a tela tenha deixado passar
        if (req.AceitouTermos != true) Erro("aceitouTermos", "Para criar a conta, aceite os termos de uso.");

        if (req.Email is not null && !await DominioOk(verificador, req.Email, ct))
            Erro("email", "Esse e-mail não parece existir. Confira se digitou certo.");

        if (erros.Count > 0) return Results.ValidationProblem(erros);

        if (await EmailEmUso(db, req.Email!, ct)) return ErroCampo("email", MsgEmailEmUso);

        var agora = DateTime.UtcNow;
        var cliente = new Cliente
        {
            Nome = nome,
            Email = req.Email!,
            SenhaHash = hasher.GerarHash(req.Senha!),
            Telefone = telefone,
            Ativo = true,
            AceitouTermosEm = agora,
            CriadoEm = agora,
        };
        db.Add(cliente);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation, ConstraintName: "cliente_email_uk" })
        {
            return ErroCampo("email", MsgEmailEmUso);
        }

        var (token, expiraEm) = gerador.Gerar(cliente.Id, null, Perfis.Cliente, cliente.Nome, cliente.SessaoVersao);
        return Results.Created("/api/auth/eu", new SessaoResposta(token, expiraEm, ParaResposta(cliente), null));
    }

    // RF03, RF04, RF10. Mesma tela para equipe e cliente: o servidor descobre quem e pelo e-mail.
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
        var cliente = usuario is null ? await db.Clientes.FirstOrDefaultAsync(c => c.Email == req.Email, ct) : null;

        if (usuario is null && cliente is null)
        {
            hasher.Verificar(req.Senha, HashFalso.Value);
            return Results.Problem(MsgLoginInvalido, statusCode: StatusCodes.Status401Unauthorized);
        }

        var ehCliente = cliente is not null;
        var id = ehCliente ? cliente!.Id : usuario!.Id;
        var senhaHash = ehCliente ? cliente!.SenhaHash : usuario!.SenhaHash;
        var bloqueadoAteAtual = ehCliente ? cliente!.BloqueadoAte : usuario!.BloqueadoAte;
        var tentativas = ehCliente ? cliente!.TentativasLoginFalhas : usuario!.TentativasLoginFalhas;
        var ativo = ehCliente ? cliente!.Ativo : usuario!.Ativo;

        var agora = DateTime.UtcNow;
        if (bloqueadoAteAtual > agora)
            return Bloqueado(bloqueadoAteAtual.Value - agora);

        if (!hasher.Verificar(req.Senha, senhaHash))
        {
            var bloqueadoAte = await RegistrarSenhaErrada(db, ehCliente, id, opcoes.Value, ct);
            return bloqueadoAte > agora
                ? Bloqueado(bloqueadoAte.Value - agora)
                : Results.Problem(MsgLoginInvalido, statusCode: StatusCodes.Status401Unauthorized);
        }

        if (!ativo)
            return Results.Problem(
                ehCliente ? "Sua conta foi desativada." : "Seu acesso foi desativado. Fale com o gerente do estabelecimento.",
                statusCode: StatusCodes.Status403Forbidden);

        if (tentativas != 0 || bloqueadoAteAtual is not null)
        {
            if (ehCliente)
                await db.Clientes.Where(c => c.Id == id)
                    .ExecuteUpdateAsync(s => s.SetProperty(c => c.TentativasLoginFalhas, (short)0).SetProperty(c => c.BloqueadoAte, (DateTime?)null), ct);
            else
                await db.Usuarios.Where(u => u.Id == id)
                    .ExecuteUpdateAsync(s => s.SetProperty(u => u.TentativasLoginFalhas, (short)0).SetProperty(u => u.BloqueadoAte, (DateTime?)null), ct);
        }

        if (ehCliente)
        {
            var (tokenCliente, expiraCliente) = gerador.Gerar(cliente!.Id, null, Perfis.Cliente, cliente.Nome, cliente.SessaoVersao);
            return Results.Ok(new SessaoResposta(tokenCliente, expiraCliente, ParaResposta(cliente), null));
        }

        var (token, expiraEm) = gerador.Gerar(usuario!.Id, usuario.NegocioId, usuario.Perfil, usuario.Nome, usuario.SessaoVersao);
        return Results.Ok(new SessaoResposta(token, expiraEm, ParaResposta(usuario), ParaResposta(usuario.Negocio)));
    }

    private static async Task<IResult> UsuarioAtual(HttpContext http, ConectaDbContext db, CancellationToken ct)
    {
        var id = http.User.LerUsuarioId();
        if (http.User.EhCliente())
        {
            var cliente = await db.Clientes.AsNoTracking().FirstAsync(c => c.Id == id, ct);
            return Results.Ok(new { usuario = ParaResposta(cliente), negocio = (NegocioResposta?)null });
        }

        var usuario = await db.Usuarios.AsNoTracking().Include(u => u.Negocio).FirstAsync(u => u.Id == id, ct);
        return Results.Ok(new { usuario = ParaResposta(usuario), negocio = ParaResposta(usuario.Negocio) });
    }

    // RF06: logout no servidor. Aumenta sessao_versao, o que invalida todos os tokens atuais dessa conta na hora.
    private static async Task<IResult> Sair(HttpContext http, ConectaDbContext db, CancellationToken ct)
    {
        var id = http.User.LerUsuarioId();
        if (http.User.EhCliente())
            await db.Clientes.Where(c => c.Id == id).ExecuteUpdateAsync(s => s.SetProperty(c => c.SessaoVersao, c => c.SessaoVersao + 1), ct);
        else
            await db.Usuarios.Where(u => u.Id == id).ExecuteUpdateAsync(s => s.SetProperty(u => u.SessaoVersao, u => u.SessaoVersao + 1), ct);
        return Results.NoContent();
    }

    // conta a tentativa direto no banco, para duas requisicoes ao mesmo tempo nao se perderem (RF04)
    private static async Task<DateTime?> RegistrarSenhaErrada(ConectaDbContext db, bool ehCliente, int id, AuthOpcoes o, CancellationToken ct)
    {
        var consulta = ehCliente
            ? db.Database.SqlQuery<DateTime?>($"""
                update cliente set
                  tentativas_login_falhas = case when tentativas_login_falhas + 1 >= {o.MaxTentativas} then 0 else tentativas_login_falhas + 1 end,
                  bloqueado_ate = case when tentativas_login_falhas + 1 >= {o.MaxTentativas} then now() + make_interval(mins => {o.BloqueioMin}) else bloqueado_ate end
                where id = {id}
                returning bloqueado_ate as "Value"
                """)
            : db.Database.SqlQuery<DateTime?>($"""
                update usuario set
                  tentativas_login_falhas = case when tentativas_login_falhas + 1 >= {o.MaxTentativas} then 0 else tentativas_login_falhas + 1 end,
                  bloqueado_ate = case when tentativas_login_falhas + 1 >= {o.MaxTentativas} then now() + make_interval(mins => {o.BloqueioMin}) else bloqueado_ate end
                where id = {id}
                returning bloqueado_ate as "Value"
                """);
        return (await consulta.ToListAsync(ct)).Single();
    }

    // o mesmo e-mail nao pode ser de um cliente e de alguem da equipe ao mesmo tempo
    private static async Task<bool> EmailEmUso(ConectaDbContext db, Email email, CancellationToken ct) =>
        await db.Usuarios.AnyAsync(u => u.Email == email, ct) || await db.Clientes.AnyAsync(c => c.Email == email, ct);

    private static async Task<bool> DominioOk(IVerificadorEmail verificador, Email email, CancellationToken ct) =>
        await verificador.VerificarDominioAsync(email, ct) != ResultadoVerificacaoEmail.DominioNaoRecebeEmail;

    private static IResult ErroCampo(string campo, string mensagem) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { [campo] = [mensagem] }, statusCode: StatusCodes.Status409Conflict);

    private static IResult Bloqueado(TimeSpan restante)
    {
        var minutos = Math.Max(1, (int)Math.Round(restante.TotalMinutes));
        return Results.Problem(
            $"Você errou a senha muitas vezes. Tente de novo em {minutos} minuto{(minutos > 1 ? "s" : "")}.",
            statusCode: StatusCodes.Status423Locked);
    }

    private static UsuarioResposta ParaResposta(Usuario u) => new(u.Id, u.Nome, u.Email, u.Perfil, u.DeveTrocarSenha);
    private static UsuarioResposta ParaResposta(Cliente c) => new(c.Id, c.Nome, c.Email, Perfis.Cliente, false);
    private static NegocioResposta ParaResposta(Negocio n) => new(n.Id, n.Nome, n.Slug);

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
