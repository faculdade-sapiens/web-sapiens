using Conecta.Api.Dominio.Tipos;

namespace Conecta.Api.Dominio.Entidades;

// Conta opcional do cliente (RF18A). Fazer pedido ou agendamento continua sem precisar de conta.
public sealed class Cliente
{
    public int Id { get; set; }
    public string Nome { get; set; } = "";
    public Email Email { get; set; } = null!;
    public string SenhaHash { get; set; } = "";
    public string? Telefone { get; set; }
    public bool Ativo { get; set; } = true;
    public DateTime AceitouTermosEm { get; set; }
    public DateTime CriadoEm { get; set; }
    public short TentativasLoginFalhas { get; set; }
    public DateTime? BloqueadoAte { get; set; }
    public int SessaoVersao { get; set; }
}
