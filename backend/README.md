# Backend - Conecta+

API em C# (.NET 10) usando o banco do Supabase.

## Pastas

```
backend/
├── Conecta.slnx
├── .env.example
├── src/Conecta.Api/
│   ├── Program.cs
│   ├── appsettings.json
│   ├── Conecta.Api.http      exemplos de chamadas (login, estoque)
│   ├── Configuracoes/        classes das configuracoes e registro dos servicos (RegistroServicos.cs)
│   ├── Dominio/Entidades/    tabelas do banco (Usuario, ItemEstoque, MovimentacaoEstoque...) e StatusEstoque
│   ├── Dominio/Tipos/        tipo Email
│   ├── Dominio/Validacao/    regras de campo (Regras.cs)
│   ├── Endpoints/            rotas
│   ├── Infraestrutura/
│   │   ├── Dados/            DbContext
│   │   ├── Json/             conversores JSON
│   │   └── ServicosEmail/    verificacao do dominio do e-mail
│   ├── Seguranca/            hash de senha (bcrypt)
│   └── Servicos/             regras de negocio dos modulos (EstoqueServico)
└── tests/Conecta.Api.Testes/ testes automaticos (xUnit)
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
- As rotas do modulo Estoque estao na secao [Estoque](#estoque-rf22-a-rf30).

## Estoque (RF22 a RF30)

Todas as rotas precisam do token de **Gerente ou Funcionario** (cabecalho `Authorization: Bearer <token>`). Sem token, a resposta e 401. Com token de cliente, 403.

| Metodo | Rota | Quem pode | O que faz | Respostas |
|---|---|---|---|---|
| GET | `/api/estoque` | Gerente, Funcionario | lista os itens do negocio, por nome (RF22) | 200; 400 se o `status` for invalido |
| GET | `/api/estoque?nome=&categoria=&status=` | Gerente, Funcionario | filtra por parte do nome, categoria e status `normal`, `baixo` ou `esgotado` (RF30) | 200; 400 |
| GET | `/api/estoque/{id}` | Gerente, Funcionario | um item | 200; 404 |
| POST | `/api/estoque` | Gerente, Funcionario | cadastra item (RF22) | 201; 400; 409 nome repetido |
| PUT | `/api/estoque/{id}` | Gerente, Funcionario | edita nome, unidade, categoria e minima (RF23) | 200; 400; 404; 409 nome repetido |
| DELETE | `/api/estoque/{id}` | **so Gerente** | exclui o item e o historico dele (RF23) | 204; 403 Funcionario; 404 |
| POST | `/api/estoque/{id}/movimentacoes` | Gerente, Funcionario | entrada (RF24) ou saida (RF27) de quantidade | 201; 400; 404; 409 sem quantidade suficiente |
| GET | `/api/estoque/{id}/movimentacoes` | Gerente, Funcionario | historico do item, do mais recente para o mais antigo (RF29) | 200; 404 |

### Corpos das requisicoes

Cadastrar (`POST /api/estoque`). So o `nome` e obrigatorio. Sem valor, as quantidades valem 0, a unidade vale `unidade` e a categoria fica vazia:

```json
{ "nome": "Farinha de trigo", "quantidadeAtual": 20, "unidadeMedida": "kg", "categoria": "Insumos", "quantidadeMinima": 5 }
```

Editar (`PUT /api/estoque/{id}`). Manda o item inteiro. Nao tem `quantidadeAtual`: a quantidade so muda por entrada ou saida, para ficar no historico:

```json
{ "nome": "Farinha de trigo integral", "unidadeMedida": "kg", "categoria": "Insumos", "quantidadeMinima": 8 }
```

Entrada ou saida (`POST /api/estoque/{id}/movimentacoes`). O `tipo` aceita `entrada`, `saida` ou `saída`. O `motivo` e obrigatorio na saida (perda, descarte ou ajuste):

```json
{ "tipo": "saida", "quantidade": 3, "motivo": "Descarte: embalagem rasgada" }
```

### Respostas

Item (listagem, busca, cadastro e edicao):

```json
{ "id": 1, "nome": "Farinha de trigo", "quantidadeAtual": 4, "unidadeMedida": "kg", "categoria": "Insumos",
  "quantidadeMinima": 5, "status": "BAIXO", "alerta": true }
```

Movimentacao registrada (201):

```json
{
  "item": { "id": 1, "nome": "Farinha de trigo", "quantidadeAtual": 17, "unidadeMedida": "kg", "categoria": "Insumos", "quantidadeMinima": 5, "status": "NORMAL", "alerta": false },
  "movimentacao": { "id": 12, "tipo": "SAIDA", "quantidade": 3, "motivo": "Descarte: embalagem rasgada", "dataMovimentacao": "2026-11-27T18:30:00Z", "responsavel": "Maria Souza" }
}
```

O historico devolve uma lista de `movimentacao`, no mesmo formato.

Erros. O 400 e o 409 trazem uma mensagem por campo, no mesmo formato do cadastro de usuario. O 404 traz so o `detail`:

```json
{ "title": "One or more validation errors occurred.", "status": 409,
  "errors": { "quantidade": ["Não há quantidade suficiente em estoque. Disponível agora: 2."] } }
```

```json
{ "title": "Not Found", "status": 404, "detail": "Item não encontrado no estoque." }
```

### Regras

- **Negocio:** o negocio vem sempre do token (`negocio_id`), nunca do corpo nem da URL. Toda consulta filtra por ele. Um item de outro negocio responde **404**, e nao 403, para nao revelar que ele existe.
- **Exclusao:** so o Gerente exclui (matriz de permissoes dos requisitos). As movimentacoes do item sao apagadas junto. Um item de venda ligado a ele so perde a ligacao (`on delete set null`).
- **Quantidade:**
  - so muda por entrada ou saida;
  - a conta e feita direto no `UPDATE` (`WHERE quantidade_atual >= quantidade` na saida), dentro de uma transacao junto com o registro da movimentacao;
  - nunca fica negativa, mesmo com duas pessoas tirando do mesmo item ao mesmo tempo;
  - a segunda pessoa recebe 409 com a quantidade disponivel.
- **Data e responsavel:** vem do servidor (hora atual e usuario do token), nao do corpo. Ninguem registra movimentacao com data falsa.
- **Status:** e calculado, nao gravado (`Dominio/Entidades/StatusEstoque.cs`):

  | Situacao | `status` | `alerta` |
  |---|---|---|
  | quantidade = 0 | `ESGOTADO` | true |
  | quantidade > 0 e <= minima | `BAIXO` | true (RF28: "menor ou igual") |
  | quantidade > minima | `NORMAL` | false |

- **Validacoes** (`Dominio/Validacao/Regras.cs`):
  - nome com 2 a 120 caracteres;
  - categoria opcional, com ate 60;
  - unidade da lista `unidade, kg, g, litro, ml, caixa, pacote, dúzia`;
  - quantidade minima nao negativa (RN04);
  - quantidades de 0 a 1.000.000;
  - entrada ou saida maior que 0;
  - motivo com ate 255 caracteres e obrigatorio na saida;
  - texto com `<` ou `>` e recusado.
- **Nome repetido:** o mesmo nome no mesmo negocio, sem diferenciar maiusculas, responde 409. Negocios diferentes podem repetir.
- **Limites de resposta:** a listagem devolve no maximo 500 itens, e o historico, as 200 movimentacoes mais recentes.

### Como o codigo do Estoque esta organizado

Ha uma camada para cada coisa (RNF16):

| Camada | Arquivo | Responsabilidade |
|---|---|---|
| Model | `Dominio/` | entidades, `Regras` e `StatusEstoque`: dados e regras puras |
| Servico | `Servicos/EstoqueServico.cs` | regra de negocio: validacao, consultas filtradas pelo negocio, transacao. Nao conhece HTTP |
| Controller | `Endpoints/EstoqueEndpoints.cs` | so HTTP: le o negocio e o usuario do token, chama o servico e converte o resultado em 200, 201, 204, 400, 404 ou 409 |
| View | `frontend/js/screens/estoque.js` | a tela de Estoque do Gerente e do Funcionario |

Os formatos de entrada e saida ficam em `Servicos/EstoqueModelos.cs`. O registro dos servicos (banco, JWT, limite de tentativas, CORS...) fica em `Configuracoes/RegistroServicos.cs`. O `Program.cs` so chama esses metodos.

### Testar a mao

- **Pelas chamadas prontas:** abrir `src/Conecta.Api/Conecta.Api.http` no VS Code (extensao REST Client) ou no Visual Studio. Fazer o login, colar o token em `@token` e rodar as chamadas do Estoque.
- **Pela tela:** com a API rodando, servir o frontend na porta 5500, que ja esta liberada no CORS de desenvolvimento. O comando roda na raiz do repositorio:
  ```bash
  npx serve frontend -s -l 5500
  ```
  Depois, abrir `http://localhost:5500/login`, entrar como Gerente e ir em **Estoque**.

### Fora do escopo do modulo

Estes requisitos dependem de outros modulos e ficaram de fora:

- **RF21:** tirar da vitrine o item com estoque zero;
- **RF25:** ligar um item de estoque a um item de venda;
- **RF26:** dar baixa no estoque quando o pedido for concluido;
- **RF41:** relatorio de movimentacoes.

A tabela `item_venda` ja tem a coluna `item_estoque_id` para isso.

## Testes

```bash
cd backend
dotnet test
```

Os testes ficam em `tests/Conecta.Api.Testes` (xUnit) e nao precisam de banco. Sao 53 testes:

- `RegrasEstoqueTestes`: as validacoes do Estoque, incluindo RN04 e o motivo obrigatorio na saida;
- `StatusEstoqueTestes`: Normal, Baixo, Esgotado e alerta. Tambem confere se o calculo do status bate com o filtro `?status=` da listagem em 961 combinacoes.

O `Dockerfile` so copia `src/`, entao os testes nao entram na imagem do Railway.

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
