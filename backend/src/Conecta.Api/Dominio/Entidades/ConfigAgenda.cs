namespace Conecta.Api.Dominio.Entidades;

public sealed class ConfigAgenda
{
    public int NegocioId { get; set; }
    public Negocio Negocio { get; set; } = null!;
    public int DuracaoPadraoMin { get; set; } = 30;
}
