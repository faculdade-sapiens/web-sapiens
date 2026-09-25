"use strict";
/* =========================================================
   CONECTA+ — HTML/CSS/JS puro (sem frameworks, sem backend)

   Hierarquia de js/ (carregada em ordem, ver index.html):
   1. utils.js              — funcoes utilitarias
   2. icons.js               — icones SVG inline
   3. data.js                — dados de exemplo (seed)
   4. state.js                — estado em memoria + getters
   5. router.js               — roteador (hash) + eventos globais
   6. components.js           — componentes de UI compartilhados
   7. screens/landing.js       — tela: landing page
   8. screens/auth.js          — telas: login, cadastro, escolher perfil
   9. screens/cliente.js       — telas: app do cliente
   10. screens/gerente.js       — telas: app do gerente
   11. screens/funcionario.js   — telas: app do funcionario
   12. screens/fluxo-dados.js   — tela: fluxo de dados
   13. not-found.js             — tela: 404
   14. main.js                  — tabela de rotas + inicializacao
   ========================================================= */

/* =========================================================
   UTILIDADES
   ========================================================= */
function formatBRL(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDatePt(date) {
  return (date || new Date()).toLocaleDateString("pt-BR");
}
function formatTimePt(date) {
  return (date || new Date()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
let _idCounter = 1000;
function nextId() { return ++_idCounter; }
function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function qs(sel, root) { return (root || document).querySelector(sel); }
function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function initialLetter(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}
