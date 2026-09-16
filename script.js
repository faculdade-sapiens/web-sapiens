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

  /* ---------- Modal ---------- */
  const overlay = document.getElementById('modal-overlay');
  const fab = document.getElementById('fab-btn');
  let lastFocused = null;

  if(fab && overlay){
    fab.addEventListener('click', () => {
      lastFocused = document.activeElement;
      overlay.classList.add('show');
      const firstInput = overlay.querySelector('input, button');
      if(firstInput) firstInput.focus();
    });
  }

  window.closeModal = function(){
    if(!overlay) return;
    overlay.classList.remove('show');
    if(lastFocused && lastFocused.focus) lastFocused.focus();
  };

  if(overlay){
    overlay.addEventListener('click', (e) => {
      if(e.target === overlay) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') closeModal();
  });

  /* ---------- Role switch (Gerente/Funcionário) ---------- */
  function applyRole(role){
    const isGerente = role === 'gerente';
    const label = isGerente ? 'Gerente' : 'Funcionário';
    document.querySelectorAll('#role-label, #role-label-mobile')
      .forEach(el => el.textContent = label);
    document.querySelectorAll('[data-gerente-only]')
      .forEach(el => el.style.display = isGerente ? '' : 'none');
    document.querySelectorAll('[data-funcionario-only]')
      .forEach(el => el.style.display = isGerente ? 'none' : '');
    document.querySelectorAll('.role-switch button').forEach(b => {
      b.classList.toggle('active', b.dataset.role === role);
    });
  }

  document.querySelectorAll('.role-switch button').forEach(btn => {
    btn.addEventListener('click', () => applyRole(btn.dataset.role));
  });

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
    if(!bar) return;
    if(totalItems > 0){
      bar.style.display = 'flex';
      info.textContent = totalItems + (totalItems === 1 ? ' item · R$ ' : ' itens · R$ ')
        + totalPrice.toFixed(2).replace('.', ',');
    } else {
      bar.style.display = 'none';
    }
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