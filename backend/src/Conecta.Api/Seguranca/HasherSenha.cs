using System.Text;

namespace Conecta.Api.Seguranca;

public interface IHasherSenha
{
    string GerarHash(string senha);
    bool Verificar(string senha, string hash);
}

public sealed class HasherSenhaBcrypt : IHasherSenha
{
    private const int FatorCusto = 12;

    // bcrypt ignora o que passa de 72 bytes
    public const int TamanhoMaximoBytes = 72;

    public string GerarHash(string senha)
    {
        if (Encoding.UTF8.GetByteCount(senha) > TamanhoMaximoBytes)
            throw new ArgumentException($"A senha deve ter no maximo {TamanhoMaximoBytes} bytes.", nameof(senha));

        return BCrypt.Net.BCrypt.HashPassword(senha, FatorCusto);
    }

    public bool Verificar(string senha, string hash)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(senha, hash);
        }
        catch (BCrypt.Net.SaltParseException)
        {
            return false;
        }
    }
}
