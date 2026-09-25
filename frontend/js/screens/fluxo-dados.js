"use strict";
/* =========================================================
   SCREENS/FLUXO-DADOS.JS — tela: fluxo de dados do sistema
   ========================================================= */
const ScreenFluxoDados = {
  render: function () {
    const usuarios = [
      { tipo: "CLIENTE", cor: "var(--success)", acoes: ["Faz pedido", "Acompanha pedido", "Consulta histórico", "Consulta dívidas"] },
      { tipo: "FUNCIONÁRIO", cor: "var(--purple)", acoes: ["Registra pedidos", "Atualiza status", "Consulta clientes", "Registra vendas"] },
      { tipo: "GERENTE", cor: "var(--blue-primary)", acoes: ["Gerencia pedidos", "Cadastra clientes", "Controla estoque", "Controla fiado", "Gerencia funcionários", "Consulta relatórios"] },
    ];
    const modulos = [
      { n: "PEDIDOS", i: "clipboard" }, { n: "CLIENTES", i: "users" }, { n: "FIADO", i: "handshake" },
      { n: "ESTOQUE", i: "box" }, { n: "CAIXA", i: "cash" }, { n: "FUNCIONÁRIOS", i: "user" }, { n: "RELATÓRIOS", i: "chart" },
    ];
    return (
      '<div class="fade-in" style="min-height:100vh;background:var(--bg);padding:24px;">' +
      '<div style="max-width:1024px;margin:0 auto;">' +
      '<div style="display:flex;align-items:center;gap:16px;margin-bottom:28px;">' +
      '<button type="button" data-href="/" aria-label="Voltar" style="color:var(--gray-400);padding:8px;border-radius:8px;">' + icon("chevronLeft") + "</button>" +
      logoHtml("md") + '<h1 style="font-size:1.125rem;font-weight:700;">Fluxo de Dados do Conecta+</h1>' +
      "</div>" +
      '<div style="display:grid;gap:16px;grid-template-columns:1fr;" class="fluxo-grid">' +
      '<div style="display:flex;flex-direction:column;gap:14px;">' +
      usuarios.map(function (u) {
        return '<div class="card card-pad" style="border-left:4px solid ' + u.cor + ';">' +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;"><span style="width:28px;height:28px;border-radius:8px;background:' + u.cor + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;">' + u.tipo.charAt(0) + '</span><p style="font-weight:700;font-size:.875rem;color:' + u.cor + ';">' + u.tipo + "</p></div>" +
          u.acoes.map(function (a) { return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><span style="width:6px;height:6px;border-radius:50%;background:' + u.cor + ';flex-shrink:0;"></span><p style="font-size:.75rem;color:var(--gray-600);">' + a + "</p></div>"; }).join("") +
          '<div style="display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:8px;border-top:1px solid var(--gray-100);">' + icon("chevronRight", "icon-sm") + '<span style="font-size:.75rem;font-weight:600;color:var(--text-secondary);">SISTEMA CONECTA+</span></div>' +
          "</div>";
      }).join("") +
      "</div>" +
      '<div style="display:flex;flex-direction:column;gap:14px;">' +
      '<div style="background:var(--blue-dark);border-radius:16px;padding:20px;text-align:center;">' +
      '<div style="display:flex;justify-content:center;margin-bottom:10px;">' + logoHtml("sm", true) + "</div>" +
      '<p style="color:#fff;font-weight:700;font-size:1.0625rem;">SISTEMA CONECTA+</p><p style="color:var(--gray-400);font-size:.75rem;margin-top:4px;">Plataforma central de gestão</p>' +
      "</div>" +
      '<p style="font-size:.6875rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.04em;text-align:center;">Módulos do sistema</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
      modulos.map(function (m) { return '<div class="card" style="padding:10px 12px;display:flex;align-items:center;gap:8px;">' + icon(m.i, "icon-sm") + '<span style="font-size:.75rem;font-weight:600;">' + m.n + "</span></div>"; }).join("") +
      "</div></div></div>" +
      '<div class="card card-pad" style="margin-top:20px;"><p style="font-weight:700;margin-bottom:14px;">Fluxo principal de navegação</p>' +
      '<div style="display:grid;gap:16px;grid-template-columns:1fr;" class="field-row-sm2">' +
      [
        { t: "Fluxo do Cliente", cor: "var(--success)", etapas: ["Início → Cardápio", "Cardápio → Produto", "Produto → Carrinho", "Carrinho → Pedido", "Pedido → Acompanhar"] },
        { t: "Fluxo do Funcionário", cor: "var(--purple)", etapas: ["Login → Início", "Início → Pedidos", "Pedidos → Atualizar status", "Início → Clientes", "Início → Estoque/Caixa"] },
        { t: "Fluxo do Gerente", cor: "var(--blue-primary)", etapas: ["Cadastro → Dashboard", "Dashboard → Pedidos/Clientes", "Dashboard → Fiado/Estoque", "Dashboard → Funcionários", "Dashboard → Relatórios"] },
      ].map(function (f) {
        return "<div><p style=\"font-weight:700;margin-bottom:8px;color:" + f.cor + ";font-size:.8125rem;\">" + f.t + "</p>" +
          f.etapas.map(function (e, i) { return '<div style="display:flex;gap:8px;color:var(--gray-600);font-size:.75rem;margin-bottom:4px;"><span style="color:var(--gray-400);font-family:monospace;">' + (i + 1) + ".</span><span>" + e + "</span></div>"; }).join("") +
          "</div>";
      }).join("") +
      "</div></div>" +
      "</div></div>"
    );
  }
};

