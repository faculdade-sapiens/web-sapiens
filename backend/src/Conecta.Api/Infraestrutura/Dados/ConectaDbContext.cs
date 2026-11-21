using Conecta.Api.Dominio.Entidades;
using Conecta.Api.Dominio.Tipos;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Conecta.Api.Infraestrutura.Dados;

// As tabelas sao criadas pelo docs/schema.sql, nao usamos migration do EF.
public sealed class ConectaDbContext(DbContextOptions<ConectaDbContext> options) : DbContext(options)
{
    public DbSet<Negocio> Negocios => Set<Negocio>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<ConfigAgenda> ConfigsAgenda => Set<ConfigAgenda>();
    public DbSet<Cliente> Clientes => Set<Cliente>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<Email>()
            .HaveConversion<EmailParaTextoConverter>()
            .HaveMaxLength(Email.TamanhoMaximo);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Negocio>().ToTable("negocio");
        modelBuilder.Entity<Cliente>().ToTable("cliente");

        modelBuilder.Entity<Usuario>(e =>
        {
            e.ToTable("usuario");
            e.HasOne(u => u.Negocio).WithMany().HasForeignKey(u => u.NegocioId);
        });

        modelBuilder.Entity<ConfigAgenda>(e =>
        {
            e.ToTable("config_agenda");
            e.HasKey(c => c.NegocioId);
            e.Property(c => c.NegocioId).ValueGeneratedNever();
            e.HasOne(c => c.Negocio).WithOne().HasForeignKey<ConfigAgenda>(c => c.NegocioId);
        });
    }

    private sealed class EmailParaTextoConverter() : ValueConverter<Email, string>(
        email => email.Valor,
        texto => Email.DoBanco(texto));
}
