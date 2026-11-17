# Backend - Conecta+

API em C# (.NET 10) usando o banco do Supabase.

## Pastas

```
backend/
├── Conecta.slnx
├── .env.example
└── src/Conecta.Api/
    ├── Program.cs
    ├── appsettings.json
    ├── Configuracoes/        classes das configuracoes
    ├── Dominio/Tipos/        tipo Email
    ├── Endpoints/            rotas
    ├── Infraestrutura/
    │   ├── Dados/            DbContext
    │   ├── Json/             conversores JSON
    │   └── ServicosEmail/    verificacao do dominio do e-mail
    └── Seguranca/            hash de senha (bcrypt)
```

## Como rodar

1. Copiar `.env.example` para `.env` e colocar a senha do banco em `Banco__Senha`
2. Rodar:
   ```bash
   cd backend
   dotnet run --project src/Conecta.Api
   ```
3. Abrir `http://localhost:5169/saude`, tem que aparecer `"banco":"ok"`

## Observacoes

- As tabelas estao no `docs/schema.sql`. Nao usamos migration do Entity Framework.
- A conexao usa o Session pooler do Supabase, porque o Railway nao acessa a conexao direta (so IPv6).
- Usar o tipo `Email` no lugar de `string` para e-mail. Se vier invalido na requisicao, a API ja devolve 400.
- No Railway, cadastrar `Banco__Senha` nas variaveis. A porta vem da variavel `PORT`.
