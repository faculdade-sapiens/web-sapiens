using System.Security.Claims;
using System.Text;
using Conecta.Api.Configuracoes;
using Conecta.Api.Dominio.Entidades;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Conecta.Api.Seguranca;

public static class Claims
{
    public const string UsuarioId = "sub";      // id do usuario, ou do cliente quando perfil = CLIENTE
    public const string NegocioId = "negocio_id"; // nao existe no token do cliente
    public const string Perfil = "perfil";
    public const string Nome = "nome";
    public const string SessaoVersao = "sv";    // versao da sessao; muda no logout e invalida o token

    public static int LerUsuarioId(this ClaimsPrincipal user) => int.Parse(user.FindFirst(UsuarioId)!.Value);
    public static int LerNegocioId(this ClaimsPrincipal user) => int.Parse(user.FindFirst(NegocioId)!.Value);
    public static int LerSessaoVersao(this ClaimsPrincipal user) => int.Parse(user.FindFirst(SessaoVersao)?.Value ?? "-1");
    public static bool EhCliente(this ClaimsPrincipal user) => user.FindFirst(Perfil)?.Value == Perfis.Cliente;
}

public sealed class GeradorToken(IOptions<JwtOpcoes> opcoes)
{
    private readonly JsonWebTokenHandler _handler = new();

    public static SymmetricSecurityKey Chave(string secret) => new(Encoding.UTF8.GetBytes(secret));

    public (string Token, DateTime ExpiraEm) Gerar(int id, int? negocioId, string perfil, string nome, int sessaoVersao)
    {
        var o = opcoes.Value;
        var expiraEm = DateTime.UtcNow.AddMinutes(o.ExpiracaoMin);

        var claims = new List<Claim>
        {
            new(Claims.UsuarioId, id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")), // cada login gera um token diferente
            new(Claims.Perfil, perfil),
            new(Claims.Nome, nome),
            new(Claims.SessaoVersao, sessaoVersao.ToString()),
        };
        if (negocioId is not null) claims.Add(new Claim(Claims.NegocioId, negocioId.Value.ToString()));

        var token = _handler.CreateToken(new SecurityTokenDescriptor
        {
            Issuer = o.Issuer,
            Audience = o.Audience,
            Expires = expiraEm,
            SigningCredentials = new SigningCredentials(Chave(o.Secret), SecurityAlgorithms.HmacSha256),
            Subject = new ClaimsIdentity(claims),
        });

        return (token, expiraEm);
    }

    // renova mantendo a versao de sessao que o token ja trazia (so nao vale se o logout aumentou a versao)
    public (string Token, DateTime ExpiraEm) Renovar(ClaimsPrincipal user) =>
        Gerar(
            user.LerUsuarioId(),
            user.EhCliente() ? null : user.LerNegocioId(),
            user.FindFirst(Claims.Perfil)!.Value,
            user.FindFirst(Claims.Nome)?.Value ?? "",
            user.LerSessaoVersao());
}
