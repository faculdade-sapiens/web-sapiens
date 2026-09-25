"use strict";
/* =========================================================
   MAIN.JS — tabela de rotas + inicializacao da aplicacao
   Depende de todos os demais arquivos ja carregados antes
   (utils, icons, data, state, router, components, screens/*).
   ========================================================= */
const routes = [
  { path: "/", title: "Conecta+", screen: ScreenLanding },
  { path: "/login", title: "Entrar · Conecta+", screen: ScreenLogin },
  { path: "/cadastro", title: "Escolher perfil · Conecta+", screen: ScreenEscolherPerfil },
  { path: "/cadastro/cliente", title: "Criar conta · Conecta+", screen: ScreenCadastroCliente },
  { path: "/cadastro/empresa", title: "Cadastrar negócio · Conecta+", screen: ScreenCadastroEmpresa },
  { path: "/login/funcionario", title: "Acesso do funcionário · Conecta+", screen: ScreenLoginFuncionario },
  { path: "/fluxo-dados", title: "Fluxo de dados · Conecta+", screen: ScreenFluxoDados },

  { path: "/cliente", title: "Início · Conecta+", screen: ScreenClienteInicio },
  { path: "/cliente/cardapio", title: "Cardápio · Conecta+", screen: ScreenClienteCardapio },
  { path: "/cliente/produto/:id", title: "Produto · Conecta+", screen: ScreenClienteProduto },
  { path: "/cliente/carrinho", title: "Carrinho · Conecta+", screen: ScreenClienteCarrinho },
  { path: "/cliente/pedido-confirmado", title: "Pedido confirmado · Conecta+", screen: ScreenClientePedidoConfirmado },
  { path: "/cliente/pedidos", title: "Meus pedidos · Conecta+", screen: ScreenClienteMeusPedidos },
  { path: "/cliente/pedidos/:id", title: "Acompanhar pedido · Conecta+", screen: ScreenClienteAcompanharPedido },
  { path: "/cliente/conta", title: "Minha conta · Conecta+", screen: ScreenClienteConta },
  { path: "/cliente/perfil", title: "Perfil · Conecta+", screen: ScreenClientePerfil },

  { path: "/gerente", title: "Dashboard · Conecta+", screen: ScreenGerenteDashboard },
  { path: "/gerente/pedidos", title: "Pedidos · Conecta+", screen: ScreenGerentePedidos },
  { path: "/gerente/pedidos/novo", title: "Novo pedido · Conecta+", screen: ScreenGerenteNovoPedido },
  { path: "/gerente/clientes", title: "Clientes · Conecta+", screen: ScreenGerenteClientes },
  { path: "/gerente/clientes/:id", title: "Detalhes do cliente · Conecta+", screen: ScreenGerenteDetalhesCliente },
  { path: "/gerente/fiado", title: "Fiado · Conecta+", screen: ScreenGerenteFiado },
  { path: "/gerente/estoque", title: "Estoque · Conecta+", screen: ScreenGerenteEstoque },
  { path: "/gerente/caixa", title: "Caixa · Conecta+", screen: ScreenGerenteCaixa },
  { path: "/gerente/funcionarios", title: "Funcionários · Conecta+", screen: ScreenGerenteFuncionarios },
  { path: "/gerente/funcionarios/novo", title: "Adicionar funcionário · Conecta+", screen: ScreenGerenteAdicionarFuncionario },
  { path: "/gerente/relatorios", title: "Relatórios · Conecta+", screen: ScreenGerenteRelatorios },
  { path: "/gerente/configuracoes", title: "Configurações · Conecta+", screen: ScreenGerenteConfiguracoes },

  { path: "/funcionario", title: "Início · Conecta+", screen: ScreenFuncionarioInicio },
  { path: "/funcionario/pedidos", title: "Pedidos · Conecta+", screen: ScreenFuncionarioPedidos },
  { path: "/funcionario/clientes", title: "Clientes · Conecta+", screen: ScreenFuncionarioClientes },
  { path: "/funcionario/estoque", title: "Estoque · Conecta+", screen: ScreenFuncionarioEstoque },
  { path: "/funcionario/caixa", title: "Caixa · Conecta+", screen: ScreenFuncionarioCaixa },
];

window.addEventListener("popstate", render);
document.addEventListener("DOMContentLoaded", render);
