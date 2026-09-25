"use strict";
/* =========================================================
   ROUTER.JS — roteador + delegacao global de eventos
   // TODO(backend): proteger rotas por perfil autenticado (sessão real)
   //
   // Roteamento via History API com URLs reais (ex.: /gerente/estoque,
   // sem "#"). Isso exige que o servidor reescreva qualquer caminho
   // para /index.html (ver frontend/vercel.json), senao recarregar a
   // pagina numa rota interna resulta em 404 do servidor.
   // A tabela `routes` e' definida em main.js, carregado por ultimo.
   ========================================================= */
function getCurrentPath() {
  let path = window.location.pathname;
  if (path.length > 1 && path.charAt(path.length - 1) === "/") path = path.slice(0, -1);
  return path || "/";
}

function matchRoute(path) {
  const segments = path.split("/").filter(Boolean);
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const patSegments = route.path.split("/").filter(Boolean);
    if (patSegments.length !== segments.length) continue;
    const params = {};
    let ok = true;
    for (let j = 0; j < patSegments.length; j++) {
      const ps = patSegments[j], s = segments[j];
      if (ps.charAt(0) === ":") { params[ps.slice(1)] = decodeURIComponent(s); }
      else if (ps !== s) { ok = false; break; }
    }
    if (ok) return { route: route, params: params };
  }
  return null;
}

function navigate(path, opts) {
  opts = opts || {};
  if (path === getCurrentPath()) { render(); return; }
  if (opts.replace) history.replaceState(null, "", path);
  else history.pushState(null, "", path);
  render();
}

function render() {
  closeModal();
  const match = matchRoute(getCurrentPath());
  const root = document.getElementById("app");
  if (!match) {
    document.title = "Página não encontrada · Conecta+";
    root.innerHTML = ScreenNotFound.render({});
    if (ScreenNotFound.bind) ScreenNotFound.bind({});
  } else {
    document.title = match.route.title;
    const html = match.route.screen.render(match.params);
    // Uma tela pode redirecionar (chamando navigate) e devolver null:
    // isso já re-renderizou a rota de destino, então não sobrescrevemos.
    if (html === null) return;
    root.innerHTML = html;
    if (match.route.screen.bind) match.route.screen.bind(match.params);
  }
  window.scrollTo(0, 0);
  const scrollable = root.querySelector(".app-content");
  if (scrollable) scrollable.scrollTop = 0;
}

/* --- delegação global de eventos --- */
document.addEventListener("click", function (e) {
  const toggleBtn = e.target.closest("[data-sidebar-toggle]");
  if (toggleBtn) {
    const sidebar = document.getElementById("appSidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (sidebar) {
      const open = sidebar.classList.toggle("is-open");
      if (backdrop) backdrop.classList.toggle("is-open", open);
      toggleBtn.setAttribute("aria-expanded", String(open));
    }
    return;
  }
  const backdropEl = e.target.closest("[data-sidebar-backdrop]");
  if (backdropEl) {
    const sidebar = document.getElementById("appSidebar");
    const toggleBtn2 = document.querySelector("[data-sidebar-toggle]");
    if (sidebar) sidebar.classList.remove("is-open");
    backdropEl.classList.remove("is-open");
    if (toggleBtn2) toggleBtn2.setAttribute("aria-expanded", "false");
    return;
  }
  const scrollEl = e.target.closest("[data-scroll]");
  if (scrollEl) {
    e.preventDefault();
    const target = document.getElementById(scrollEl.getAttribute("data-scroll"));
    if (target) target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
    const mobileNav = document.getElementById("landingMobileNav");
    if (mobileNav) mobileNav.classList.remove("is-open");
    return;
  }
  // Fecha o modal ao clicar exatamente no fundo (nao em conteudo interno,
  // que agora borbulha normalmente ate aqui, sem stopPropagation).
  if (e.target.id === "modalOverlay") { closeModal(); return; }

  const toastEl = e.target.closest("[data-toast]");
  const modalCloseEl = e.target.closest("[data-modal-close]");
  if (toastEl || modalCloseEl) {
    e.preventDefault();
    if (toastEl) showToast(toastEl.getAttribute("data-toast") || "Funcionalidade disponível em breve.");
    if (modalCloseEl) closeModal();
    return;
  }
  const hrefEl = e.target.closest("[data-href]");
  if (hrefEl) {
    e.preventDefault();
    navigate(hrefEl.getAttribute("data-href"));
  }
});
document.addEventListener("keydown", function (e) {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches('[data-href][tabindex]')) {
    e.preventDefault();
    e.target.click();
  }
  if (e.key === "Escape") closeModal();
});
