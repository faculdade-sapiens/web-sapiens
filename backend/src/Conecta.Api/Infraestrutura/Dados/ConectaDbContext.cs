using Conecta.Api.Dominio.Tipos;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Conecta.Api.Infraestrutura.Dados;

// As tabelas sao criadas pelo docs/schema.sql, nao usamos migration do EF.
public sealed class ConectaDbContext(DbContextOptions<ConectaDbContext> options) : DbContext(options)
{
    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<Email>()
            .HaveConversion<EmailParaTextoConverter>()
            .HaveMaxLength(Email.TamanhoMaximo);
    }

    private sealed class EmailParaTextoConverter() : ValueConverter<Email, string>(
        email => email.Valor,
        texto => Email.DoBanco(texto));
}
