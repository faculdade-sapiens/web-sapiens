"use strict";
/* =========================================================
   STATE.JS — estado em memoria (sem localStorage / sem backend)
   Depende de data.js (funcoes seed*) ja carregado antes.
   // TODO(backend): substituir por dados vindos de uma API real
   ========================================================= */
const state = {
  produtos: seedProdutos(),
  clientes: seedClientes(),
  pedidos: seedPedidos(),
  funcionarios: seedFuncionarios(),
  movimentosCaixa: seedMovimentosCaixa(),
  carrinho: [],           // { produtoId, quantidade, observacao }
  meusPedidosCliente: seedMeusPedidosCliente(),
  ultimoPedidoCliente: null, // { numero, valor, forma, pedidoId }
  loginDemoPerfil: "gerente",
};

function getProduto(id) { return state.produtos.find(function (p) { return p.id === Number(id); }); }
function getCliente(id) { return state.clientes.find(function (c) { return c.id === Number(id); }); }
function getPedido(id) { return state.pedidos.find(function (p) { return p.id === Number(id); }); }

function statusBadgeClass(status) {
  switch (status) {
    case "Recebido": return "badge-neutral";
    case "Em preparo": return "badge-warning";
    case "Pronto": return "badge-info";
    case "Entregue": return "badge-success";
    case "Cancelado": return "badge-danger";
    case "Ativo": return "badge-success";
    case "Inativo": return "badge-neutral";
    case "Pago": return "badge-success";
    case "Em aberto": return "badge-orange";
    default: return "badge-neutral";
  }
}
const PROXIMO_STATUS = { "Recebido": "Em preparo", "Em preparo": "Pronto", "Pronto": "Entregue", "Entregue": "Entregue", "Cancelado": "Cancelado" };
const STATUS_ORDEM = ["Recebido", "Em preparo", "Pronto", "Entregue"];
