-- Conecta+ | Schema do banco (Supabase PostgreSQL 17)
-- Projeto: qpauincpahhhamouclry
-- Migrations aplicadas, em ordem:
--   1. conecta_schema_inicial
--   2. conecta_autenticacao_apoio  (RF04, RF05, RF09)
-- Documentacao: docs/Conecta+_Modelagem_Banco_de_Dados.md (versao 1.3)

-- =====================================================================
-- Migration 1: conecta_schema_inicial
-- =====================================================================

create table public.negocio (
  id integer generated always as identity primary key,
  nome varchar(120) not null,
  slug varchar(60) not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  cnpj varchar(14) unique,
  telefone varchar(20),
  endereco varchar(255),
  categoria varchar(60),
  criado_em timestamptz not null default now()
);

create table public.usuario (
  id integer generated always as identity primary key,
  negocio_id integer not null references public.negocio(id) on delete cascade,
  nome varchar(120) not null,
  email varchar(255) not null,
  senha_hash varchar(255) not null,
  perfil varchar(15) not null check (perfil in ('GERENTE','FUNCIONARIO')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create unique index usuario_email_uk on public.usuario (lower(email));
create index usuario_negocio_idx on public.usuario (negocio_id);

create table public.item_estoque (
  id integer generated always as identity primary key,
  negocio_id integer not null references public.negocio(id) on delete cascade,
  nome varchar(120) not null,
  quantidade_atual integer not null default 0 check (quantidade_atual >= 0),
  unidade_medida varchar(20) not null default 'unidade',
  categoria varchar(60),
  quantidade_minima integer not null default 0 check (quantidade_minima >= 0)
);
create index item_estoque_negocio_idx on public.item_estoque (negocio_id, categoria);

create table public.item_venda (
  id integer generated always as identity primary key,
  negocio_id integer not null references public.negocio(id) on delete cascade,
  item_estoque_id integer unique references public.item_estoque(id) on delete set null,
  nome varchar(120) not null,
  descricao varchar(500),
  preco numeric(10,2) not null check (preco > 0),
  categoria varchar(60),
  imagem_url varchar(500),
  ativo boolean not null default true
);
create index item_venda_negocio_idx on public.item_venda (negocio_id, ativo);

create table public.pedido (
  id integer generated always as identity primary key,
  negocio_id integer not null references public.negocio(id) on delete cascade,
  cliente_nome varchar(120) not null,
  cliente_telefone varchar(20) not null,
  status varchar(15) not null default 'RECEBIDO'
    check (status in ('RECEBIDO','EM_PREPARO','CONCLUIDO','CANCELADO')),
  valor_total numeric(10,2) not null default 0 check (valor_total >= 0),
  criado_em timestamptz not null default now()
);
create index pedido_negocio_data_idx on public.pedido (negocio_id, criado_em desc);

create table public.item_pedido (
  id integer generated always as identity primary key,
  pedido_id integer not null references public.pedido(id) on delete cascade,
  item_venda_id integer references public.item_venda(id) on delete set null,
  nome_item varchar(120) not null,
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10,2) not null check (preco_unitario > 0)
);
create index item_pedido_pedido_idx on public.item_pedido (pedido_id);
create index item_pedido_item_venda_idx on public.item_pedido (item_venda_id);

create table public.movimentacao_estoque (
  id integer generated always as identity primary key,
  item_estoque_id integer not null references public.item_estoque(id) on delete cascade,
  usuario_id integer references public.usuario(id) on delete set null,
  tipo varchar(10) not null check (tipo in ('ENTRADA','SAIDA')),
  quantidade integer not null check (quantidade > 0),
  motivo varchar(255),
  data_movimentacao timestamptz not null default now(),
  constraint saida_exige_motivo check (tipo = 'ENTRADA' or length(trim(coalesce(motivo,''))) > 0)
);
create index mov_estoque_item_data_idx on public.movimentacao_estoque (item_estoque_id, data_movimentacao desc);
create index mov_estoque_usuario_idx on public.movimentacao_estoque (usuario_id);

create table public.config_agenda (
  negocio_id integer primary key references public.negocio(id) on delete cascade,
  duracao_padrao_min integer not null default 30 check (duracao_padrao_min > 0)
);

create table public.horario_expediente (
  id integer generated always as identity primary key,
  negocio_id integer not null references public.negocio(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6), -- 0 = domingo
  hora_inicio time not null,
  hora_fim time not null,
  check (hora_fim > hora_inicio),
  unique (negocio_id, dia_semana, hora_inicio)
);

create table public.agendamento (
  id integer generated always as identity primary key,
  negocio_id integer not null references public.negocio(id) on delete cascade,
  cliente_nome varchar(120) not null,
  cliente_telefone varchar(20) not null,
  cliente_email varchar(255),
  inicio timestamptz not null,
  status varchar(15) not null default 'PENDENTE'
    check (status in ('PENDENTE','CONFIRMADO','REMARCADO','CANCELADO')),
  criado_em timestamptz not null default now()
);
-- RF35: um unico agendamento CONFIRMADO por horario
create unique index agendamento_confirmado_uk on public.agendamento (negocio_id, inicio) where status = 'CONFIRMADO';
create index agendamento_negocio_inicio_idx on public.agendamento (negocio_id, inicio);
create index agendamento_telefone_idx on public.agendamento (negocio_id, cliente_telefone);

-- Seguranca: acesso so pelo backend (conexao direta). API publica do Supabase bloqueada.
alter table public.negocio enable row level security;
alter table public.usuario enable row level security;
alter table public.item_estoque enable row level security;
alter table public.item_venda enable row level security;
alter table public.pedido enable row level security;
alter table public.item_pedido enable row level security;
alter table public.movimentacao_estoque enable row level security;
alter table public.config_agenda enable row level security;
alter table public.horario_expediente enable row level security;
alter table public.agendamento enable row level security;

-- =====================================================================
-- Migration 2: conecta_autenticacao_apoio
-- =====================================================================

-- RF04: bloqueio de 15 min apos 5 senhas incorretas seguidas
-- RF09: Funcionario deve trocar a senha temporaria no primeiro acesso
alter table public.usuario
  add column tentativas_login_falhas smallint not null default 0 check (tentativas_login_falhas >= 0),
  add column bloqueado_ate timestamptz,
  add column deve_trocar_senha boolean not null default false;

-- RF05: link de redefinicao de senha (guarda so o hash SHA-256 do token, valido por 30 min, uso unico)
create table public.token_redefinicao_senha (
  id integer generated always as identity primary key,
  usuario_id integer not null references public.usuario(id) on delete cascade,
  token_hash varchar(64) not null unique,
  expira_em timestamptz not null,
  usado_em timestamptz,
  criado_em timestamptz not null default now(),
  check (expira_em > criado_em)
);
create index token_redefinicao_usuario_idx on public.token_redefinicao_senha (usuario_id);
alter table public.token_redefinicao_senha enable row level security;
