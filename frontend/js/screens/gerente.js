"use strict";
/* =========================================================
   SCREENS/GERENTE.JS — telas do app do Gerente
   (dashboard, pedidos, novo pedido, clientes, detalhes do
   cliente, fiado, estoque, caixa, funcionarios, adicionar
   funcionario, relatorios, configuracoes)
   ========================================================= */
const GERENTE_NAV = [
  { id: "dashboard", label: "Dashboard", icon: "chart", href: "/gerente" },
  { id: "pedidos", label: "Pedidos", icon: "clipboard", href: "/gerente/pedidos" },
  { id: "clientes", label: "Clientes", icon: "users", href: "/gerente/clientes" },
  { id: "fiado", label: "Fiado", icon: "handshake", href: "/gerente/fiado" },
  { id: "estoque", label: "Estoque", icon: "box", href: "/gerente/estoque" },
  { id: "caixa", label: "Caixa", icon: "cash", href: "/gerente/caixa" },
  { id: "funcionarios", label: "Funcionários", icon: "user", href: "/gerente/funcionarios" },
  { id: "relatorios", label: "Relatórios", icon: "trendUp", href: "/gerente/relatorios" },
  { id: "configuracoes", label: "Configurações", icon: "gear", href: "/gerente/configuracoes" },
];
function gerenteShell(activeId, title, backHref, contentHtml) {
  return '<div class="app-shell fade-in">' + sidebarHtml(activeId, GERENTE_NAV, "Gerente") +
    '<div class="app-main">' + topbarHtml(title, backHref) + '<div class="app-content">' + contentHtml + "</div></div></div>";
}
const ScreenGerenteDashboard = {
  render: function () {
    const bars = [65, 80, 45, 90, 70, 55, 85];
    const dias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const devendo = state.clientes.filter(function (c) { return c.saldoDevedor > 0; });
    const totalReceber = devendo.reduce(function (s, c) { return s + c.saldoDevedor; }, 0);
    const content =
      '<div class="screen-head"><h2>Olá, João!</h2><p>Aqui está um resumo do seu negócio hoje.</p></div>' +
      '<div class="stat-grid">' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Vendas hoje</span><span class="stat-card-icon">' + icon("cash") + '</span></div><div class="stat-card-value">R$ 1.250</div><div class="stat-card-trend">+12% vs ontem</div></div>' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Pedidos</span><span class="stat-card-icon">' + icon("clipboard") + '</span></div><div class="stat-card-value">' + state.pedidos.length + '</div><div class="stat-card-trend">+3 pedidos</div></div>' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Clientes</span><span class="stat-card-icon">' + icon("users") + '</span></div><div class="stat-card-value">' + state.clientes.length + '</div><div class="stat-card-trend">+8 novos</div></div>' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">A receber (fiado)</span><span class="stat-card-icon">' + icon("handshake") + '</span></div><div class="stat-card-value">' + formatBRL(totalReceber) + "</div><div class=\"stat-card-trend\">" + devendo.length + " clientes</div></div>" +
      "</div>" +
      '<div class="card card-pad"><p style="font-weight:700;margin-bottom:16px;">Vendas da semana</p><div class="bars-chart">' +
      bars.map(function (h, i) { return '<div class="bar-col"><div class="bar" style="height:' + h + '%;"></div><span class="bar-label">' + dias[i] + "</span></div>"; }).join("") +
      "</div></div>" +
      '<div class="dashboard-cols">' +
      '<div class="card"><div style="padding:16px 20px;border-bottom:1px solid var(--gray-100);display:flex;justify-content:space-between;align-items:center;"><p style="font-weight:700;">Pedidos recentes</p><button type="button" class="btn-link" data-href="/gerente/pedidos">Ver todos</button></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Cliente</th><th>Itens</th><th>Valor</th><th>Status</th></tr></thead><tbody>' +
      state.pedidos.slice(0, 4).map(function (p) { return "<tr><td>" + escapeHtml(p.cliente) + "</td><td>" + escapeHtml(p.itens) + "</td><td>" + formatBRL(p.valor) + "</td><td>" + badgeHtml(p.status) + "</td></tr>"; }).join("") +
      "</tbody></table></div></div>" +
      '<div style="display:flex;flex-direction:column;gap:16px;">' +
      '<div class="card card-pad"><p style="font-weight:700;margin-bottom:12px;">Clientes em aberto</p>' +
      devendo.map(function (c) { return '<div class="list-row"><span style="font-size:.875rem;font-weight:500;">' + escapeHtml(c.nome) + '</span><span style="font-size:.875rem;font-weight:700;color:var(--orange);">' + formatBRL(c.saldoDevedor) + "</span></div>"; }).join("") +
      "</div>" +
      '<div class="card card-pad"><p style="font-weight:700;margin-bottom:12px;">Mais vendidos</p>' +
      ["Marmita tradicional", "Refrigerante", "Batata frita"].map(function (n, i) {
        return '<div class="list-row"><span class="avatar avatar-circle" style="width:24px;height:24px;font-size:.6875rem;background:var(--blue-light);color:var(--blue-primary);">' + (i + 1) + '</span><span style="font-size:.875rem;">' + n + "</span></div>";
      }).join("") +
      "</div></div></div>";
    return gerenteShell("dashboard", "Dashboard", null, content);
  }
};

const ScreenGerentePedidos = {
  render: function () {
    const content =
      '<div class="screen-head-row"><div class="screen-head"><h2>Pedidos</h2><p>Gerencie os pedidos do dia.</p></div>' +
      '<button type="button" class="btn btn-primary" data-href="/gerente/pedidos/novo">' + icon("plus", "icon-sm") + "Novo pedido</button></div>" +
      '<div class="card"><div style="padding:16px;border-bottom:1px solid var(--gray-100);display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;">' +
      '<div class="chip-row" id="gpFiltro">' + ["Todos", "Em preparo", "Prontos", "Entregues", "Cancelados"].map(function (f) {
        return '<button class="chip' + (f === "Todos" ? " active" : "") + '" data-filtro="' + f + '">' + f + "</button>";
      }).join("") + "</div>" +
      '<input type="search" class="search-input" style="max-width:220px;" id="gpBusca" placeholder="Buscar pedido, cliente..." aria-label="Buscar pedido">' +
      "</div>" +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Número</th><th>Cliente</th><th>Itens</th><th>Valor</th><th>Status</th></tr></thead><tbody id="gpTbody"></tbody></table></div></div>';
    return gerenteShell("pedidos", "Pedidos", null, content);
  },
  bind: function () {
    let filtro = "Todos", busca = "";
    const tbody = qs("#gpTbody");
    function renderRows() {
      const filtrados = state.pedidos.filter(function (p) {
        const matchFiltro = filtro === "Todos" ||
          (filtro === "Em preparo" && p.status === "Em preparo") ||
          (filtro === "Prontos" && p.status === "Pronto") ||
          (filtro === "Entregues" && p.status === "Entregue") ||
          (filtro === "Cancelados" && p.status === "Cancelado");
        const matchBusca = p.cliente.toLowerCase().indexOf(busca.toLowerCase()) !== -1 || p.numero.indexOf(busca) !== -1;
        return matchFiltro && matchBusca;
      });
      tbody.innerHTML = filtrados.map(function (p) {
        return "<tr><td style=\"font-weight:600;color:var(--blue-primary);\">" + p.numero + "</td><td>" + escapeHtml(p.cliente) + "</td><td>" + escapeHtml(p.itens) + "</td><td>" + formatBRL(p.valor) + "</td><td>" + pedidoStatusButtonHtml(p) + "</td></tr>";
      }).join("") || '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);">Nenhum pedido encontrado.</td></tr>';
      bindPedidoStatusButtons();
    }
    qsa("#gpFiltro .chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        filtro = chip.getAttribute("data-filtro");
        qsa("#gpFiltro .chip").forEach(function (c) { c.classList.toggle("active", c === chip); });
        renderRows();
      });
    });
    qs("#gpBusca").addEventListener("input", function (e) { busca = e.target.value; renderRows(); });
    renderRows();
  }
};

const ScreenGerenteNovoPedido = {
  render: function () {
    const content =
      '<div style="max-width:640px;margin:0 auto;width:100%;"><h2 style="font-size:1.25rem;margin-bottom:20px;">Novo pedido</h2>' +
      '<div class="card card-pad" style="display:flex;flex-direction:column;gap:16px;">' +
      '<div class="field-row">' +
      '<div class="field"><label for="npCliente">Cliente</label><select id="npCliente"><option value="">Selecionar cliente...</option>' + state.clientes.map(function (c) { return '<option value="' + c.id + '">' + escapeHtml(c.nome) + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="npProduto">Produto</label><select id="npProduto">' + state.produtos.map(function (p) { return '<option value="' + p.id + '">' + escapeHtml(p.nome) + " — " + formatBRL(p.preco) + "</option>"; }).join("") + "</select></div>" +
      "</div>" +
      '<div class="field-row">' +
      '<div class="field"><label for="npQtd">Quantidade</label><input type="number" id="npQtd" min="1" value="1"></div>' +
      '<div class="field"><label>Forma de pagamento</label><div class="chip-row" id="npPagamento">' + ["Dinheiro", "Pix", "Cartão", "Fiado"].map(function (f, i) { return '<button type="button" class="chip' + (i === 1 ? " active" : "") + '" data-pag="' + f + '">' + f + "</button>"; }).join("") + "</div></div>" +
      "</div>" +
      '<div id="npFiadoAviso" hidden class="low-stock-note">Este valor será adicionado ao saldo devedor do cliente.</div>' +
      '<div class="field"><label for="npObs">Observação</label><input type="text" id="npObs" placeholder="Alguma observação sobre o pedido..."></div>' +
      '<div style="display:flex;gap:12px;"><button type="button" class="btn btn-outline btn-block" data-href="/gerente/pedidos">Cancelar</button>' +
      '<button type="button" class="btn btn-primary btn-block" id="npSubmit">Registrar pedido</button></div>' +
      "</div></div>";
    return gerenteShell("pedidos", "Novo Pedido", "/gerente/pedidos", content);
  },
  bind: function () {
    let pagamento = "Pix";
    const aviso = qs("#npFiadoAviso");
    qsa("#npPagamento .chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        pagamento = chip.getAttribute("data-pag");
        qsa("#npPagamento .chip").forEach(function (c) { c.classList.toggle("active", c === chip); });
        aviso.hidden = pagamento !== "Fiado";
      });
    });
    qs("#npSubmit").addEventListener("click", function () {
      const clienteId = qs("#npCliente").value;
      const produto = getProduto(qs("#npProduto").value);
      const qtd = Math.max(1, Number(qs("#npQtd").value) || 1);
      const cliente = clienteId ? getCliente(clienteId) : null;
      const valor = produto.preco * qtd;
      const numero = "#" + String(state.pedidos.length + 1).padStart(3, "0");
      const novoPedido = {
        id: nextId(), numero: numero, cliente: cliente ? cliente.nome : "Cliente avulso",
        itens: (qtd > 1 ? qtd + "x " : "") + produto.nome, valor: valor, horario: formatTimePt(), status: "Recebido", data: formatDatePt(),
      };
      state.pedidos.unshift(novoPedido);
      if (pagamento === "Fiado" && cliente) {
        cliente.saldoDevedor += valor;
      } else {
        state.movimentosCaixa.unshift({ id: nextId(), horario: formatTimePt(), descricao: "Venda Pedido " + numero, tipo: "Entrada", valor: valor, responsavel: "João (Gerente)" });
      }
      navigate("/gerente/pedidos");
    });
  }
};

const ScreenGerenteClientes = {
  render: function () {
    const content =
      '<div class="screen-head-row"><div class="screen-head"><h2>Clientes</h2><p>' + state.clientes.length + ' clientes cadastrados</p></div>' +
      '<button type="button" class="btn btn-primary" data-toast="Funcionalidade disponível em breve.">' + icon("plus", "icon-sm") + "Cadastrar cliente</button></div>" +
      '<div class="card"><div style="padding:16px;border-bottom:1px solid var(--gray-100);"><input type="search" class="search-input" id="gcBusca" placeholder="Buscar cliente..." aria-label="Buscar cliente"></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Nome</th><th>Telefone</th><th>Última compra</th><th>Total gasto</th><th>Saldo em aberto</th></tr></thead><tbody id="gcTbody"></tbody></table></div></div>';
    return gerenteShell("clientes", "Clientes", null, content);
  },
  bind: function () {
    const tbody = qs("#gcTbody");
    function renderRows(busca) {
      const filtrados = state.clientes.filter(function (c) { return c.nome.toLowerCase().indexOf((busca || "").toLowerCase()) !== -1; });
      tbody.innerHTML = filtrados.map(function (c) {
        return '<tr style="cursor:pointer;" data-href="/gerente/clientes/' + c.id + '"><td>' + escapeHtml(c.nome) + "</td><td>" + c.telefone + "</td><td>" + c.ultimaCompra + "</td><td>" + formatBRL(c.totalGasto) + "</td><td>" +
          (c.saldoDevedor > 0 ? '<span style="font-weight:600;color:var(--orange);">' + formatBRL(c.saldoDevedor) + "</span>" : '<span style="color:var(--success);font-weight:600;">Quitado</span>') +
          "</td></tr>";
      }).join("");
    }
    qs("#gcBusca").addEventListener("input", function (e) { renderRows(e.target.value); });
    renderRows("");
  }
};

const ScreenGerenteDetalhesCliente = {
  render: function (params) {
    const cliente = getCliente(params.id) || state.clientes[0];
    const historico = [
      { data: "12/09/2026", desc: "X-Tudo + Refri", valor: 35.00, tipo: "Fiado" },
      { data: "10/09/2026", desc: "Marmita", valor: 28.00, tipo: "Pago" },
      { data: "08/09/2026", desc: "X-Bacon", valor: 32.00, tipo: "Pago" },
    ];
    const content =
      '<div style="display:flex;flex-direction:column;gap:16px;">' +
      '<div class="field-row-sm2" style="display:grid;gap:16px;">' +
      '<div class="card card-pad"><div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;"><div class="avatar" style="width:48px;height:48px;font-size:1.125rem;">' + initialLetter(cliente.nome) + '</div><div><p style="font-weight:700;font-size:1.0625rem;">' + escapeHtml(cliente.nome) + "</p><p style=\"font-size:.875rem;color:var(--text-secondary);\">" + cliente.telefone + "</p></div></div>" +
      '<div class="list-row"><span style="font-size:.875rem;color:var(--text-secondary);">Data de cadastro</span><span style="font-size:.875rem;font-weight:600;">' + cliente.dataCadastro + "</span></div>" +
      '<div class="list-row"><span style="font-size:.875rem;color:var(--text-secondary);">Última compra</span><span style="font-size:.875rem;font-weight:600;">' + cliente.ultimaCompra + "</span></div>" +
      '<div class="list-row"><span style="font-size:.875rem;color:var(--text-secondary);">Total gasto</span><span style="font-size:.875rem;font-weight:600;">' + formatBRL(cliente.totalGasto) + "</span></div>" +
      "</div>" +
      '<div class="card card-pad" style="background:linear-gradient(120deg,var(--blue-primary),#3B82F6);color:#fff;"><p style="font-size:.875rem;opacity:.85;">Saldo devedor</p><p style="font-size:1.75rem;font-weight:800;margin:6px 0 14px;" id="gdcSaldo">' + formatBRL(cliente.saldoDevedor) + '</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;"><button type="button" class="btn" style="background:rgba(255,255,255,.2);color:#fff;" data-toast="Funcionalidade disponível em breve.">Registrar compra</button>' +
      '<button type="button" class="btn btn-white" id="gdcPagarBtn">Registrar pagamento</button></div></div>' +
      "</div>" +
      '<div class="card"><div style="padding:16px 20px;border-bottom:1px solid var(--gray-100);"><p style="font-weight:700;">Histórico de compras</p></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Tipo</th></tr></thead><tbody>' +
      historico.map(function (h) { return "<tr><td>" + h.data + "</td><td>" + escapeHtml(h.desc) + "</td><td>" + formatBRL(h.valor) + "</td><td>" + badgeHtml(h.tipo === "Pago" ? "Pago" : "Em aberto") + "</td></tr>"; }).join("") +
      "</tbody></table></div></div></div>";
    return gerenteShell("clientes", "Detalhes do Cliente", "/gerente/clientes", content);
  },
  bind: function (params) {
    const cliente = getCliente(params.id) || state.clientes[0];
    const pagarBtn = qs("#gdcPagarBtn");
    if (pagarBtn) pagarBtn.addEventListener("click", function () {
      openModal("Registrar pagamento",
        '<div class="field"><label for="gdcValor">Valor recebido</label><input type="number" id="gdcValor" placeholder="0,00" min="0" step="0.01"></div>' +
        '<div class="field"><label for="gdcForma">Forma de pagamento</label><select id="gdcForma"><option>Pix</option><option>Dinheiro</option><option>Cartão</option></select></div>',
        '<button type="button" class="btn btn-outline btn-block" data-modal-close>Cancelar</button><button type="button" class="btn btn-primary btn-block" id="gdcConfirmar">Confirmar</button>'
      );
      qs("#gdcConfirmar").addEventListener("click", function () {
        const val = parseFloat(qs("#gdcValor").value || "0");
        cliente.saldoDevedor = Math.max(0, cliente.saldoDevedor - val);
        closeModal();
        render();
      });
    });
  }
};

const ScreenGerenteFiado = {
  render: function () {
    const devendo = state.clientes.filter(function (c) { return c.saldoDevedor > 0; });
    const total = devendo.reduce(function (s, c) { return s + c.saldoDevedor; }, 0);
    const content =
      '<div class="screen-head"><h2>Controle de fiado</h2></div>' +
      '<div class="stat-grid stat-grid-3">' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Total a receber</span><span class="stat-card-icon">' + icon("wallet") + '</span></div><div class="stat-card-value">' + formatBRL(total) + '</div><div class="stat-card-trend">' + devendo.length + ' clientes</div></div>' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Clientes devendo</span><span class="stat-card-icon">' + icon("users") + '</span></div><div class="stat-card-value">' + devendo.length + '</div><div class="stat-card-trend">de ' + state.clientes.length + ' clientes</div></div>' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Recebido este mês</span><span class="stat-card-icon">' + icon("checkCircle") + '</span></div><div class="stat-card-value">R$ 145,00</div><div class="stat-card-trend">+23% vs mês anterior</div></div>' +
      "</div>" +
      '<div class="card"><div style="padding:16px 20px;border-bottom:1px solid var(--gray-100);"><p style="font-weight:700;">Clientes com saldo em aberto</p></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Cliente</th><th>Telefone</th><th>Valor devido</th><th>Última compra</th><th>Situação</th><th>Ações</th></tr></thead><tbody id="gfTbody"></tbody></table></div></div>';
    return gerenteShell("fiado", "Controle de Fiado", null, content);
  },
  bind: function () {
    function renderRows() {
      const devendo = state.clientes.filter(function (c) { return c.saldoDevedor > 0; });
      qs("#gfTbody").innerHTML = devendo.map(function (c) {
        return "<tr><td>" + escapeHtml(c.nome) + "</td><td>" + c.telefone + "</td><td style=\"font-weight:700;color:var(--orange);\">" + formatBRL(c.saldoDevedor) + "</td><td>" + c.ultimaCompra + "</td><td>" + badgeHtml("Em aberto") + '</td><td><button type="button" class="btn-link" data-receber="' + c.id + '">Receber</button></td></tr>';
      }).join("") || '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);">Nenhum cliente com saldo em aberto.</td></tr>';
      qsa("[data-receber]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const cliente = getCliente(btn.getAttribute("data-receber"));
          openModal("Registrar pagamento",
            '<p style="font-size:.875rem;color:var(--text-secondary);margin-bottom:14px;">Cliente: <strong style="color:var(--blue-dark);">' + escapeHtml(cliente.nome) + '</strong></p>' +
            '<div class="field"><label for="gfValor">Valor recebido</label><input type="number" id="gfValor" placeholder="0,00" min="0" step="0.01"></div>' +
            '<div class="field"><label for="gfForma">Forma de pagamento</label><select id="gfForma"><option>Pix</option><option>Dinheiro</option><option>Cartão</option></select></div>',
            '<button type="button" class="btn btn-outline btn-block" data-modal-close>Cancelar</button><button type="button" class="btn btn-primary btn-block" id="gfConfirmar">Confirmar pagamento</button>'
          );
          qs("#gfConfirmar").addEventListener("click", function () {
            const val = parseFloat(qs("#gfValor").value || "0");
            cliente.saldoDevedor = Math.max(0, cliente.saldoDevedor - val);
            closeModal();
            render();
          });
        });
      });
    }
    renderRows();
  }
};

const ScreenGerenteEstoque = {
  render: function () {
    const baixos = state.produtos.filter(function (p) { return p.quantidade <= p.estoqueMinimo; }).length;
    const content =
      '<div class="screen-head-row"><h2 style="font-size:1.25rem;">Estoque</h2>' +
      '<button type="button" class="btn btn-primary" id="geAddBtn">' + icon("plus", "icon-sm") + "Adicionar produto</button></div>" +
      '<div class="stat-grid stat-grid-3">' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Produtos cadastrados</span><span class="stat-card-icon">' + icon("box") + '</span></div><div class="stat-card-value">' + state.produtos.length + '</div><div class="stat-card-trend">no cardápio</div></div>' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Estoque baixo</span><span class="stat-card-icon">' + icon("alertTriangle") + '</span></div><div class="stat-card-value">' + baixos + '</div><div class="stat-card-trend">abaixo do mínimo</div></div>' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Valor estimado</span><span class="stat-card-icon">' + icon("cash") + '</span></div><div class="stat-card-value">R$ 2.340,00</div><div class="stat-card-trend">custo de estoque</div></div>' +
      "</div>" +
      '<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Produto</th><th>Categoria</th><th>Quantidade</th><th>Estoque mínimo</th><th>Preço</th><th>Status</th><th>Ações</th></tr></thead><tbody id="geTbody"></tbody></table></div></div>';
    return gerenteShell("estoque", "Estoque", null, content);
  },
  bind: function () {
    function renderRows() {
      qs("#geTbody").innerHTML = state.produtos.map(function (p) {
        const info = estoqueStatusInfo(p);
        return "<tr><td>" + escapeHtml(p.nome) + "</td><td>" + escapeHtml(p.categoria) + "</td><td style=\"font-weight:600;\">" + p.quantidade + "</td><td>" + p.estoqueMinimo + "</td><td>" + formatBRL(p.preco) + "</td><td>" + badgeHtml(info.label, info.cls) + '</td><td><button type="button" class="btn-link" data-edit-produto="' + p.id + '">Editar</button></td></tr>';
      }).join("");
      qsa("[data-edit-produto]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const produto = getProduto(btn.getAttribute("data-edit-produto"));
          openModal("Editar " + produto.nome,
            '<div class="field"><label for="geEditQtd">Quantidade atual</label><input type="number" id="geEditQtd" value="' + produto.quantidade + '" min="0"></div>' +
            '<div class="field"><label for="geEditMin">Estoque mínimo</label><input type="number" id="geEditMin" value="' + produto.estoqueMinimo + '" min="0"></div>',
            '<button type="button" class="btn btn-outline btn-block" data-modal-close>Cancelar</button><button type="button" class="btn btn-primary btn-block" id="geEditSalvar">Salvar</button>'
          );
          qs("#geEditSalvar").addEventListener("click", function () {
            produto.quantidade = Math.max(0, Number(qs("#geEditQtd").value) || 0);
            produto.estoqueMinimo = Math.max(0, Number(qs("#geEditMin").value) || 0);
            closeModal();
            render();
          });
        });
      });
    }
    qs("#geAddBtn").addEventListener("click", function () {
      openModal("Adicionar produto",
        '<div class="field"><label for="geNomeNovo">Nome do produto</label><input type="text" id="geNomeNovo" placeholder="Ex: X-Burguer"></div>' +
        '<div class="field"><label for="geCatNovo">Categoria</label><input type="text" id="geCatNovo" placeholder="Lanches, Bebidas..."></div>' +
        '<div class="field"><label for="gePrecoNovo">Preço (R$)</label><input type="number" id="gePrecoNovo" placeholder="0,00" min="0" step="0.01"></div>' +
        '<div class="field"><label for="geQtdNovo">Quantidade inicial</label><input type="number" id="geQtdNovo" placeholder="0" min="0"></div>' +
        '<div class="field"><label for="geMinNovo">Estoque mínimo</label><input type="number" id="geMinNovo" placeholder="5" min="0"></div>',
        '<button type="button" class="btn btn-outline btn-block" data-modal-close>Cancelar</button><button type="button" class="btn btn-primary btn-block" id="geAddSalvar">Adicionar</button>'
      );
      qs("#geAddSalvar").addEventListener("click", function () {
        const nome = qs("#geNomeNovo").value.trim();
        if (!nome) return;
        state.produtos.push({
          id: nextId(), nome: nome, descricao: "", preco: parseFloat(qs("#gePrecoNovo").value || "0"),
          categoria: qs("#geCatNovo").value.trim() || "Outros",
          imagem: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop&auto=format",
          disponivel: true, quantidade: Number(qs("#geQtdNovo").value) || 0, estoqueMinimo: Number(qs("#geMinNovo").value) || 0,
        });
        closeModal();
        render();
      });
    });
    renderRows();
  }
};

const ScreenGerenteCaixa = {
  render: function () {
    const entradas = state.movimentosCaixa.filter(function (m) { return m.tipo === "Entrada"; }).reduce(function (s, m) { return s + m.valor; }, 0);
    const saidas = state.movimentosCaixa.filter(function (m) { return m.tipo === "Saída"; }).reduce(function (s, m) { return s + m.valor; }, 0);
    const content =
      '<div class="screen-head"><h2>Caixa</h2></div>' +
      '<div class="stat-grid">' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Entradas hoje</span><span class="stat-card-icon">' + icon("trendUp") + '</span></div><div class="stat-card-value">' + formatBRL(entradas) + '</div></div>' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Saídas hoje</span><span class="stat-card-icon">' + icon("trendDown") + '</span></div><div class="stat-card-value">' + formatBRL(saidas) + '</div></div>' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Saldo do caixa</span><span class="stat-card-icon">' + icon("cash") + '</span></div><div class="stat-card-value">' + formatBRL(entradas - saidas) + '</div></div>' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Vendas realizadas</span><span class="stat-card-icon">' + icon("bag") + '</span></div><div class="stat-card-value">' + state.movimentosCaixa.filter(function (m) { return m.tipo === "Entrada"; }).length + '</div></div>' +
      "</div>" +
      '<div class="card"><div style="padding:16px 20px;border-bottom:1px solid var(--gray-100);"><p style="font-weight:700;">Movimentações de hoje</p></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Horário</th><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Responsável</th></tr></thead><tbody>' +
      state.movimentosCaixa.map(function (m) {
        return "<tr><td>" + m.horario + "</td><td>" + escapeHtml(m.descricao) + "</td><td>" + badgeHtml(m.tipo, m.tipo === "Entrada" ? "badge-success" : "badge-danger") + '</td><td style="font-weight:700;color:' + (m.tipo === "Entrada" ? "var(--success)" : "var(--danger)") + ';">' + (m.tipo === "Entrada" ? "+" : "-") + formatBRL(m.valor) + "</td><td>" + escapeHtml(m.responsavel) + "</td></tr>";
      }).join("") +
      "</tbody></table></div></div>";
    return gerenteShell("caixa", "Caixa", null, content);
  }
};

const ScreenGerenteFuncionarios = {
  render: function () {
    const content =
      '<div class="screen-head-row"><h2 style="font-size:1.25rem;">Funcionários</h2>' +
      '<button type="button" class="btn btn-primary" data-href="/gerente/funcionarios/novo">' + icon("plus", "icon-sm") + "Adicionar funcionário</button></div>" +
      '<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Nome</th><th>Cargo</th><th>Status</th><th>Último acesso</th><th>Ações</th></tr></thead><tbody id="gfuTbody"></tbody></table></div></div>';
    return gerenteShell("funcionarios", "Funcionários", null, content);
  },
  bind: function () {
    function renderRows() {
      qs("#gfuTbody").innerHTML = state.funcionarios.map(function (f) {
        return '<tr><td><div style="display:flex;align-items:center;gap:10px;"><span class="avatar avatar-circle" style="width:28px;height:28px;background:var(--blue-light);color:var(--blue-primary);font-size:.75rem;">' + initialLetter(f.nome) + "</span>" + escapeHtml(f.nome) + "</div></td><td>" + escapeHtml(f.cargo) + '</td><td><button type="button" class="badge ' + (f.status === "Ativo" ? "badge-success" : "badge-neutral") + '" data-toggle-func="' + f.id + '" style="border:none;cursor:pointer;">' + f.status + "</button></td><td>" + f.ultimoAcesso + '</td><td style="display:flex;gap:10px;"><button type="button" class="btn-link" data-toast="Funcionalidade disponível em breve.">Editar</button><button type="button" class="btn-link" style="color:var(--danger);" data-remove-func="' + f.id + '">Remover</button></td></tr>';
      }).join("");
      qsa("[data-toggle-func]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const f = state.funcionarios.find(function (x) { return x.id === Number(btn.getAttribute("data-toggle-func")); });
          if (f) f.status = f.status === "Ativo" ? "Inativo" : "Ativo";
          renderRows();
        });
      });
      qsa("[data-remove-func]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.funcionarios = state.funcionarios.filter(function (x) { return x.id !== Number(btn.getAttribute("data-remove-func")); });
          renderRows();
        });
      });
    }
    renderRows();
  }
};

const ScreenGerenteAdicionarFuncionario = {
  render: function () {
    const permissoes = ["Pedidos", "Clientes", "Estoque", "Caixa"];
    const content =
      '<div style="max-width:520px;margin:0 auto;width:100%;"><h2 style="font-size:1.25rem;margin-bottom:20px;">Adicionar funcionário</h2>' +
      '<div class="card card-pad" style="display:flex;flex-direction:column;gap:16px;">' +
      '<div class="field"><label for="afNome">Nome</label><input type="text" id="afNome" placeholder="Nome completo"></div>' +
      '<div class="field"><label for="afTel">Telefone</label><input type="tel" id="afTel" placeholder="(00) 00000-0000"></div>' +
      '<div class="field"><label for="afEmail">E-mail</label><input type="email" id="afEmail" placeholder="funcionario@empresa.com"></div>' +
      '<div class="field"><label for="afCargo">Cargo</label><select id="afCargo"><option>Atendente</option><option>Caixa</option><option>Cozinha</option><option>Entregador</option><option>Auxiliar</option></select></div>' +
      '<div class="field"><label>Permissões</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;" id="afPermissoes">' +
      permissoes.map(function (p, i) {
        return '<label class="checkbox-row" style="border:2px solid var(--border);border-radius:10px;padding:10px 12px;"><input type="checkbox" value="' + p + '"' + (i === 0 ? " checked" : "") + "><span style=\"font-size:.875rem;font-weight:500;\">" + p + "</span></label>";
      }).join("") + "</div></div>" +
      '<div style="display:flex;gap:12px;"><button type="button" class="btn btn-outline btn-block" data-href="/gerente/funcionarios">Cancelar</button>' +
      '<button type="button" class="btn btn-primary btn-block" id="afSubmit">Adicionar funcionário</button></div>' +
      "</div></div>";
    return gerenteShell("funcionarios", "Adicionar Funcionário", "/gerente/funcionarios", content);
  },
  bind: function () {
    qs("#afSubmit").addEventListener("click", function () {
      const nome = qs("#afNome").value.trim();
      if (!nome) return;
      const permissoes = qsa("#afPermissoes input:checked").map(function (c) { return c.value; });
      state.funcionarios.push({
        id: nextId(), nome: nome, cargo: qs("#afCargo").value, status: "Ativo",
        ultimoAcesso: formatDatePt() + " " + formatTimePt(), permissoes: permissoes,
      });
      navigate("/gerente/funcionarios");
    });
  }
};

const ScreenGerenteRelatorios = {
  render: function () {
    const content =
      '<div class="screen-head-row"><h2 style="font-size:1.25rem;">Relatórios</h2><div class="chip-row" id="grPeriodo">' +
      ["Hoje", "7 dias", "30 dias", "Personalizado"].map(function (p, i) { return '<button class="chip' + (i === 1 ? " active" : "") + '" data-periodo="' + p + '">' + p + "</button>"; }).join("") + "</div></div>" +
      '<div class="stat-grid stat-grid-3">' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Vendas no período</span><span class="stat-card-icon">' + icon("cash") + '</span></div><div class="stat-card-value">R$ 8.750</div><div class="stat-card-trend">+18% vs período ant.</div></div>' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Pedidos</span><span class="stat-card-icon">' + icon("clipboard") + '</span></div><div class="stat-card-value">168</div><div class="stat-card-trend">+22 pedidos</div></div>' +
      '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Ticket médio</span><span class="stat-card-icon">' + icon("target") + '</span></div><div class="stat-card-value">R$ 52,08</div><div class="stat-card-trend">por pedido</div></div>' +
      "</div>" +
      '<div class="dashboard-cols">' +
      '<div class="card card-pad"><p style="font-weight:700;margin-bottom:16px;">Vendas por dia</p><div class="bars-chart">' +
      [40, 65, 55, 80, 70, 90, 75].map(function (h, i) { return '<div class="bar-col"><div class="bar" style="height:' + h + '%;"></div><span class="bar-label">' + ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][i] + "</span></div>"; }).join("") +
      "</div></div>" +
      '<div class="card card-pad"><p style="font-weight:700;margin-bottom:14px;">Produtos mais vendidos</p>' +
      [{ n: "Marmita tradicional", p: 35, q: 58 }, { n: "Refrigerante", p: 28, q: 47 }, { n: "X-Tudo", p: 22, q: 37 }, { n: "Batata frita", p: 15, q: 25 }].map(function (x) {
        return '<div class="progress-row"><div class="progress-row-top"><span style="font-weight:500;">' + x.n + '</span><span style="color:var(--text-secondary);">' + x.q + ' vendas</span></div><div class="progress-track"><div class="progress-fill" style="width:' + x.p + '%;"></div></div></div>';
      }).join("") + "</div></div>" +
      '<div class="field-row">' +
      '<div class="card card-pad"><p style="font-weight:700;margin-bottom:8px;">Número de pedidos</p><p style="font-size:1.75rem;font-weight:800;">168</p><p style="color:var(--success);font-size:.875rem;margin-top:4px;">+22 vs período anterior</p></div>' +
      '<div class="card card-pad"><p style="font-weight:700;margin-bottom:8px;">Fiado em aberto</p><p style="font-size:1.75rem;font-weight:800;color:var(--orange);">' + formatBRL(191) + '</p><p style="color:var(--text-secondary);font-size:.875rem;margin-top:4px;">5 clientes pendentes</p></div>' +
      "</div>";
    return gerenteShell("relatorios", "Relatórios", null, content);
  },
  bind: function () {
    qsa("#grPeriodo .chip").forEach(function (chip) {
      chip.addEventListener("click", function () { qsa("#grPeriodo .chip").forEach(function (c) { c.classList.toggle("active", c === chip); }); });
    });
  }
};

const ScreenGerenteConfiguracoes = {
  render: function () {
    const content =
      '<div class="screen-head"><h2>Configurações</h2></div>' +
      '<div class="card card-pad"><p style="font-weight:700;margin-bottom:16px;">Dados do estabelecimento</p><div class="field-row">' +
      '<div class="field"><label>Nome do estabelecimento</label><input type="text" value="Restaurante Sabor Caseiro"></div>' +
      '<div class="field"><label>Tipo de negócio</label><input type="text" value="Restaurante"></div>' +
      '<div class="field"><label>Telefone</label><input type="text" value="(69) 99123-4567"></div>' +
      '<div class="field"><label>E-mail</label><input type="text" value="saborcaseiro@email.com"></div>' +
      "</div></div>" +
      '<div class="card card-pad"><p style="font-weight:700;margin-bottom:16px;">Horário de funcionamento</p><div class="field-row">' +
      '<div class="field"><label>Abertura</label><input type="time" value="07:00"></div><div class="field"><label>Fechamento</label><input type="time" value="22:00"></div>' +
      "</div></div>" +
      '<div class="card card-pad"><p style="font-weight:700;margin-bottom:16px;">Formas de pagamento</p><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">' +
      ["Dinheiro", "Pix", "Cartão de crédito", "Fiado"].map(function (f) { return '<label class="checkbox-row" style="border:1px solid var(--border);border-radius:10px;padding:10px 12px;"><input type="checkbox" checked><span style="font-size:.875rem;">' + f + "</span></label>"; }).join("") +
      "</div></div>" +
      '<div class="card card-pad"><p style="font-weight:700;margin-bottom:16px;">Segurança</p><div class="field-row">' +
      '<div class="field"><label>Senha atual</label><input type="password" placeholder="••••••••"></div><div class="field"><label>Nova senha</label><input type="password" placeholder="••••••••"></div>' +
      "</div></div>" +
      '<button type="button" class="btn btn-primary" data-toast="Funcionalidade disponível em breve.">Salvar alterações</button>';
    return gerenteShell("configuracoes", "Configurações", null, content);
  }
};

