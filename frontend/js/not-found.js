"use strict";
/* =========================================================
   NOT-FOUND.JS — tela: 404 (rota nao encontrada)
   ========================================================= */
const ScreenNotFound = {
  render: function () {
    return (
      '<div class="fade-in" style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;text-align:center;gap:16px;">' +
      logoHtml("md") +
      '<h1 style="font-size:1.75rem;font-weight:800;">Página não encontrada</h1>' +
      '<p style="color:var(--text-secondary);">A página que você procura não existe ou foi movida.</p>' +
      '<button type="button" class="btn btn-primary" data-href="/">Voltar ao início</button>' +
      "</div>"
    );
  }
};

