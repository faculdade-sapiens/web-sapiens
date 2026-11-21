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
    public const string UsuarioId = "sub";
    public const string NegocioId = "negocio_id";
    public const string Perfil = "perfil";
    public const string Nome = "nome";

    public static int LerUsuarioId(this ClaimsPrincipal user) => int.Parse(user.FindFirst(UsuarioId)!.Value);
    public static int LerNegocioId(this ClaimsPrincipal user) => int.Parse(user.FindFirst(NegocioId)!.Value);
}

public sealed class GeradorToken(IOptions<JwtOpcoes> opcoes)
{
    private readonly JsonWebTokenHandler _handler = new();

    public static SymmetricSecurityKey Chave(string secret) => new(Encoding.UTF8.GetBytes(secret));

    public (string Token, DateTime ExpiraEm) Gerar(int usuarioId, int negocioId, string perfil, string nome)
    {
        var o = opcoes.Value;
        var expiraEm = DateTime.UtcNow.AddMinutes(o.ExpiracaoMin);

        var token = _handler.CreateToken(new SecurityTokenDescriptor
        {
            Issuer = o.Issuer,
            Audience = o.Audience,
            Expires = expiraEm,
            SigningCredentials = new SigningCredentials(Chave(o.Secret), SecurityAlgorithms.HmacSha256),
            Subject = new ClaimsIdentity(
            [
                new Claim(Claims.UsuarioId, usuarioId.ToString()),
                new Claim(Claims.NegocioId, negocioId.ToString()),
                new Claim(Claims.Perfil, perfil),
                new Claim(Claims.Nome, nome),
            ]),
        });

        return (token, expiraEm);
    }

    public (string Token, DateTime ExpiraEm) Renovar(ClaimsPrincipal user) =>
        Gerar(user.LerUsuarioId(), user.LerNegocioId(), user.FindFirst(Claims.Perfil)!.Value, user.FindFirst(Claims.Nome)?.Value ?? "");
}
