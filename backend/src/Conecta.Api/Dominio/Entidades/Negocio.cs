namespace Conecta.Api.Dominio.Entidades;

public sealed class Negocio
{
    public int Id { get; set; }
    public string Nome { get; set; } = "";
    public string Slug { get; set; } = "";
    public string? Cnpj { get; set; }
    public string? Telefone { get; set; }
    public string? Endereco { get; set; }
    public string? Categoria { get; set; }
    public DateTime CriadoEm { get; set; }
}
