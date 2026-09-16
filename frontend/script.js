/* =========================================================
   CONECTA+ · Protótipo interativo
   ========================================================= */

(function(){
  'use strict';

  /* ---------- Troca de modo (Login/Cadastro/App/Vitrine) ---------- */
  window.setMode = function(mode){
    document.querySelectorAll('.mode-screen').forEach(s => {
      s.classList.remove('is-visible');
      s.setAttribute('aria-hidden', 'true');
    });
    const target = document.getElementById('mode-' + mode);
    if(target){
      target.classList.add('is-visible');
      target.setAttribute('aria-hidden', 'false');
    }
    document.querySelectorAll('.mtab').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector('.mtab[data-mode="' + mode + '"]');
    if(btn) btn.classList.add('active');

    // Painel de princípios
    document.querySelectorAll('.principles').forEach(p => { p.style.display = 'none'; });
    const panel = document.getElementById('panel-' + mode);
    if(panel){ panel.style.display = 'block'; panel.open = true; }

    // Fecha modal se estiver aberto
    closeModal();
  };

  document.querySelectorAll('.mtab').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  /* ---------- Navegação interna do app ---------- */
  window.goScreen = function(name){
    document.querySelectorAll('#mode-app .screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn, .nav-item').forEach(b => b.classList.remove('active'));
    const screen = document.getElementById('screen-' + name);
    if(screen) screen.classList.add('active');
    document.querySelectorAll('.nav-btn[data-screen="' + name + '"], .nav-item[data-screen="' + name + '"]')
      .forEach(b => b.classList.add('active'));

    // FAB visível só em Início e Mercado
    const fab = document.getElementById('fab-btn');
    if(fab) fab.style.display = (name === 'mercado' || name === 'inicio') ? 'flex' : 'none';
  };

  document.querySelectorAll('.nav-btn, .nav-item').forEach(btn => {
    btn.addEventListener('click', () => goScreen(btn.dataset.screen));
  });

  /* ---------- Switches (toggles) ---------- */
  document.querySelectorAll('.switch').forEach(sw => {
    sw.addEventListener('click', () => {
      sw.classList.toggle('on');
      sw.setAttribute('aria-checked', sw.classList.contains('on') ? 'true' : 'false');
    });
  });

  /* ---------- Modal (suporta múltiplos overlays na página) ---------- */
  const fab = document.getElementById('fab-btn');
  let lastFocused = null;

  window.openModal = function(id, title){
    const target = document.getElementById(id);
    if(!target) return;
    lastFocused = document.activeElement;
    document.querySelectorAll('.modal-overlay').forEach(o => o.classList.remove('show'));
    target.classList.add('show');
    const heading = target.querySelector('h3');
    if(heading) heading.textContent = title || heading.dataset.default || heading.textContent;
    const firstField = target.querySelector('input, select, textarea, button');
    if(firstField) firstField.focus();
  };

  window.closeModal = function(){
    document.querySelectorAll('.modal-overlay').forEach(o => o.classList.remove('show'));
    if(lastFocused && lastFocused.focus) lastFocused.focus();
  };

  if(fab){
    fab.addEventListener('click', () => openModal('modal-overlay'));
  }

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if(e.target === overlay) closeModal();
    });
  });

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') closeModal();
  });

  /* ---------- Excluir item de uma lista (mercado/estoque) ---------- */
  window.deleteListItem = function(btn){
    const item = btn.closest('.list-item');
    if(item) item.remove();
  };

  /* ---------- Histórico de movimentações do estoque ---------- */
  window.toggleHistory = function(btn){
    const wrap = btn.closest('.item-info').querySelector('.stock-history');
    if(wrap) wrap.hidden = !wrap.hidden;
  };

  /* ---------- Badges clicáveis: alterar status (pedido/agendamento) ---------- */
  document.querySelectorAll('.status-cycle').forEach(badge => {
    badge.addEventListener('click', () => {
      const states = badge.dataset.states.split('|');
      const classes = badge.dataset.classes.split('|');
      let idx = states.indexOf(badge.textContent.trim());
      idx = (idx + 1) % states.length;
      classes.forEach(c => badge.classList.remove(c));
      badge.classList.add(classes[idx]);
      badge.textContent = states[idx];
    });
  });

  /* ---------- Badge clicável: revogar/reativar acesso de Funcionário ---------- */
  document.querySelectorAll('.status-revoke').forEach(btn => {
    btn.addEventListener('click', () => {
      const isActive = btn.textContent.trim() === btn.dataset.activeLabel;
      btn.textContent = isActive ? btn.dataset.revokedLabel : btn.dataset.activeLabel;
      btn.classList.toggle('danger', isActive);
      btn.classList.toggle('neutral', !isActive);
      const row = btn.closest('.team-row');
      if(row) row.classList.toggle('revoked', isActive);
    });
  });

  /* ---------- Agenda: alternar Diário / Semanal ---------- */
  document.querySelectorAll('#agenda-view-switch button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#agenda-view-switch button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.agendaView;
      const diario = document.getElementById('agenda-diario');
      const semanal = document.getElementById('agenda-semanal');
      if(diario) diario.hidden = (view !== 'diario');
      if(semanal) semanal.hidden = (view !== 'semanal');
    });
  });

  /* ---------- Relatórios: trocar tipo de relatório e exportar em PDF ---------- */
  document.querySelectorAll('#report-tabs .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#report-tabs .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const type = chip.dataset.report;
      document.querySelectorAll('.report-table').forEach(t => { t.hidden = (t.id !== 'report-' + type); });
    });
  });

  const exportBtn = document.getElementById('export-pdf-btn');
  if(exportBtn) exportBtn.addEventListener('click', () => window.print());

  /* ---------- Role switch (Gerente/Funcionário) ----------
     Nota: usa seletores por id (não ".role-switch button") porque a classe
     .role-switch também estiliza o alternador Diário/Semanal da Agenda. */
  const ROLE_SWITCH_SELECTOR = '#role-switch-wrap button, #role-switch-wrap-mobile button';

  function applyRole(role){
    const isGerente = role === 'gerente';
    const label = isGerente ? 'Gerente' : 'Funcionário';
    document.querySelectorAll('#role-label, #role-label-mobile')
      .forEach(el => el.textContent = label);
    document.querySelectorAll('[data-gerente-only]')
      .forEach(el => el.style.display = isGerente ? '' : 'none');
    document.querySelectorAll('[data-funcionario-only]')
      .forEach(el => el.style.display = isGerente ? 'none' : '');
    document.querySelectorAll(ROLE_SWITCH_SELECTOR).forEach(b => {
      b.classList.toggle('active', b.dataset.role === role);
    });

    // Funcionário não acessa Relatórios: volta para o Início se estiver lá
    if(!isGerente){
      const relScreen = document.getElementById('screen-relatorios');
      if(relScreen && relScreen.classList.contains('active')) goScreen('inicio');
    }
  }

  document.querySelectorAll(ROLE_SWITCH_SELECTOR).forEach(btn => {
    btn.addEventListener('click', () => applyRole(btn.dataset.role));
  });

  /* ---------- Logout ---------- */
  window.doLogout = function(){
    applyRole('gerente');
    goScreen('inicio');
    setMode('login');
  };
  document.querySelectorAll('#logout-btn-desktop, #logout-btn-mobile').forEach(btn => {
    btn.addEventListener('click', doLogout);
  });

  /* ---------- Esqueci minha senha ---------- */
  const forgotBtn = document.getElementById('forgot-btn');
  const forgotMsg = document.getElementById('forgot-msg');
  if(forgotBtn && forgotMsg){
    forgotBtn.addEventListener('click', () => { forgotMsg.hidden = false; });
  }

  /* ---------- Vitrine: tabs ---------- */
  document.querySelectorAll('.vtab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.vtab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.vtab;
      const cardapio = document.getElementById('vitrine-cardapio');
      const agendar = document.getElementById('vitrine-agendar');
      if(cardapio) cardapio.style.display = (tab === 'cardapio') ? 'block' : 'none';
      if(agendar) agendar.style.display = (tab === 'agendar') ? 'block' : 'none';
    });
  });

  /* ---------- Vitrine: carrinho ---------- */
  const cart = {};

  window.changeQty = function(btn, delta){
    const wrap = btn.parentElement;
    const valEl = wrap.querySelector('.qty-val');
    let val = parseInt(valEl.textContent, 10) + delta;
    if(val < 0) val = 0;
    valEl.textContent = val;

    const card = btn.closest('.prod-card');
    const name = card.querySelector('.prod-name').textContent;
    const priceText = card.querySelector('.prod-price').textContent;
    const price = parseFloat(priceText.replace('R$', '').replace(/\s/g,'').replace(',', '.'));

    if(val > 0){
      cart[name] = { qty: val, price: price };
    } else {
      delete cart[name];
    }
    updateCartBar();
  };

  function updateCartBar(){
    let totalItems = 0, totalPrice = 0;
    Object.values(cart).forEach(i => {
      totalItems += i.qty;
      totalPrice += i.qty * i.price;
    });
    const bar = document.getElementById('cart-bar');
    const info = document.getElementById('cart-info');
    const summary = document.getElementById('checkout-summary');
    if(!bar) return;
    if(totalItems > 0){
      const text = totalItems + (totalItems === 1 ? ' item · R$ ' : ' itens · R$ ')
        + totalPrice.toFixed(2).replace('.', ',');
      bar.style.display = 'flex';
      info.textContent = text;
      if(summary) summary.textContent = text;
    } else {
      bar.style.display = 'none';
    }
  }

  /* ---------- Vitrine: próximos 30 dias para agendamento ---------- */
  const agDataSelect = document.getElementById('ag-data');
  if(agDataSelect){
    const dayNames = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
    const monthNames = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const base = new Date();
    const frag = document.createDocumentFragment();
    for(let i = 0; i < 30; i++){
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const opt = document.createElement('option');
      opt.textContent = (i === 0 ? 'Hoje · ' : '') + dayNames[d.getDay()] + ', ' + d.getDate() + ' de ' + monthNames[d.getMonth()];
      frag.appendChild(opt);
    }
    agDataSelect.appendChild(frag);
  }

  /* ---------- Vitrine: slot selection ---------- */
  window.selectSlot = function(el){
    if(el.classList.contains('disabled')) return;
    document.querySelectorAll('.slot-chip').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
  };

  /* ---------- CNPJ (alfanumérico nas 12 primeiras + 2 dígitos) ---------- */
  const cnpjField = document.getElementById('cnpj-field');
  if(cnpjField){
    cnpjField.addEventListener('input', () => {
      let raw = cnpjField.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 14);
      let base = raw.slice(0, 12);
      let dv = raw.slice(12, 14).replace(/[^0-9]/g, '');
      let chars = (base + dv).slice(0, 14);

      let out = chars;
      if(chars.length > 2)  out = chars.slice(0,2) + '.' + chars.slice(2);
      if(chars.length > 5)  out = out.slice(0,6) + '.' + chars.slice(5);
      if(chars.length > 8)  out = out.slice(0,10) + '/' + chars.slice(8);
      if(chars.length > 12) out = out.slice(0,15) + '-' + chars.slice(12);
      cnpjField.value = out;
    });

    cnpjField.addEventListener('keypress', (e) => {
      const digitsAndLetters = cnpjField.value.replace(/[^0-9A-Za-z]/g, '');
      const isLast2 = digitsAndLetters.length >= 12;
      const key = e.key;
      const valid = isLast2 ? /[0-9]/.test(key) : /[0-9A-Za-z]/.test(key);
      if(!valid) e.preventDefault();
    });
  }

  /* ---------- Acessibilidade: clicar com Enter em <a role=button> ---------- */
  document.querySelectorAll('a[role="button"]').forEach(el => {
    el.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        el.click();
      }
    });
  });

  /* ---------- Fecha modal ao clicar em elementos com [data-close-modal] ---------- */
  document.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', closeModal);
  });

})();