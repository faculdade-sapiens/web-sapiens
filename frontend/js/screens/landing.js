"use strict";
/* =========================================================
   SCREENS/LANDING.JS — tela: landing page ("/")
   ========================================================= */
const LANDING_NAV_ITEMS = [
  { label: "Início", id: "inicio" },
  { label: "Recursos", id: "recursos" },
  { label: "Como funciona", id: "como-funciona" },
  { label: "Planos", id: "planos" },
  { label: "Contato", id: "contato" },
];
const LANDING_RECURSOS = [
  { icon: "clipboard", titulo: "Pedidos", desc: "Organize os pedidos do seu negócio com facilidade." },
  { icon: "users", titulo: "Clientes", desc: "Mantenha seus clientes cadastrados e fidelizados." },
  { icon: "handshake", titulo: "Fiado", desc: "Saiba exatamente quem deve e quanto deve." },
  { icon: "box", titulo: "Estoque", desc: "Controle seus produtos e evite falta de itens." },
  { icon: "cash", titulo: "Caixa", desc: "Acompanhe entradas e saídas em tempo real." },
  { icon: "chart", titulo: "Relatórios", desc: "Entenda o desempenho do seu negócio." },
];

const ScreenLanding = {
  render: function () {
    const navLinks = LANDING_NAV_ITEMS.map(function (i) { return '<button data-scroll="' + i.id + '">' + i.label + "</button>"; }).join("");
    return (
      '<div class="fade-in">' +
      '<header class="landing-header">' +
      '<div class="landing-header-inner">' +
      logoHtml("md") +
      '<nav class="landing-nav" aria-label="Navegação principal">' + navLinks + "</nav>" +
      '<div class="landing-header-actions">' +
      '<button class="btn btn-primary btn-sm" data-href="/login">Entrar</button>' +
      '<button class="landing-menu-toggle" id="landingMenuToggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="landingMobileNav">' + icon("menu") + "</button>" +
      "</div></div>" +
      '<div class="landing-mobile-nav" id="landingMobileNav">' + LANDING_NAV_ITEMS.map(function (i) { return '<button class="nav-link" data-scroll="' + i.id + '">' + i.label + "</button>"; }).join("") +
      '<button class="btn btn-primary btn-block" data-href="/login">Entrar</button>' +
      "</div>" +
      "</header>" +

      '<section class="hero" id="inicio"><div class="hero-inner">' +
      '<div class="hero-content">' +
      '<span class="hero-badge"><span class="dot"></span>Para comércios que movem o bairro</span>' +
      "<h1 class=\"hero-title\">Mais controle para o seu negócio.</h1>" +
      '<p class="hero-desc">Pedidos, clientes, vendas, estoque, fiado e muito mais em um só lugar. O Conecta+ ajuda o seu negócio a crescer, com simplicidade.</p>' +
      '<div class="hero-actions">' +
      '<button class="btn btn-primary btn-lg" data-href="/cadastro">Começar agora</button>' +
      '<button class="btn btn-outline btn-lg" data-scroll="como-funciona">Ver como funciona</button>' +
      "</div>" +
      '<p class="hero-note">' + icon("sparkle") + "Menos caderno. Mais controle.</p>" +
      "</div>" +
      '<div class="hero-visual"><div class="dash-card">' +
      '<div class="dash-topbar"><span class="dash-dots"><span></span><span></span><span></span></span><span class="dash-title">Dashboard — Restaurante Sabor Caseiro</span></div>' +
      '<div class="dash-body">' +
      '<div class="dash-metrics">' +
      '<div class="dash-metric"><div class="dash-metric-label">Vendas hoje</div><div class="dash-metric-value">R$ 1.250</div><div class="dash-metric-trend">+12%</div></div>' +
      '<div class="dash-metric"><div class="dash-metric-label">Pedidos</div><div class="dash-metric-value">24</div><div class="dash-metric-trend">+3</div></div>' +
      '<div class="dash-metric"><div class="dash-metric-label">Clientes</div><div class="dash-metric-value">182</div><div class="dash-metric-trend">+8</div></div>' +
      '<div class="dash-metric"><div class="dash-metric-label">A receber (fiado)</div><div class="dash-metric-value">R$ 320</div><div class="dash-metric-trend">5 clientes</div></div>' +
      "</div>" +
      '<div class="dash-orders"><div class="dash-orders-title">Pedidos recentes</div>' +
      '<div class="dash-order-row"><div><div class="dash-order-name">João Silva</div><div class="dash-order-item">X-Tudo + Refri</div></div>' + badgeHtml("Entregue") + "</div>" +
      '<div class="dash-order-row"><div><div class="dash-order-name">Maria Souza</div><div class="dash-order-item">2x Marmita</div></div>' + badgeHtml("Em preparo") + "</div>" +
      '<div class="dash-order-row"><div><div class="dash-order-name">Carlos Lima</div><div class="dash-order-item">X-Bacon</div></div>' + badgeHtml("Pronto") + "</div>" +
      "</div></div></div></div>" +
      "</div></section>" +

      '<section class="section" id="recursos"><div class="section-inner">' +
      '<div class="section-head"><h2>Tudo que seu negócio precisa em um só lugar</h2><p>Do pedido ao pagamento, do estoque ao relatório — o Conecta+ centraliza tudo.</p></div>' +
      '<div class="features-grid">' + LANDING_RECURSOS.map(function (r) {
        return '<article class="feature-card"><span class="feature-icon">' + icon(r.icon) + "</span><h3>" + r.titulo + "</h3><p>" + r.desc + "</p></article>";
      }).join("") + "</div></div></section>" +

      '<section class="section how-section" id="como-funciona"><div class="section-inner">' +
      '<div class="section-head"><h2>Simples para quem trabalha todos os dias.</h2><p>Três passos para digitalizar seu negócio.</p></div>' +
      '<div class="steps-grid">' +
      '<div class="step-card"><span class="step-num">1</span><h3>Cadastre seu negócio</h3><p>Crie sua conta em minutos. Sem burocracia, sem papelada.</p></div>' +
      '<div class="step-card"><span class="step-num">2</span><h3>Organize sua operação</h3><p>Cadastre produtos, clientes e funcionários facilmente.</p></div>' +
      '<div class="step-card"><span class="step-num">3</span><h3>Acompanhe tudo pelo Conecta+</h3><p>Vendas, pedidos, estoque e fiado sempre na palma da mão.</p></div>' +
      "</div></div></section>" +

      '<section class="section" id="planos"><div class="section-inner">' +
      '<div class="section-head"><h2>Planos para o seu negócio</h2><p>Comece grátis. Sem cartão de crédito.</p></div>' +
      '<div class="pricing-grid">' +
      '<div class="price-card"><h3>Plano Essencial</h3><p class="price-desc">Para pequenos negócios começando a digitalizar sua operação.</p>' +
      '<div class="price-amount"><span class="value">R$ 49</span><span class="period">/mês</span></div>' +
      '<ul class="price-list">' + ["Pedidos ilimitados", "Até 50 clientes", "Estoque básico", "Caixa diário", "1 funcionário"].map(function (t) { return "<li>" + icon("check") + t + "</li>"; }).join("") + "</ul>" +
      '<button class="btn btn-dark btn-block" data-href="/cadastro">Começar agora</button></div>' +
      '<div class="price-card featured"><span class="price-flag">Mais popular</span><h3>Plano Completo</h3><p class="price-desc">Para negócios que precisam de mais controle e funcionários.</p>' +
      '<div class="price-amount"><span class="value">R$ 89</span><span class="period">/mês</span></div>' +
      '<ul class="price-list">' + ["Tudo do Essencial", "Clientes ilimitados", "Múltiplos funcionários", "Relatórios avançados", "Controle de fiado completo"].map(function (t) { return "<li>" + icon("check") + t + "</li>"; }).join("") + "</ul>" +
      '<button class="btn btn-primary btn-block" data-href="/cadastro">Começar agora</button></div>' +
      "</div></div></section>" +

      '<section class="section contact-section" id="contato"><div class="contact-inner">' +
      '<div class="section-head"><h2>Fale com a gente</h2><p>Tem alguma dúvida? Envie uma mensagem.</p></div>' +
      '<form class="contact-form" id="landingContactForm" novalidate>' +
      '<div class="field"><label for="c-nome">Nome</label><input id="c-nome" type="text" placeholder="Seu nome completo" autocomplete="name"></div>' +
      '<div class="field"><label for="c-email">E-mail</label><input id="c-email" type="email" placeholder="seu@email.com" autocomplete="email"></div>' +
      '<div class="field"><label for="c-tel">Telefone</label><input id="c-tel" type="tel" placeholder="(00) 00000-0000" autocomplete="tel"></div>' +
      '<div class="field"><label for="c-msg">Mensagem</label><textarea id="c-msg" rows="4" placeholder="Como podemos ajudar?"></textarea></div>' +
      '<button type="submit" class="btn btn-primary btn-block">Enviar mensagem</button>' +
      "</form></div></section>" +

      '<footer class="landing-footer"><div class="landing-footer-inner">' +
      logoHtml("sm") +
      '<div class="landing-footer-links"><button data-href="/login">Entrar</button><button data-href="/cadastro">Cadastrar</button></div>' +
      '<p class="copy">© 2026 Conecta+. Todos os direitos reservados.</p>' +
      "</div></footer>" +
      "</div>"
    );
  },
  bind: function () {
    const menuToggle = qs("#landingMenuToggle");
    const mobileNav = qs("#landingMobileNav");
    if (menuToggle && mobileNav) {
      menuToggle.addEventListener("click", function () {
        const open = mobileNav.classList.toggle("is-open");
        menuToggle.setAttribute("aria-expanded", String(open));
        menuToggle.innerHTML = open ? icon("close") : icon("menu");
      });
    }
    const form = qs("#landingContactForm");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        // TODO(backend): enviar formulário de contato para o servidor
        showToast("Funcionalidade disponível em breve.");
        form.reset();
      });
    }
  }
};

