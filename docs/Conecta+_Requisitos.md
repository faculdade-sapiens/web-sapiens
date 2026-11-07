# Documento de Requisitos — Conecta+

**Versão:** 2.2

## 1. Visão Geral

O Conecta+ é um sistema web composto por **3 módulos independentes** — Mercado, Central de Controle de Estoque e Agenda Online — voltado exclusivamente para **microempreendedores** (comerciantes, prestadores de serviço e microempresários de pequeno porte) que hoje gerenciam seus negócios de forma manual, por caderno ou aplicativos de mensagem, sem uma ferramenta própria de gestão.

### 1.1 Atores do sistema

| Ator | Definição |
|---|---|
| **Gerente** | Usuário que cria a conta do negócio no Conecta+. Possui acesso irrestrito a todos os módulos e configurações vinculados à sua conta. |
| **Funcionário** | Usuário cadastrado pelo Gerente, vinculado à conta do negócio, com acesso restrito conforme permissões definidas. |
| **Cliente** | Pessoa que consome produtos/serviços do negócio pela vitrine pública. Não possui login no sistema, salvo indicação contrária em requisito específico. |

### 1.2 Escopo

Este documento cobre exclusivamente as funcionalidades destinadas a **um único tipo de negócio-alvo: o microempreendedor individual ou com pequena equipe**. Está fora do escopo deste projeto: gestão de ONGs/doações, produção rural em larga escala, ou qualquer funcionalidade voltada a organizações sem fins lucrativos.

---

## 2. Requisitos Funcionais (RF)

Requisitos funcionais descrevem **o que o sistema deve fazer**. Cada requisito abaixo é redigido de forma verificável: é possível testar se o sistema o cumpre ou não.

### 2.1 Autenticação e Conta do Negócio

| ID | Requisito |
|---|---|
| RF01 | O sistema deve permitir que um visitante crie uma conta de Gerente informando nome completo, e-mail, senha e nome do negócio. |
| RF02 | O sistema deve rejeitar o cadastro de uma conta com e-mail já existente na base de dados, exibindo mensagem de erro específica. |
| RF02A | O sistema deve permitir que o Gerente informe o CNPJ do negócio no cadastro ou posteriormente na edição dos dados da conta, sendo este campo de preenchimento opcional. |
| RF02B | O sistema deve validar o formato e o dígito verificador do CNPJ sempre que este campo for preenchido, rejeitando valores inválidos com mensagem de erro específica, sem impedir o cadastro caso o campo seja deixado em branco. |
| RF02C | O sistema deve rejeitar o cadastro de um CNPJ já vinculado a outra conta existente na base de dados, exibindo mensagem de erro específica. |
| RF03 | O sistema deve permitir que um usuário cadastrado (Gerente ou Funcionário) realize login informando e-mail e senha. |
| RF04 | O sistema deve bloquear o login após 5 tentativas consecutivas de senha incorreta para o mesmo e-mail, por um período de 15 minutos. |
| RF05 | O sistema deve permitir que o usuário solicite redefinição de senha por meio de um link enviado ao e-mail cadastrado, válido por até 30 minutos. |
| RF06 | O sistema deve permitir que o usuário logado encerre sua sessão (logout) a partir de qualquer página do sistema. |
| RF07 | O sistema deve permitir que o Gerente edite os dados do negócio: nome, telefone de contato, endereço, categoria de atuação e CNPJ. |

### 2.2 Gestão de Usuários e Perfis de Acesso

| ID | Requisito |
|---|---|
| RF08 | O sistema deve permitir que o Gerente cadastre um novo usuário do tipo Funcionário, informando nome, e-mail e senha temporária. |
| RF09 | O sistema deve exigir que o Funcionário defina uma nova senha no primeiro acesso após o cadastro feito pelo Gerente. |
| RF10 | O sistema deve permitir que o Gerente revogue o acesso de um Funcionário, impedindo login futuro imediatamente após a revogação. |
| RF11 | O sistema deve exibir, para cada usuário logado, somente os menus e funcionalidades permitidos ao seu perfil (Gerente ou Funcionário), conforme a matriz de permissões definida na Seção 4. |
| RF12 | O sistema deve impedir, mediante validação no servidor, que um usuário do tipo Funcionário execute qualquer ação de gestão de outros usuários (cadastro, edição ou revogação), mesmo que a requisição seja feita diretamente à API. |
| RF13 | O sistema deve registrar, para cada cadastro ou revogação de usuário, a data, hora e o e-mail do Gerente responsável pela ação. |

### 2.3 Módulo Mercado (Vitrine de Produtos e Serviços)

| ID | Requisito |
|---|---|
| RF14 | O sistema deve permitir que o Gerente ou Funcionário com permissão cadastre um item de venda (produto ou serviço) com: nome, descrição, preço em reais, categoria e, opcionalmente, uma imagem. |
| RF15 | O sistema deve permitir a edição e a exclusão de um item de venda previamente cadastrado. |
| RF16 | O sistema deve exibir uma vitrine pública, acessível por URL própria, sem exigência de login, listando todos os itens de venda ativos do negócio. |
| RF17 | O sistema deve permitir que o Cliente visualize, na vitrine, os detalhes de um item de venda: nome, descrição, preço e disponibilidade. |
| RF18 | O sistema deve permitir que o Cliente registre um pedido pela vitrine, informando nome e telefone de contato, sem necessidade de criar conta. |
| RF19 | O sistema deve exibir uma notificação em tela para o Gerente e Funcionários com permissão, em até 10 segundos após o registro de um novo pedido pelo Cliente. |
| RF20 | O sistema deve permitir que o Gerente ou Funcionário com permissão altere o status de um pedido entre os valores: "Recebido", "Em preparo", "Concluído" e "Cancelado". |
| RF21 | O sistema deve remover automaticamente da vitrine pública qualquer item de venda cuja quantidade em estoque vinculada seja igual a zero, quando esse item estiver associado a um registro do módulo de Estoque (RF25). |

### 2.4 Módulo Central de Controle de Estoque

| ID | Requisito |
|---|---|
| RF22 | O sistema deve permitir o cadastro de um item de estoque com: nome, quantidade atual, unidade de medida (ex: unidade, kg, litro), categoria e quantidade mínima de alerta. |
| RF23 | O sistema deve permitir a edição e a exclusão de um item de estoque previamente cadastrado. |
| RF24 | O sistema deve permitir o registro manual de entrada de quantidade em um item de estoque, informando a quantidade adicionada e a data da movimentação. |
| RF25 | O sistema deve permitir a associação opcional entre um item de estoque e um item de venda do módulo Mercado. |
| RF26 | O sistema deve subtrair automaticamente a quantidade correspondente do item de estoque associado sempre que um pedido vinculado a ele tiver o status alterado para "Concluído" (RF20). |
| RF27 | O sistema deve permitir o registro manual de saída de quantidade em um item de estoque, para casos de perda, descarte ou ajuste, informando o motivo e a data. |
| RF28 | O sistema deve exibir um alerta visual na tela de estoque sempre que a quantidade atual de um item for menor ou igual à sua quantidade mínima de alerta. |
| RF29 | O sistema deve permitir a consulta do histórico de movimentações (entradas e saídas) de um item de estoque específico, exibindo data, tipo de movimentação, quantidade e responsável pela ação. |
| RF30 | O sistema deve permitir a filtragem da lista de itens de estoque por nome, categoria e status ("Normal", "Baixo" ou "Esgotado"). |

### 2.5 Módulo Agenda Online

| ID | Requisito |
|---|---|
| RF31 | O sistema deve permitir que o Gerente configure os dias da semana e os horários de início e término do expediente disponíveis para agendamento. |
| RF32 | O sistema deve permitir que o Gerente defina a duração padrão de um atendimento, em minutos, usada para calcular os horários disponíveis. |
| RF33 | O sistema deve permitir que o Cliente visualize, em uma página pública, os horários disponíveis para agendamento nos próximos 30 dias. |
| RF34 | O sistema deve permitir que o Cliente solicite um agendamento em um horário disponível, informando nome e telefone de contato e, opcionalmente, e-mail. |
| RF35 | O sistema deve impedir o registro de dois agendamentos confirmados no mesmo horário, rejeitando a segunda tentativa com mensagem de erro. |
| RF36 | O sistema deve exibir, para o Gerente e Funcionários com permissão, a agenda em formato de calendário com visualização diária e semanal. |
| RF37 | O sistema deve permitir que o Gerente ou Funcionário com permissão altere o status de um agendamento entre os valores: "Pendente", "Confirmado", "Remarcado" e "Cancelado". |
| RF38 | O sistema deve enviar uma notificação por e-mail ao Cliente que tiver informado e-mail sempre que o status do seu agendamento for alterado para "Confirmado", "Remarcado" ou "Cancelado". Se o Cliente não informou e-mail, nenhuma notificação é enviada. |
| RF39 | O sistema deve permitir a consulta do histórico de agendamentos anteriores associados a um mesmo número de telefone de Cliente. |

### 2.6 Módulo de Relatórios

| ID | Requisito |
|---|---|
| RF40 | O sistema deve gerar um relatório listando todos os pedidos registrados em um intervalo de datas selecionado pelo usuário, com status e valor de cada pedido. |
| RF41 | O sistema deve gerar um relatório listando todas as movimentações de estoque registradas em um intervalo de datas selecionado pelo usuário. |
| RF42 | O sistema deve gerar um relatório listando todos os agendamentos registrados em um intervalo de datas selecionado pelo usuário, agrupados por status. |
| RF43 | O sistema deve permitir a exportação de qualquer um dos relatórios acima em formato PDF, mantendo a formatação em tabela. |

---

## 3. Requisitos Não Funcionais (RNF)

Requisitos não funcionais descrevem **como o sistema deve se comportar**, com critérios mensuráveis sempre que aplicável.

### 3.1 Usabilidade

| ID | Requisito |
|---|---|
| RNF01 | Cada uma das seguintes ações deve ser executável em, no máximo, 3 cliques a partir da tela inicial do sistema logado: cadastrar item de venda, registrar movimentação de estoque, visualizar agenda do dia. |
| RNF02 | O sistema deve exibir corretamente todas as suas páginas em resoluções de tela a partir de 360px de largura (smartphone) até 1920px (desktop), sem sobreposição de elementos ou necessidade de rolagem horizontal. |
| RNF03 | Todos os textos de botões, rótulos e mensagens de erro do sistema devem usar linguagem em português coloquial, sem termos técnicos de tecnologia da informação. |

### 3.2 Desempenho

| ID | Requisito |
|---|---|
| RNF04 | O sistema deve retornar o resultado de qualquer operação de consulta ou cadastro em, no máximo, 3 segundos, em conexão de internet com velocidade igual ou superior a 10 Mbps. |
| RNF05 | O sistema deve suportar, no mínimo, 50 usuários realizando ações simultaneamente sem aumento perceptível (acima de 1 segundo) no tempo de resposta médio. |

### 3.3 Segurança

| ID | Requisito |
|---|---|
| RNF06 | O sistema deve armazenar todas as senhas de usuários utilizando função de hash criptográfico (ex: bcrypt), nunca em texto plano. |
| RNF07 | O sistema deve disponibilizar todas as suas páginas exclusivamente via protocolo HTTPS, redirecionando automaticamente qualquer tentativa de acesso via HTTP. |
| RNF08 | O sistema deve validar, no servidor, as permissões de acesso de cada requisição recebida, independentemente das restrições já aplicadas na interface do usuário. |
| RNF09 | O sistema deve encerrar automaticamente a sessão de um usuário logado após 30 minutos de inatividade. |
| RNF10 | O sistema deve tratar os dados pessoais de Clientes e usuários em conformidade com a Lei Geral de Proteção de Dados (LGPD), coletando apenas os dados estritamente necessários para cada funcionalidade descrita neste documento. |

### 3.4 Disponibilidade e Confiabilidade

| ID | Requisito |
|---|---|
| RNF11 | O sistema deve manter disponibilidade mínima de 99% do tempo mensal, excluídas janelas de manutenção previamente comunicadas. |
| RNF12 | O sistema deve realizar backup automático da base de dados uma vez por dia. |
| RNF13 | O sistema deve validar o formato e o preenchimento obrigatório de todos os campos de formulário tanto no navegador (frontend) quanto no servidor (backend), rejeitando dados inválidos em ambas as camadas. |

### 3.5 Compatibilidade

| ID | Requisito |
|---|---|
| RNF14 | O sistema deve funcionar corretamente nas duas versões mais recentes dos navegadores Google Chrome, Mozilla Firefox e Microsoft Edge. |
| RNF15 | O sistema deve ser inteiramente acessível por navegador web, sem exigir a instalação de aplicativo nativo em nenhum dispositivo. |

### 3.6 Manutenibilidade e Escalabilidade

| ID | Requisito |
|---|---|
| RNF16 | O código-fonte do sistema deve seguir o padrão arquitetural MVC (Model-View-Controller), com separação clara entre as três camadas. |
| RNF17 | O sistema deve permitir que o Gerente utilize apenas um ou dois dos três módulos (Mercado, Estoque, Agenda), sem que os módulos não utilizados afetem o funcionamento dos demais. |

### 3.7 Custo

| ID | Requisito |
|---|---|
| RNF18 | A infraestrutura de hospedagem e os serviços de terceiros utilizados pelo sistema devem operar dentro dos limites de camadas gratuitas (free tier) ou de custo total mensal inferior a R$ 50,00 durante o desenvolvimento do projeto acadêmico. |

---

## 4. Matriz de Permissões por Perfil

| Ação | Gerente | Funcionário |
|---|---|---|
| Cadastrar/editar/excluir item de venda | Sim | Sim |
| Cadastrar/editar/excluir item de estoque | Sim | Sim |
| Excluir item de estoque | Sim | Não |
| Registrar movimentação de estoque | Sim | Sim |
| Alterar status de pedido | Sim | Sim |
| Alterar status de agendamento | Sim | Sim |
| Configurar horários da agenda | Sim | Não |
| Cadastrar/revogar Funcionário | Sim | Não |
| Editar dados do negócio | Sim | Não |
| Visualizar relatórios | Sim | Não |

> Nota: esta matriz é a referência oficial para os RF11 e RF12. Qualquer alteração de permissão deve ser refletida aqui antes de ser implementada.

---

## 5. Regras de Negócio Complementares

| ID | Regra |
|---|---|
| RN01 | Um item de venda só pode ser associado a, no máximo, um item de estoque. |
| RN02 | Um agendamento com status "Cancelado" não pode ser remarcado; deve ser criado um novo agendamento. |
| RN03 | O preço de um item de venda deve ser um valor numérico maior que zero. |
| RN04 | A quantidade mínima de alerta de um item de estoque não pode ser negativa. |

---

## 6. Fora de Escopo (Explicitamente Excluído)

Para evitar ambiguidade sobre os limites do sistema, ficam explicitamente **fora do escopo** deste projeto:

- Pagamento online integrado (o sistema registra o pedido, mas não processa transações financeiras).
- Aplicativo mobile nativo (iOS/Android) — apenas versão web responsiva.
- Funcionalidades voltadas a ONGs, doações ou produção rural em larga escala.
- Múltiplos negócios sob uma mesma conta de Gerente (cada conta representa um único negócio).
- Chat ou mensageria interna entre Cliente e negócio.

---

## 7. Histórico de Versões

| Versão | Data | Alteração |
|---|---|---|
| 1.0 | — | Versão inicial, com público-alvo amplo (produtores rurais, ONGs, autônomos). |
| 2.0 | — | Escopo nichado exclusivamente para microempreendedores; requisitos reescritos para eliminar ambiguidades e adicionar critérios verificáveis; adição da Matriz de Permissões, Regras de Negócio e seção Fora de Escopo. |
| 2.1 | — | Adicionado campo de CNPJ (opcional) no cadastro e edição da conta do negócio, com validação de formato e unicidade (RF02A, RF02B, RF02C). |
| 2.2 | 07/11/2026 | RN02 restrita a agendamentos "Cancelado"; e-mail opcional no agendamento (RF34) e notificação por e-mail só para Clientes que informaram e-mail (RF38). |
