"use strict";
/* =========================================================
   SCREENS/FUNCIONARIO.JS — telas do app do Funcionario
   (inicio, pedidos, clientes, estoque, caixa)
   ========================================================= */
const FUNCIONARIO_NAV = [
  { id: "inicio", label: "Início", icon: "home", href: "/funcionario" },
  { id: "pedidos", label: "Pedidos", icon: "clipboard", href: "/funcionario/pedidos" },
  { id: "clientes", label: "Clientes", icon: "users", href: "/funcionario/clientes" },
  { id: "estoque", label: "Estoque", icon: "box", href: "/funcionario/estoque" },
  { id: "caixa", label: "Caixa", icon: "cash", href: "/funcionario/caixa" },
];
function funcionarioShell(activeId, title, contentHtml) {
  return '<div class="app-shell fade-in">' + sidebarHtml(activeId, FUNCIONARIO_NAV, "Funcionário") +
    '<div class="app-main">' + topbarHtml(title, null) + '<div class="app-content">' + contentHtml + "</div></div></div>";
}

const ScreenFuncionarioInicio = {
  render: function () {
    const emPreparo = state.pedidos.filter(function (p) { return p.status === "Em preparo"; }).length;
    const prontos = state.pedidos.filter(function (p) { return p.status === "Pronto"; }).length;
    const pendentes = state.pedidos.filter(function (p) { return p.status !== "Entregue" && p.status !== "Cancelado"; });
    const content =
      '<div class="screen-head"><h2>Olá, Ana!</h2><p>Bem-vinda ao Restaurante Sabor Caseiro.</p></div>' +
      '<div class="stat-grid stat-grid-3">' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Pedidos em preparo</span><span class="stat-card-icon">' + icon("clock") + '</span></div><div class="stat-card-value">' + emPreparo + '</div></div>' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Pedidos prontos</span><span class="stat-card-icon">' + icon("checkCircle") + '</span></div><div class="stat-card-value">' + prontos + '</div></div>' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Vendas registradas hoje</span><span class="stat-card-icon">' + icon("cash") + '</span></div><div class="stat-card-value">' + state.movimentosCaixa.filter(function (m) { return m.tipo === "Entrada"; }).length + '</div></div>' +
      "</div>" +
      '<div class="card card-pad"><p style="font-weight:700;margin-bottom:14px;">Ações rápidas</p><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">' +
      FUNCIONARIO_NAV.filter(function (n) { return n.id !== "inicio"; }).map(function (n) {
        return '<button type="button" class="shortcut-btn" style="border:1px solid var(--gray-100);border-radius:12px;" data-href="' + n.href + '"><span class="icon-wrap">' + icon(n.icon) + '</span><span class="label">' + n.label + "</span></button>";
      }).join("") + "</div></div>" +
      '<div class="card"><div style="padding:16px 20px;border-bottom:1px solid var(--gray-100);"><p style="font-weight:700;">Pedidos pendentes</p></div>' +
      pendentes.map(function (p) {
        return '<div class="list-row" style="padding:14px 20px;"><div><p style="font-weight:600;font-size:.875rem;">' + escapeHtml(p.cliente) + '</p><p style="font-size:.75rem;color:var(--text-secondary);">' + escapeHtml(p.itens) + " · " + p.horario + "</p></div><div style=\"display:flex;align-items:center;gap:12px;\">" + badgeHtml(p.status) + '<button type="button" class="btn-link" data-href="/funcionario/pedidos">Atualizar</button></div></div>';
      }).join("") + "</div>";
    return funcionarioShell("inicio", "Início", content);
  }
};

const ScreenFuncionarioPedidos = {
  render: function () {
    const content =
      '<div class="screen-head"><h2>Pedidos</h2></div>' +
      '<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Número</th><th>Cliente</th><th>Itens</th><th>Valor</th><th>Status</th></tr></thead><tbody id="fpTbody"></tbody></table></div></div>';
    return funcionarioShell("pedidos", "Pedidos", content);
  },
  bind: function () {
    qs("#fpTbody").innerHTML = state.pedidos.map(function (p) {
      return "<tr><td style=\"font-weight:600;color:var(--blue-primary);\">" + p.numero + "</td><td>" + escapeHtml(p.cliente) + "</td><td>" + escapeHtml(p.itens) + "</td><td>" + formatBRL(p.valor) + "</td><td>" + pedidoStatusButtonHtml(p) + "</td></tr>";
    }).join("");
    bindPedidoStatusButtons();
  }
};

const ScreenFuncionarioClientes = {
  render: function () {
    const content =
      '<div class="screen-head"><h2>Clientes</h2></div>' +
      '<div class="card"><div style="padding:16px;border-bottom:1px solid var(--gray-100);"><input type="search" class="search-input" id="fcBusca" placeholder="Buscar cliente..." aria-label="Buscar cliente"></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Nome</th><th>Telefone</th><th>Última compra</th><th>Saldo</th></tr></thead><tbody id="fcTbody"></tbody></table></div></div>';
    return funcionarioShell("clientes", "Clientes", content);
  },
  bind: function () {
    const tbody = qs("#fcTbody");
    function renderRows(busca) {
      const filtrados = state.clientes.filter(function (c) { return c.nome.toLowerCase().indexOf((busca || "").toLowerCase()) !== -1; });
      tbody.innerHTML = filtrados.map(function (c) {
        return "<tr><td>" + escapeHtml(c.nome) + "</td><td>" + c.telefone + "</td><td>" + c.ultimaCompra + "</td><td>" +
          (c.saldoDevedor > 0 ? '<span style="font-weight:600;color:var(--orange);">' + formatBRL(c.saldoDevedor) + "</span>" : '<span style="color:var(--success);font-weight:600;font-size:.75rem;">Quitado</span>') + "</td></tr>";
      }).join("");
    }
    qs("#fcBusca").addEventListener("input", function (e) { renderRows(e.target.value); });
    renderRows("");
  }
};

const ScreenFuncionarioEstoque = {
  render: function () {
    const content =
      '<div class="screen-head"><h2>Estoque</h2></div>' +
      '<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Produto</th><th>Categoria</th><th>Quantidade</th><th>Status</th></tr></thead><tbody>' +
      state.produtos.map(function (p) {
        const info = estoqueStatusInfo(p);
        return "<tr><td>" + escapeHtml(p.nome) + "</td><td>" + escapeHtml(p.categoria) + "</td><td style=\"font-weight:600;\">" + p.quantidade + "</td><td>" + badgeHtml(info.label, info.cls) + "</td></tr>";
      }).join("") +
      "</tbody></table></div></div>";
    return funcionarioShell("estoque", "Estoque", content);
  }
};

const ScreenFuncionarioCaixa = {
  render: function () {
    const movs = state.movimentosCaixa.filter(function (m) { return m.responsavel !== "João (Gerente)"; });
    const entradas = movs.filter(function (m) { return m.tipo === "Entrada"; }).reduce(function (s, m) { return s + m.valor; }, 0);
    const saidas = movs.filter(function (m) { return m.tipo === "Saída"; }).reduce(function (s, m) { return s + m.valor; }, 0);
    const content =
      '<div class="screen-head"><h2>Caixa</h2></div>' +
      '<div class="stat-grid stat-grid-3">' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Entradas hoje</span><span class="stat-card-icon">' + icon("trendUp") + '</span></div><div class="stat-card-value">' + formatBRL(entradas) + '</div></div>' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Saídas hoje</span><span class="stat-card-icon">' + icon("trendDown") + '</span></div><div class="stat-card-value">' + formatBRL(saidas) + '</div></div>' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Saldo atual</span><span class="stat-card-icon">' + icon("cash") + '</span></div><div class="stat-card-value">' + formatBRL(entradas - saidas) + '</div></div>' +
      "</div>" +
      '<div class="card"><div style="padding:16px 20px;border-bottom:1px solid var(--gray-100);"><p style="font-weight:700;">Movimentações do dia</p></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Horário</th><th>Descrição</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>' +
      movs.map(function (m) {
        return "<tr><td>" + m.horario + "</td><td>" + escapeHtml(m.descricao) + "</td><td>" + badgeHtml(m.tipo, m.tipo === "Entrada" ? "badge-success" : "badge-danger") + '</td><td style="font-weight:700;color:' + (m.tipo === "Entrada" ? "var(--success)" : "var(--danger)") + ';">' + (m.tipo === "Entrada" ? "+" : "-") + formatBRL(m.valor) + "</td></tr>";
      }).join("") +
      "</tbody></table></div></div>";
    return funcionarioShell("caixa", "Caixa", content);
  }
};

