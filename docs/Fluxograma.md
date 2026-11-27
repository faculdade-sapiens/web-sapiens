# Conecta+ — Fluxograma do projeto

Este documento mostra como o Conecta+ funciona hoje, do navegador até o banco.
Os diagramas usam [Mermaid](https://mermaid.js.org/) e aparecem desenhados no GitHub e no VS Code (com a extensão *Markdown Preview Mermaid Support*).

> **Legenda de estado do projeto**
> - **Real**: já passa pelo backend C# e grava no Supabase (cadastro, login, sessão, sair).
> - **Demo**: roda só no navegador, com dados de exemplo em memória (`frontend/js/state.js` + `data.js`). Some ao recarregar a página.

Sumário:

1. [Arquitetura geral](#1-arquitetura-geral)
2. [Como o frontend carrega e navega](#2-como-o-frontend-carrega-e-navega)
3. [Mapa de telas](#3-mapa-de-telas)
4. [Cadastro do negócio (gerente)](#4-cadastro-do-negócio-gerente)
5. [Cadastro do cliente](#5-cadastro-do-cliente)
6. [Login](#6-login)
7. [Requisição autenticada e renovação do token](#7-requisição-autenticada-e-renovação-do-token)
8. [Sair (logout)](#8-sair-logout)
9. [Pedido feito pelo cliente](#9-pedido-feito-pelo-cliente-demo)
10. [Novo pedido no balcão e fiado](#10-novo-pedido-no-balcão-e-fiado-demo)
11. [Status do pedido](#11-status-do-pedido-demo)
12. [Estoque](#12-estoque-demo)
13. [Banco de dados](#13-banco-de-dados)

---

## 1. Arquitetura geral

```mermaid
flowchart LR
    U(["Usuário<br/>cliente / gerente / funcionário"]) --> FE

    subgraph Vercel["Vercel — frontend"]
        FE["index.html + JS puro<br/>roteador SPA"]
        SS[("sessionStorage<br/>conecta.sessao")]
        ST[("state.js<br/>dados demo em memória")]
        FE <--> SS
        FE <--> ST
    end

    subgraph Railway["Railway — backend .NET 10"]
        API["Conecta.Api<br/>Minimal API"]
        MW["CORS → Rate limit → JWT → Autorização<br/>→ renovação do token"]
        API --- MW
    end

    subgraph Supabase["Supabase"]
        DB[("PostgreSQL<br/>Session pooler")]
    end

    DNS["Servidor DNS<br/>verifica domínio do e-mail"]

    FE -- "fetch JSON + Bearer token<br/>api.js → chamarApi()" --> API
    API -- "EF Core + Npgsql, SSL" --> DB
    API -- "consulta MX" --> DNS
```

| Camada | Onde fica | Arquivos principais |
|---|---|---|
| Frontend | Vercel | `frontend/index.html`, `frontend/js/*`, `frontend/vercel.json` |
| Backend | Railway (Docker) | `backend/src/Conecta.Api/Program.cs`, `Endpoints/`, `Seguranca/` |
| Banco | Supabase | `docs/schema.sql` (sem migrations do EF) |

---

## 2. Como o frontend carrega e navega

```mermaid
flowchart TD
    A["Navegador abre qualquer URL<br/>ex.: /gerente/estoque"] --> B["Vercel reescreve para /index.html<br/>(vercel.json)"]
    B --> C["Carrega scripts em ordem:<br/>utils → icons → data → state → api →<br/>router → components → validacao → screens/* → main"]
    C --> D["DOMContentLoaded → render()"]
    D --> E{"matchRoute(caminho)<br/>existe na tabela routes?"}
    E -- não --> F["ScreenNotFound"]
    E -- sim --> G["screen.render(params) → HTML"]
    G --> H{"render devolveu null?<br/>(tela redirecionou)"}
    H -- sim --> D
    H -- não --> I["#app.innerHTML = HTML<br/>document.title = título"]
    I --> J["screen.bind(params)<br/>liga os eventos da tela"]
    J --> K(["Usuário interage"])
    K --> L{"Clique em [data-href]?"}
    L -- sim --> M["navigate(caminho)<br/>history.pushState"] --> D
    L -- "não: [data-toast], modal,<br/>menu lateral, rolagem" --> N["Delegação global<br/>em router.js"] --> K
    O["Botão voltar/avançar<br/>(popstate)"] --> D
```

---

## 3. Mapa de telas

```mermaid
flowchart TD
    L["/ Landing"] --> LOG["/login"]
    L --> CAD["/cadastro<br/>Escolher perfil"]
    L --> FD["/fluxo-dados"]

    CAD --> CC["/cadastro/cliente"]
    CAD --> CE["/cadastro/empresa"]
    CAD --> LF["/login/funcionario"]

    LOG -- "perfil CLIENTE" --> CLI
    LOG -- "perfil GERENTE" --> GER
    LOG -- "perfil FUNCIONARIO" --> FUN
    LOG -. "botões de demonstração" .-> CLI & GER & FUN
    LF --> LOG
    CC -- "conta criada" --> CLI
    CE -- "negócio criado" --> GER

    subgraph CLI["Área do cliente — /cliente"]
        direction TB
        c1["Início"] --> c2["Cardápio"] --> c3["Produto :id"] --> c4["Carrinho"] --> c5["Pedido confirmado"] --> c7["Acompanhar pedido :id"]
        c1 --> c6["Meus pedidos"] --> c7
        c1 --> c8["Minha conta"] --> c9["Perfil"]
    end

    subgraph GER["Área do gerente — /gerente"]
        direction TB
        g1["Dashboard"]
        g1 --> g2["Pedidos"] --> g3["Novo pedido"]
        g1 --> g4["Clientes"] --> g5["Detalhes do cliente :id"]
        g1 --> g6["Fiado"]
        g1 --> g7["Estoque"]
        g1 --> g8["Caixa"]
        g1 --> g9["Funcionários"] --> g10["Adicionar funcionário"]
        g1 --> g11["Relatórios"]
        g1 --> g12["Configurações"]
    end

    subgraph FUN["Área do funcionário — /funcionario"]
        direction TB
        f1["Início"] --> f2["Pedidos"]
        f1 --> f3["Clientes"]
        f1 --> f4["Estoque (só consulta)"]
        f1 --> f5["Caixa (só consulta)"]
    end
```

> As rotas `/cliente`, `/gerente` e `/funcionario` ainda **não** são protegidas no frontend (há um `TODO(backend)` em `router.js`). Quem garante a permissão é o backend, nas rotas que exigem token.

---

## 4. Cadastro do negócio (gerente)

`POST /api/auth/cadastro` — **Real** (RF01, RF02, RF02A-C)

```mermaid
flowchart TD
    A(["Tela /cadastro/empresa"]) --> B["Validação no navegador<br/>(validacao.js — só ajuda o usuário)"]
    B --> C["chamarApi POST /api/auth/cadastro<br/>apaga sessão antiga antes"]
    C --> RL{"Rate limit:<br/>≤ 10 req/min por IP?"}
    RL -- não --> R429["429 Muitas tentativas"]
    RL -- sim --> V["Servidor valida tudo de novo:<br/>nome, nome do negócio, senha forte,<br/>senhas iguais, telefone, categoria da lista, CNPJ"]
    V --> DNS{"Domínio do e-mail<br/>recebe e-mail? (MX)"}
    DNS -- não --> E400
    DNS -- sim --> OK{"Algum erro<br/>de campo?"}
    OK -- sim --> E400["400 + erros por campo"]
    OK -- não --> DUP{"E-mail já usado<br/>(usuario ou cliente)?<br/>CNPJ já cadastrado?"}
    DUP -- sim --> E409["409 + erro no campo"]
    DUP -- não --> CRIA["Cria juntos:<br/>negocio (com slug livre)<br/>usuario GERENTE (senha bcrypt)<br/>config_agenda"]
    CRIA --> SAVE{"SaveChanges<br/>violação de unique?"}
    SAVE -- "e-mail / CNPJ<br/>(cadastro simultâneo)" --> E409
    SAVE -- "slug (até 3 tentativas)" --> SLUG["slug + número aleatório"] --> SAVE
    SAVE -- não --> TOK["Gera JWT (30 min)"]
    TOK --> R201["201 { token, expiraEm, usuario, negocio }"]
    R201 --> FE["Frontend salva sessão<br/>e vai para /gerente"]
    E400 & E409 & R429 --> MSG["Frontend mostra erro<br/>no campo ou no alerta"]
```

---

## 5. Cadastro do cliente

`POST /api/auth/cadastro-cliente` — **Real** (RF18A). A conta do cliente é opcional.

```mermaid
flowchart TD
    A(["Tela /cadastro/cliente"]) --> B["chamarApi POST /api/auth/cadastro-cliente"]
    B --> RL{"Rate limit ok?"}
    RL -- não --> R429["429"]
    RL -- sim --> V["Valida nome, senha, confirmação,<br/>telefone, domínio do e-mail"]
    V --> T{"Aceitou os termos?<br/>(LGPD)"}
    T -- não --> E400["400 aceitouTermos"]
    T -- sim --> ERR{"Erros?"}
    ERR -- sim --> E400b["400 + campos"]
    ERR -- não --> DUP{"E-mail já usado?"}
    DUP -- sim --> E409["409 email"]
    DUP -- não --> SAVE["Grava cliente<br/>aceitou_termos_em = agora"]
    SAVE --> TOK["JWT perfil CLIENTE<br/>(sem negocio_id)"]
    TOK --> R201["201 sessão"] --> FE["Vai para /cliente"]
```

---

## 6. Login

`POST /api/auth/login` — **Real** (RF03, RF04, RF10). Uma tela só: o servidor descobre se é equipe ou cliente pelo e-mail.

```mermaid
flowchart TD
    A(["/login ou /login/funcionario"]) --> B["chamarApi POST /api/auth/login<br/>{ email, senha }"]
    B --> RL{"Rate limit ok?"}
    RL -- não --> R429["429"]
    RL -- sim --> C{"E-mail e senha<br/>preenchidos?"}
    C -- não --> E400["400 + campos"]
    C -- sim --> D["Procura em usuario;<br/>se não achar, em cliente"]
    D --> E{"Achou alguém?"}
    E -- não --> F["Compara com hash falso<br/>(mesmo tempo de resposta)"] --> E401["401 E-mail ou senha incorretos"]
    E -- sim --> G{"bloqueado_ate<br/>no futuro?"}
    G -- sim --> E423["423 Tente de novo em N minutos"]
    G -- não --> H{"Senha confere?<br/>(bcrypt)"}
    H -- não --> I["UPDATE atômico:<br/>tentativas + 1<br/>na 5ª → bloqueia 15 min"]
    I --> J{"Ficou bloqueado?"}
    J -- sim --> E423
    J -- não --> E401
    H -- sim --> K{"Conta ativa?"}
    K -- não --> E403["403 acesso desativado"]
    K -- sim --> L["Zera tentativas e bloqueio"]
    L --> M["Gera JWT com:<br/>usuario_id, negocio_id, perfil,<br/>nome, sessao_versao"]
    M --> R200["200 sessão"]
    R200 --> N{"destinoPorPerfil()<br/>(perfil vindo do servidor)"}
    N -- GERENTE --> NG["/gerente"]
    N -- FUNCIONARIO --> NF["/funcionario"]
    N -- CLIENTE --> NC["/cliente"]
```

---

## 7. Requisição autenticada e renovação do token

Vale para `GET /api/auth/eu`, `POST /api/auth/sair` e toda rota futura com `RequireAuthorization`.

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend (api.js)
    participant API as Conecta.Api
    participant DB as Supabase

    FE->>API: Requisição + Authorization: Bearer token
    API->>API: Valida assinatura, emissor, público, validade (JWT HS256)
    API->>DB: Busca ativo, negocio_id, perfil, sessao_versao do dono do token
    alt Conta inativa, trocou de negócio/perfil ou fez "Sair" depois do token
        API-->>FE: 401
        FE->>FE: encerrarSessao() (apaga sessionStorage)
    else Token válido
        API->>API: Política "gerente" / "equipe" / "cliente"
        alt Perfil sem permissão
            API-->>FE: 403
        else Permitido
            opt Falta menos da metade da validade (15 min)
                API->>API: Gera token novo
            end
            API-->>FE: 200 + cabeçalho X-Novo-Token (se renovou)
            FE->>FE: Troca o token salvo na sessão
        end
    end
```

---

## 8. Sair (logout)

`POST /api/auth/sair` — **Real** (RF06)

```mermaid
flowchart LR
    A(["Botão Sair<br/>.app-logout-btn"]) --> B["Apaga sessão do navegador"]
    B --> C["POST /api/auth/sair<br/>keepalive"]
    C --> D["sessao_versao + 1<br/>no usuario ou cliente"]
    D --> E["Todo token antigo da conta<br/>passa a dar 401 na hora"]
    C -. "sem internet" .-> F["Token vence sozinho em 30 min"]
```

---

## 9. Pedido feito pelo cliente (Demo)

```mermaid
flowchart TD
    A(["/cliente/cardapio"]) --> B["Escolhe produto<br/>/cliente/produto/:id"]
    B --> C{"Produto existe?"}
    C -- não --> A
    C -- sim --> D["Quantidade + observação<br/>→ state.carrinho"]
    D --> E["/cliente/carrinho<br/>subtotal + R$ 3,00 de entrega"]
    E --> F{"Remover item?"}
    F -- sim --> E
    F -- "Confirmar pedido" --> G["Cria pedido status Recebido<br/>em state.pedidos"]
    G --> H["Entrada no caixa<br/>state.movimentosCaixa"]
    G --> I{"Sessão de CLIENTE real?<br/>clienteContaReal()"}
    I -- sim --> I1["Guarda o id do pedido<br/>só na lista dessa conta"]
    I -- "não (demonstração)" --> I2["Copia em meusPedidosCliente<br/>(dados de exemplo)"]
    H & I1 & I2 --> J["Esvazia carrinho"] --> K["/cliente/pedido-confirmado"]
    K --> L{"Conta real e o pedido<br/>não é dela?"}
    L -- sim --> M["Volta para /cliente/pedidos"]
    L -- não --> N["/cliente/pedidos/:id<br/>linha do tempo do status"]
```

**Minha carteira e Meus pedidos:** na demonstração mostram os números de exemplo (R$ 56,00 etc.). Na conta real começam zerados e são calculados a partir dos pedidos que a própria conta fez. O saldo devedor da conta real é sempre R$ 0,00, porque o banco ainda não tem fiado nem liga `pedido` a `cliente`.

---

## 10. Novo pedido no balcão e fiado (Demo)

```mermaid
flowchart TD
    A(["/gerente/pedidos/novo"]) --> B["Escolhe cliente, produto,<br/>quantidade e pagamento"]
    B --> C{"Produto escolhido e<br/>quantidade > 0?"}
    C -- não --> X["alert e não salva"]
    C -- sim --> D["valor = preço × quantidade<br/>cria pedido Recebido"]
    D --> E{"Pagamento = Fiado<br/>e cliente escolhido?"}
    E -- sim --> F["cliente.saldoDevedor += valor"]
    E -- não --> G["Entrada no caixa"]
    F & G --> H["/gerente/pedidos"]

    F --> FI(["/gerente/fiado<br/>lista quem deve"])
    FI --> R["Receber → informa valor"]
    R --> RV{"valor > 0?"}
    RV -- não --> X2["alert"]
    RV -- sim --> RS["saldoDevedor -= valor<br/>(nunca fica negativo)"]
    RS --> FI
```

---

## 11. Status do pedido (Demo)

Na lista de pedidos, clicar no selo de status avança para o próximo (`PROXIMO_STATUS` em `state.js`).

```mermaid
stateDiagram-v2
    [*] --> Recebido: pedido criado
    Recebido --> EmPreparo: clique no status
    EmPreparo --> Concluido: clique no status
    Concluido --> [*]
    Cancelado --> [*]

    EmPreparo: Em preparo
    Concluido: Concluído
```

> `Concluído` e `Cancelado` são finais: o selo vira texto e não é mais clicável. O filtro da tela do gerente separa Todos / Em preparo / Concluídos / Cancelados.

---

## 12. Estoque (Demo)

```mermaid
flowchart TD
    A(["/gerente/estoque"]) --> B["Para cada produto:<br/>estoqueStatusInfo()"]
    B --> C{"quantidade = 0?"}
    C -- sim --> D["Sem estoque (vermelho)"]
    C -- não --> E{"quantidade ≤ estoque mínimo?"}
    E -- sim --> F["Estoque baixo (amarelo)<br/>conta no alerta do topo"]
    E -- não --> G["Normal"]

    A --> H["Editar produto (modal)"] --> I["Valida (≥ 0) e atualiza<br/>quantidade e estoque mínimo"] --> A
    A --> J["Adicionar produto (modal)"] --> K{"Nome preenchido,<br/>preço > 0, quantidades ≥ 0?"}
    K -- não --> L["Mostra erro"]
    K -- sim --> M["state.produtos.push"] --> A

    N(["/funcionario/estoque"]) --> B
```

---

## 13. Banco de dados

Tabelas do `docs/schema.sql`. As que o backend já usa: **negocio**, **usuario**, **cliente**, **config_agenda**. As outras estão criadas e esperam os próximos módulos (estoque, pedidos, agenda, redefinição de senha).

```mermaid
erDiagram
    negocio ||--o{ usuario : "tem equipe"
    negocio ||--|| config_agenda : "configura"
    negocio ||--o{ horario_expediente : "abre em"
    negocio ||--o{ agendamento : "recebe"
    negocio ||--o{ item_estoque : "controla"
    negocio ||--o{ item_venda : "vende"
    negocio ||--o{ pedido : "recebe"
    item_estoque |o--o| item_venda : "baixa estoque de"
    pedido ||--|{ item_pedido : "contém"
    item_venda |o--o{ item_pedido : "aparece em"
    item_estoque ||--o{ movimentacao_estoque : "entradas e saídas"
    usuario |o--o{ movimentacao_estoque : "registrou"
    usuario ||--o{ token_redefinicao_senha : "pede"

    negocio {
        int id PK
        text nome
        text slug UK
        text cnpj UK
    }
    usuario {
        int id PK
        int negocio_id FK
        text email UK
        text perfil "GERENTE ou FUNCIONARIO"
        bool ativo
        int sessao_versao
    }
    cliente {
        int id PK
        text email UK
        bool ativo
        timestamp aceitou_termos_em
        int sessao_versao
    }
```

> `cliente` não tem chave estrangeira para `negocio`: a conta do cliente é global (um cliente pode comprar de vários negócios). O mesmo e-mail não pode existir em `usuario` e `cliente` ao mesmo tempo — o backend confere as duas tabelas.
