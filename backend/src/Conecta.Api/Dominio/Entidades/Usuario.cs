using Conecta.Api.Dominio.Tipos;

namespace Conecta.Api.Dominio.Entidades;

public static class Perfis
{
    public const string Gerente = "GERENTE";
    public const string Funcionario = "FUNCIONARIO";
    public const string Cliente = "CLIENTE"; // so no token; o cliente fica na tabela cliente
}

public sealed class Usuario
{
    public int Id { get; set; }
    public int NegocioId { get; set; }
    public Negocio Negocio { get; set; } = null!;
    public string Nome { get; set; } = "";
    public Email Email { get; set; } = null!;
    public string SenhaHash { get; set; } = "";
    public string Perfil { get; set; } = Perfis.Funcionario;
    public bool Ativo { get; set; } = true;
    public DateTime CriadoEm { get; set; }
    public short TentativasLoginFalhas { get; set; }
    public DateTime? BloqueadoAte { get; set; }
    public bool DeveTrocarSenha { get; set; }
    public int SessaoVersao { get; set; }
}
