"use strict";
/* =========================================================
   SCREENS/CLIENTE.JS — telas do app do Cliente
   (inicio, cardapio, produto, carrinho, pedido confirmado,
   acompanhar pedido, meus pedidos, minha conta, perfil)
   Usa o mesmo shell (sidebar + topbar + app-content) do
   Gerente e do Funcionario, para manter a mesma estrutura
   responsiva em todos os perfis.
   ========================================================= */
const CLIENTE_CATEGORIAS = ["Todos", "Lanches", "Pratos", "Bebidas", "Sobremesas"];
const CLIENTE_NOME_DEMO = "Lucas Oliveira";
const CLIENTE_NAV = [
  { id: "inicio", label: "Início", icon: "home", href: "/cliente" },
  { id: "cardapio", label: "Cardápio", icon: "bag", href: "/cliente/cardapio" },
  { id: "pedidos", label: "Meus pedidos", icon: "clipboard", href: "/cliente/pedidos" },
  { id: "conta", label: "Minha carteira", icon: "wallet", href: "/cliente/conta" },
  { id: "perfil", label: "Perfil", icon: "user", href: "/cliente/perfil" },
];
function clienteShell(activeId, title, backHref, contentHtml) {
  return '<div class="app-shell fade-in">' + sidebarHtml(activeId, CLIENTE_NAV, "Cliente") +
    '<div class="app-main">' + topbarHtml(title, backHref) + '<div class="app-content">' + contentHtml + "</div></div></div>";
}

function clientCarrinhoSubtotal() {
  return state.carrinho.reduce(function (s, i) { return s + getProduto(i.produtoId).preco * i.quantidade; }, 0);
}

const ScreenClienteInicio = {
  render: function () {
    const content =
      '<div class="client-greet-card"><p class="greet-sub">Olá,</p><h2>Lucas!</h2><p class="prompt">O que você deseja hoje?</p></div>' +
      '<div class="shortcut-card">' +
      '<button class="shortcut-btn" data-href="/cliente/cardapio"><span class="icon-wrap">' + icon("bag") + '</span><span class="label">Fazer pedido</span></button>' +
      '<button class="shortcut-btn" data-href="/cliente/pedidos"><span class="icon-wrap">' + icon("clipboard") + '</span><span class="label">Meus pedidos</span></button>' +
      '<button class="shortcut-btn" data-href="/cliente/conta"><span class="icon-wrap">' + icon("wallet") + '</span><span class="label">Minha conta</span></button>' +
      "</div>" +
      '<div class="promo-card"><p class="tag">Promoção do dia</p><p class="title">Seu prato favorito, agora mais fácil.</p>' +
      '<button type="button" class="btn btn-white btn-sm" data-href="/cliente/cardapio">Ver cardápio</button></div>' +
      '<div class="section-card"><div class="section-card-head">Últimos pedidos</div>' +
      state.meusPedidosCliente.slice(0, 3).map(function (p) {
        return '<div class="order-mini-row"><div><div style="font-weight:600;font-size:.875rem;">' + escapeHtml(p.desc) + '</div><div style="font-size:.75rem;color:var(--text-secondary);">' + p.data + "</div></div>" +
          '<div style="text-align:right;"><div style="font-weight:700;font-size:.875rem;">' + formatBRL(p.valor) + "</div>" + badgeHtml(p.status) + "</div></div>";
      }).join("") +
      "</div>";
    return clienteShell("inicio", "Início", null, content);
  }
};

const ScreenClienteCardapio = {
  render: function () {
    const content =
      '<div class="card card-pad">' +
      '<input type="search" class="search-input" id="cardapioBusca" placeholder="Buscar produto..." aria-label="Buscar produto">' +
      '<div class="category-scroll" id="cardapioCategorias">' + CLIENTE_CATEGORIAS.map(function (c) {
        return '<button class="chip' + (c === "Todos" ? " active" : "") + '" data-cat="' + c + '">' + c + "</button>";
      }).join("") + "</div></div>" +
      '<div class="catalog-grid" id="cardapioLista"></div>';
    return clienteShell("cardapio", "Cardápio", "/cliente", content);
  },
  bind: function () {
    let busca = "";
    let categoria = "Todos";
    const lista = qs("#cardapioLista");
    function renderLista() {
      const filtrados = state.produtos.filter(function (p) {
        const matchCat = categoria === "Todos" || p.categoria === categoria;
        const matchBusca = p.nome.toLowerCase().indexOf(busca.toLowerCase()) !== -1;
        return matchCat && matchBusca;
      });
      lista.innerHTML = filtrados.map(function (p) {
        return '<button class="product-card" data-href="/cliente/produto/' + p.id + '">' +
          '<img src="' + p.imagem + '" alt="' + escapeHtml(p.nome) + '" loading="lazy" onerror="this.style.background=\'var(--gray-200)\';this.removeAttribute(\'src\')">' +
          '<div class="product-card-info"><div class="name">' + escapeHtml(p.nome) + '</div><div class="desc">' + escapeHtml(p.descricao) + '</div><div class="price">' + formatBRL(p.preco) + "</div></div>" +
          "</button>";
      }).join("") || '<p style="text-align:center;color:var(--text-secondary);padding:24px 0;grid-column:1/-1;">Nenhum produto encontrado.</p>';
    }
    qs("#cardapioBusca").addEventListener("input", function (e) { busca = e.target.value; renderLista(); });
    qsa("#cardapioCategorias .chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        categoria = chip.getAttribute("data-cat");
        qsa("#cardapioCategorias .chip").forEach(function (c) { c.classList.toggle("active", c === chip); });
        renderLista();
      });
    });
    renderLista();
  }
};

const ScreenClienteProduto = {
  render: function (params) {
    const produto = getProduto(params.id);
    if (!produto) { navigate("/cliente/cardapio", { replace: true }); return null; }
    const content =
      '<div class="card" style="overflow:hidden;">' +
      '<img src="' + produto.imagem + '" alt="' + escapeHtml(produto.nome) + '" loading="lazy" class="product-detail-img" onerror="this.style.background=\'var(--gray-200)\';this.removeAttribute(\'src\')">' +
      '<div class="card-pad">' +
      '<div class="product-detail-top"><div><h2>' + escapeHtml(produto.nome) + '</h2><p class="desc">' + escapeHtml(produto.descricao) + "</p></div><p class=\"price\">" + formatBRL(produto.preco) + "</p></div>" +
      '<div style="margin-top:18px;"><p style="font-weight:600;font-size:.875rem;margin-bottom:10px;">Quantidade</p><div class="qty-stepper">' +
      '<button type="button" id="qtdMenos" aria-label="Diminuir quantidade">' + icon("minus") + '</button><span class="qty-value" id="qtdValor">1</span>' +
      '<button type="button" id="qtdMais" aria-label="Aumentar quantidade">' + icon("plus") + "</button></div></div>" +
      '<div class="field" style="margin-top:18px;"><label for="produtoObs">Observações</label><textarea id="produtoObs" rows="3" placeholder="Ex.: sem cebola, sem tomate..."></textarea></div>' +
      '<button type="button" class="btn btn-primary btn-block" id="addCarrinhoBtn" style="margin-top:18px;">' +
      "<span>Adicionar ao carrinho</span><span id=\"addCarrinhoValor\">" + formatBRL(produto.preco) + "</span></button>" +
      "</div></div>";
    return clienteShell("cardapio", "Produto", "/cliente/cardapio", content);
  },
  bind: function (params) {
    const produto = getProduto(params.id);
    if (!produto) return;
    let qtd = 1;
    const qtdValor = qs("#qtdValor");
    const valorBtn = qs("#addCarrinhoValor");
    qs("#qtdMenos").addEventListener("click", function () {
      qtd = Math.max(1, qtd - 1);
      qtdValor.textContent = String(qtd);
      valorBtn.textContent = formatBRL(produto.preco * qtd);
    });
    qs("#qtdMais").addEventListener("click", function () {
      qtd += 1;
      qtdValor.textContent = String(qtd);
      valorBtn.textContent = formatBRL(produto.preco * qtd);
    });
    qs("#addCarrinhoBtn").addEventListener("click", function () {
      const obs = qs("#produtoObs").value.trim();
      const existente = state.carrinho.find(function (i) { return i.produtoId === produto.id; });
      if (existente) existente.quantidade += qtd;
      else state.carrinho.push({ produtoId: produto.id, quantidade: qtd, observacao: obs });
      navigate("/cliente/carrinho");
    });
  }
};

const ScreenClienteCarrinho = {
  render: function () {
    if (state.carrinho.length === 0) {
      const content =
        '<div class="cart-empty">' + icon("cart", "icon-lg") + '<p class="title">Seu carrinho está vazio</p><p class="desc">Adicione itens do cardápio para fazer seu pedido.</p>' +
        '<button type="button" class="btn btn-primary" data-href="/cliente/cardapio">Ver cardápio</button></div>';
      return clienteShell("cardapio", "Carrinho", "/cliente/cardapio", content);
    }
    const subtotal = clientCarrinhoSubtotal();
    const taxa = 3.0;
    const total = subtotal + taxa;
    const content =
      '<div class="product-list">' +
      state.carrinho.map(function (item, idx) {
        const produto = getProduto(item.produtoId);
        return '<div class="cart-item"><img src="' + produto.imagem + '" alt="' + escapeHtml(produto.nome) + '" loading="lazy">' +
          '<div class="cart-item-info"><div class="name">' + escapeHtml(produto.nome) + '</div><div class="meta">Qtd: ' + item.quantidade + "</div>" +
          (item.observacao ? '<div class="meta" style="font-style:italic;">"' + escapeHtml(item.observacao) + '"</div>' : "") + "</div>" +
          '<div class="cart-item-price"><div class="value">' + formatBRL(produto.preco * item.quantidade) + '</div><button type="button" data-remove-idx="' + idx + '">Remover</button></div></div>';
      }).join("") +
      "</div>" +
      '<div class="cart-summary">' +
      '<div class="cart-summary-row"><span>Subtotal</span><span>' + formatBRL(subtotal) + "</span></div>" +
      '<div class="cart-summary-row"><span>Taxa do serviço</span><span>' + formatBRL(taxa) + "</span></div>" +
      '<div class="cart-summary-row total"><span>Total</span><span>' + formatBRL(total) + "</span></div>" +
      "</div>" +
      '<div style="display:flex;flex-direction:column;gap:10px;">' +
      '<button type="button" class="btn btn-primary btn-block" id="confirmarPedidoBtn">Confirmar pedido — ' + formatBRL(total) + "</button>" +
      '<button type="button" class="btn btn-outline btn-block" data-href="/cliente/cardapio">Continuar comprando</button>' +
      "</div>";
    return clienteShell("cardapio", "Carrinho", "/cliente/cardapio", content);
  },
  bind: function () {
    qsa("[data-remove-idx]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.carrinho.splice(Number(btn.getAttribute("data-remove-idx")), 1);
        render();
      });
    });
    const confirmBtn = qs("#confirmarPedidoBtn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        const subtotal = clientCarrinhoSubtotal();
        const total = subtotal + 3.0;
        const itensResumo = state.carrinho.map(function (i) { return (i.quantidade > 1 ? i.quantidade + "x " : "") + getProduto(i.produtoId).nome; }).join(" + ");
        const novoPedido = {
          id: nextId(),
          numero: "#" + String(state.pedidos.length + 1).padStart(3, "0"),
          cliente: CLIENTE_NOME_DEMO,
          itens: itensResumo,
          valor: total,
          horario: formatTimePt(),
          status: "Recebido",
          data: formatDatePt(),
        };
        state.pedidos.unshift(novoPedido);
        state.movimentosCaixa.unshift({ id: nextId(), horario: formatTimePt(), descricao: "Venda Pedido " + novoPedido.numero, tipo: "Entrada", valor: total, responsavel: CLIENTE_NOME_DEMO });
        state.meusPedidosCliente.unshift({ id: novoPedido.id, data: novoPedido.data, desc: itensResumo, valor: total, status: "Recebido" });
        state.ultimoPedidoCliente = { numero: novoPedido.numero, valor: total, forma: "Pix", pedidoId: novoPedido.id };
        state.carrinho = [];
        navigate("/cliente/pedido-confirmado");
      });
    }
  }
};

const ScreenClientePedidoConfirmado = {
  render: function () {
    const ultimo = state.ultimoPedidoCliente || { numero: "#000", valor: 0, forma: "Pix", pedidoId: null };
    const content =
      '<div class="confirm-screen">' +
      '<div class="confirm-icon">' + icon("checkCircle", "icon-lg") + "</div>" +
      "<h2>Pedido realizado!</h2><p class=\"desc\">Seu pedido foi enviado para o estabelecimento.</p>" +
      '<div class="confirm-details">' +
      '<div class="row"><span>Número</span><span>' + ultimo.numero + "</span></div>" +
      '<div class="row"><span>Valor</span><span>' + formatBRL(ultimo.valor) + "</span></div>" +
      '<div class="row"><span>Pagamento</span><span>' + ultimo.forma + "</span></div>" +
      "</div>" +
      '<button type="button" class="btn btn-primary" id="acompanharBtn">Acompanhar pedido</button>' +
      "</div>";
    return clienteShell("pedidos", "Pedido confirmado", null, content);
  },
  bind: function () {
    const btn = qs("#acompanharBtn");
    if (btn) btn.addEventListener("click", function () {
      const id = state.ultimoPedidoCliente ? state.ultimoPedidoCliente.pedidoId : null;
      navigate(id ? "/cliente/pedidos/" + id : "/cliente/pedidos");
    });
  }
};

const ScreenClienteMeusPedidos = {
  render: function () {
    const content =
      '<div class="tabs-row" id="pedidosFiltro">' + ["Todos", "Em andamento", "Entregues"].map(function (f) {
        return '<button class="chip' + (f === "Todos" ? " active" : "") + '" data-filtro="' + f + '">' + f + "</button>";
      }).join("") + "</div>" +
      '<div class="product-list" id="pedidosLista"></div>';
    return clienteShell("pedidos", "Meus pedidos", null, content);
  },
  bind: function () {
    const lista = qs("#pedidosLista");
    function renderLista(filtro) {
      const pedidos = state.meusPedidosCliente.filter(function (p) {
        if (filtro === "Todos") return true;
        if (filtro === "Em andamento") return p.status !== "Entregue" && p.status !== "Cancelado";
        return p.status === "Entregue";
      });
      lista.innerHTML = pedidos.map(function (p) {
        return '<div class="cart-item" data-href="/cliente/pedidos/' + p.id + '" style="cursor:pointer;"><div class="cart-item-info"><div class="name">' + escapeHtml(p.desc) + '</div><div class="meta">' + p.data + "</div></div>" +
          '<div class="cart-item-price"><div class="value">' + formatBRL(p.valor) + "</div>" + badgeHtml(p.status) + "</div></div>";
      }).join("") || '<p style="text-align:center;color:var(--text-secondary);padding:24px 0;">Nenhum pedido encontrado.</p>';
    }
    qsa("#pedidosFiltro .chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        qsa("#pedidosFiltro .chip").forEach(function (c) { c.classList.toggle("active", c === chip); });
        renderLista(chip.getAttribute("data-filtro"));
      });
    });
    renderLista("Todos");
  }
};

const ScreenClienteAcompanharPedido = {
  render: function (params) {
    const pedido = getPedido(params.id);
    if (!pedido) { navigate("/cliente/pedidos", { replace: true }); return null; }
    const idxAtual = STATUS_ORDEM.indexOf(pedido.status);
    const etapas = STATUS_ORDEM.map(function (label, i) {
      return { label: label, done: i < idxAtual, active: i === idxAtual };
    });
    const content =
      '<div class="section-card" style="padding:20px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><strong>Pedido ' + pedido.numero + "</strong>" + badgeHtml(pedido.status) + "</div>" +
      '<div class="track-timeline">' + etapas.map(function (e, i) {
        return '<div class="track-step"><div class="track-step-dot-col">' +
          '<div class="track-step-dot' + (e.done ? " done" : e.active ? " active" : "") + '">' +
          (e.done ? icon("check", "icon-sm") : e.active ? '<span class="inner-dot"></span>' : "") + "</div>" +
          (i < etapas.length - 1 ? '<div class="track-step-line' + (e.done ? " done" : "") + '"></div>' : "") +
          "</div><div class=\"track-step-body\"><p class=\"track-step-label" + (e.active ? " active" : e.done ? " done" : "") + '">' + e.label + "</p>" +
          (e.active ? '<p class="track-step-sub">Seu pedido está sendo preparado com carinho!</p>' : "") + "</div></div>";
      }).join("") + "</div></div>" +
      '<button type="button" class="btn btn-outline btn-block" data-href="/cliente">Voltar ao início</button>';
    return clienteShell("pedidos", "Acompanhar pedido", "/cliente/pedidos", content);
  }
};

const ScreenClienteConta = {
  render: function () {
    const content =
      '<div class="tabs-row" id="contaTabs">' +
      '<button class="chip active" data-tab="resumo">Resumo</button>' +
      '<button class="chip" data-tab="historico">Histórico</button>' +
      "</div>" +
      '<div id="contaBody"></div>';
    return clienteShell("conta", "Minha carteira", null, content);
  },
  bind: function () {
    const historico = [
      { data: "12/09/2026", compra: "X-Tudo + Refri", valor: 35.00, status: "Em aberto" },
      { data: "10/09/2026", compra: "Marmita", valor: 28.00, status: "Pago" },
      { data: "05/09/2026", compra: "X-Bacon", valor: 32.00, status: "Pago" },
    ];
    const body = qs("#contaBody");
    function renderTab(tab) {
      if (tab === "resumo") {
        body.innerHTML =
          '<div class="balance-card"><p class="label">Meu saldo devedor</p><p class="value">R$ 56,00</p>' +
          '<p class="desc">Mantenha seus pagamentos em dia e continue aproveitando!</p>' +
          '<button type="button" class="btn btn-white btn-sm" id="pagarAgoraBtn">Pagar agora</button></div>' +
          '<div class="section-card" style="margin-top:16px;padding:16px;"><p style="font-weight:700;margin-bottom:8px;">Resumo rápido</p>' +
          '<div class="list-row"><span style="font-size:.875rem;color:var(--text-secondary);">Total gasto</span><span style="font-size:.875rem;font-weight:600;">R$ 245,00</span></div>' +
          '<div class="list-row"><span style="font-size:.875rem;color:var(--text-secondary);">Pedidos realizados</span><span style="font-size:.875rem;font-weight:600;">8</span></div>' +
          '<div class="list-row"><span style="font-size:.875rem;color:var(--text-secondary);">Último pedido</span><span style="font-size:.875rem;font-weight:600;">12/09/2026</span></div>' +
          "</div>";
        const pagarBtn = qs("#pagarAgoraBtn");
        if (pagarBtn) pagarBtn.addEventListener("click", function () {
          openModal("Pagar saldo devedor",
            '<div style="background:var(--blue-light);border-radius:10px;padding:14px;margin-bottom:16px;"><p style="font-size:.875rem;color:var(--text-secondary);">Valor a pagar</p><p style="font-size:1.375rem;font-weight:700;color:var(--blue-primary);">R$ 56,00</p></div>' +
            ["Pix", "Dinheiro", "Cartão de crédito"].map(function (f) {
              return '<button type="button" class="btn btn-outline btn-block" data-toast="Funcionalidade disponível em breve." style="margin-bottom:10px;justify-content:flex-start;">' + f + "</button>";
            }).join(""),
            '<button type="button" class="btn btn-primary btn-block" data-toast="Funcionalidade disponível em breve." data-modal-close>Confirmar pagamento</button>'
          );
        });
      } else {
        body.innerHTML = '<div class="product-list">' + historico.map(function (h) {
          return '<div class="cart-item"><div class="cart-item-info"><div class="name">' + escapeHtml(h.compra) + '</div><div class="meta">' + h.data + "</div></div>" +
            '<div class="cart-item-price"><div class="value">' + formatBRL(h.valor) + "</div>" + badgeHtml(h.status) + "</div></div>";
        }).join("") + "</div>";
      }
    }
    qsa("#contaTabs .chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        qsa("#contaTabs .chip").forEach(function (c) { c.classList.toggle("active", c === chip); });
        renderTab(chip.getAttribute("data-tab"));
      });
    });
    renderTab("resumo");
  }
};

const CLIENTE_PERFIL_OPCOES = [
  { icon: "edit", label: "Editar dados" },
  { icon: "mapPin", label: "Endereços" },
  { icon: "briefcase", label: "Estabelecimentos" },
  { icon: "helpCircle", label: "Ajuda" },
];
const ScreenClientePerfil = {
  render: function () {
    const content =
      '<div class="profile-header-card"><div class="avatar">L</div><div><div class="name">' + CLIENTE_NOME_DEMO + '</div><div class="meta">(69) 99123-4567</div><div class="meta">lucas@email.com</div></div></div>' +
      '<div class="section-card"><div class="option-list">' + CLIENTE_PERFIL_OPCOES.map(function (o) {
        return '<button type="button" class="option-row" style="width:100%;text-align:left;" data-toast="Funcionalidade disponível em breve."><span class="option-row-left">' + icon(o.icon) + '<span class="label">' + o.label + "</span></span><span class=\"chevron\">" + icon("chevronRight", "icon-sm") + "</span></button>";
      }).join("") + "</div></div>" +
      '<button type="button" class="btn btn-danger-ghost btn-block" data-href="/">Sair da conta</button>';
    return clienteShell("perfil", "Meu perfil", null, content);
  }
};
