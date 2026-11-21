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

1. Copiar `.env.example` para `.env` e preencher `Banco__Senha` e `Jwt__Secret`
2. Rodar:
   ```bash
   cd backend
   dotnet run --project src/Conecta.Api
   ```
3. Abrir `http://localhost:5169/saude`, tem que aparecer `"banco":"ok"`

## Rotas

| Metodo | Rota | O que faz |
|---|---|---|
| GET | `/saude` | testa API e banco |
| POST | `/api/auth/cadastro` | cria negocio + gerente e ja devolve o token (RF01, RF02, RF02A-C) |
| POST | `/api/auth/login` | entra; bloqueia 15 min depois de 5 senhas erradas (RF03, RF04) |
| POST | `/api/auth/cadastro-cliente` | conta opcional do cliente (RF18A) |
| GET | `/api/auth/eu` | dados de quem esta logado (precisa do token) |
| POST | `/api/auth/sair` | logout: invalida na hora todos os tokens da conta (RF06) |

- Login e cadastro aceitam no maximo 10 tentativas por minuto por IP.
- O token vale 30 min. Se a pessoa continua usando, a API manda um novo no cabecalho `X-Novo-Token` (RNF09).
- Em toda requisicao com token a API confere se o usuario ainda esta ativo (RF10).

## Deploy no Railway

1. New Project > Deploy from GitHub repo > escolher o repositorio
2. Em Settings, colocar **Root Directory** = `backend` (ele usa o `Dockerfile`)
3. Em Variables, cadastrar `Banco__Senha` e `Jwt__Secret`
4. Em Settings > Networking, clicar em **Generate Domain**
5. Colocar esse endereco em `API_PRODUCAO`, no `frontend/js/api.js`, e publicar o frontend de novo

## Observacoes

- As tabelas estao no `docs/schema.sql`. Nao usamos migration do Entity Framework.
- A conexao usa o Session pooler do Supabase, porque o Railway nao acessa a conexao direta (so IPv6).
- Usar o tipo `Email` no lugar de `string` para e-mail. Se vier invalido na requisicao, a API ja devolve 400.
- A porta no Railway vem da variavel `PORT`.
