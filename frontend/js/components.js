"use strict";
/* =========================================================
   COMPONENTS.JS — componentes de UI compartilhados entre telas
   (Logo, badges, modal, toast, sidebar/topbar dos apps,
   helpers de status de pedido/estoque)
   ========================================================= */
function logoHtml(size, white) {
  size = size || "md";
  return '<span class="logo logo-' + size + (white ? " logo-white" : "") + '">' +
    '<span class="logo-mark"><img src="/images/logo-conecta.jpeg" alt="Conecta+"></span>' +
    '<span class="logo-text">Conecta<span class="plus">+</span></span></span>';
}

function badgeHtml(text, cls) {
  return '<span class="badge ' + (cls || statusBadgeClass(text)) + '">' + escapeHtml(text) + "</span>";
}

/* --- Modal --- */
function openModal(titleText, bodyHtml, footerHtml) {
  const root = document.getElementById("modal-root");
  root.innerHTML =
    '<div class="modal-overlay is-open" id="modalOverlay">' +
    '<div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' +
    '<h3 class="modal-title" id="modalTitle">' + escapeHtml(titleText) + "</h3>" +
    '<div class="modal-body">' + bodyHtml + "</div>" +
    (footerHtml ? '<div class="modal-actions">' + footerHtml + "</div>" : "") +
    "</div></div>";
  return root;
}
function closeModal() {
  const root = document.getElementById("modal-root");
  if (root) root.innerHTML = "";
}

/* --- Toast --- */
let _toastTimer = null;
function showToast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(function () { el.classList.add("is-open"); });
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function () { el.classList.remove("is-open"); }, 2800);
}

/* --- Sidebar / topbar dos apps (gerente e funcionario) --- */
function sidebarHtml(activeId, items, roleLabel) {
  const navHtml = items.map(function (it) {
    return '<button class="app-nav-item' + (it.id === activeId ? " active" : "") + '" data-href="' + it.href + '">' +
      icon(it.icon) + '<span class="label">' + it.label + "</span></button>";
  }).join("");
  return (
    '<div class="app-sidebar-backdrop" id="sidebarBackdrop" data-sidebar-backdrop></div>' +
    '<aside class="app-sidebar" id="appSidebar">' +
    '<div class="app-sidebar-head">' + logoHtml("sm", true) + '<span class="role-label">' + roleLabel + "</span></div>" +
    '<nav class="app-sidebar-nav">' + navHtml + "</nav>" +
    '<div class="app-sidebar-foot"><button class="app-logout-btn" data-href="/">' + icon("logout") + '<span class="label">Sair</span></button></div>' +
    "</aside>"
  );
}
function topbarHtml(title, backHref) {
  return (
    '<header class="app-topbar">' +
    '<button class="app-topbar-toggle" data-sidebar-toggle aria-label="Abrir menu" aria-expanded="false" aria-controls="appSidebar">' + icon("menu") + "</button>" +
    (backHref ? '<button class="app-topbar-back" data-href="' + backHref + '" aria-label="Voltar">' + icon("chevronLeft") + "</button>" : "") +
    "<h1>" + escapeHtml(title) + "</h1>" +
    '<div class="app-topbar-avatar" aria-hidden="true">C</div>' +
    "</header>"
  );
}

/* --- Status de pedido (usado por gerente e funcionario) --- */
function pedidoStatusButtonHtml(pedido) {
  const podeAvancar = pedido.status !== "Entregue" && pedido.status !== "Cancelado";
  if (!podeAvancar) return badgeHtml(pedido.status);
  return '<button type="button" class="badge ' + statusBadgeClass(pedido.status) + '" data-advance-pedido="' + pedido.id + '" style="border:none;cursor:pointer;" title="Clique para avançar o status">' + escapeHtml(pedido.status) + "</button>";
}
function bindPedidoStatusButtons() {
  qsa("[data-advance-pedido]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const pedido = getPedido(btn.getAttribute("data-advance-pedido"));
      if (pedido) pedido.status = PROXIMO_STATUS[pedido.status];
      render();
    });
  });
}
/* --- Status de estoque (usado por gerente e funcionario) --- */
function estoqueStatusInfo(p) {
  if (p.quantidade === 0) return { label: "Sem estoque", cls: "badge-danger" };
  if (p.quantidade <= p.estoqueMinimo) return { label: "Estoque baixo", cls: "badge-warning" };
  return { label: "Normal", cls: "badge-success" };
}
