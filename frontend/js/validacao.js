"use strict";
/* =========================================================
   VALIDACAO.JS — validacao dos formularios no navegador.
   Mesmas regras do backend (Dominio/Validacao/Regras.cs).
   Serve so para avisar o usuario mais rapido: o servidor
   valida tudo de novo e e ele quem decide.
   ========================================================= */
const VALIDACAO = {
  senhaMinimo: 8,
  senhaMaximoBytes: 72,
  nomeMaximo: 120,
};

function limparTexto(v) { return String(v || "").trim().replace(/\s+/g, " "); }

function validarNomeCampo(valor, rotulo) {
  const v = limparTexto(valor);
  const r = rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
  if (!v) return "Informe " + rotulo + ".";
  if (v.length < 2) return r + " está muito curto.";
  if (v.length > VALIDACAO.nomeMaximo) return r + " pode ter no máximo " + VALIDACAO.nomeMaximo + " caracteres.";
  if (/[<>]/.test(v)) return r + " tem caracteres que não são permitidos.";
  return null;
}

function validarEmailCampo(valor) {
  const v = String(valor || "").trim();
  if (!v) return "Informe o e-mail.";
  if (v.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Esse e-mail não é válido. Confira se digitou certo.";
  return null;
}

function validarSenhaCampo(senha) {
  if (!senha) return "Informe uma senha.";
  if (senha.length < VALIDACAO.senhaMinimo) return "A senha precisa ter pelo menos " + VALIDACAO.senhaMinimo + " caracteres.";
  if (new TextEncoder().encode(senha).length > VALIDACAO.senhaMaximoBytes) return "A senha está muito longa.";
  if (!/\p{L}/u.test(senha) || !/\d/.test(senha)) return "A senha precisa ter letras e números.";
  return null;
}

function validarTelefoneCampo(valor) {
  const digitos = String(valor || "").replace(/\D/g, "");
  if (!digitos) return String(valor || "").trim() ? "Telefone inválido. Use o formato (00) 00000-0000." : null;
  if ((digitos.length !== 10 && digitos.length !== 11) || digitos.charAt(0) === "0") return "Telefone inválido. Use o formato (00) 00000-0000.";
  return null;
}

/* --- exibicao dos erros --- */

// mapa: { idDoInput: "mensagem" }
function mostrarErrosCampos(mapa) {
  Object.keys(mapa).forEach(function (id) {
    const input = document.getElementById(id);
    if (!input || !mapa[id]) return;
    const field = input.closest(".field");
    if (!field) return;
    field.classList.add("has-error");
    input.setAttribute("aria-invalid", "true");
    let msg = field.querySelector(".field-error");
    if (!msg) {
      msg = document.createElement("p");
      msg.className = "field-error";
      msg.id = id + "-erro";
      field.appendChild(msg);
      input.setAttribute("aria-describedby", msg.id);
    }
    msg.textContent = mapa[id];
  });
}

function limparErros(raiz) {
  qsa(".field.has-error", raiz).forEach(function (f) { f.classList.remove("has-error"); });
  qsa(".field-error", raiz).forEach(function (e) { e.remove(); });
  qsa("[aria-invalid]", raiz).forEach(function (i) { i.removeAttribute("aria-invalid"); i.removeAttribute("aria-describedby"); });
  const alerta = qs(".form-alert", raiz);
  if (alerta) { alerta.hidden = true; alerta.textContent = ""; }
}

function mostrarAlerta(raiz, texto) {
  const alerta = qs(".form-alert", raiz);
  if (!alerta || !texto) return;
  alerta.textContent = texto;
  alerta.hidden = false;
}

// coloca o foco no primeiro campo com erro
function focarPrimeiroErro(raiz) {
  const campo = qs(".field.has-error input, .field.has-error select", raiz);
  if (campo) campo.focus();
}

// trava o botao enquanto espera o servidor
function botaoCarregando(btn, carregando, textoCarregando) {
  if (!btn) return;
  if (carregando) {
    btn.dataset.textoOriginal = btn.textContent;
    btn.textContent = textoCarregando;
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.textoOriginal || btn.textContent;
    btn.disabled = false;
  }
}
