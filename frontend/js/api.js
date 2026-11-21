"use strict";
/* =========================================================
   API.JS — comunicacao com o backend (C#) e sessao do usuario
   ========================================================= */

// Endereco do backend publicado no Railway (preencher depois do deploy).
const API_PRODUCAO = "";
const API_LOCAL = "http://localhost:5169";

const API_URL = ["localhost", "127.0.0.1"].includes(location.hostname) ? API_LOCAL : API_PRODUCAO;

const CHAVE_SESSAO = "conecta.sessao";

function lerSessao() {
  try { return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO)) || null; } catch (e) { return null; }
}
function salvarSessao(sessao) {
  try { sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao)); } catch (e) { /* navegador sem storage */ }
}
function encerrarSessao() {
  try { sessionStorage.removeItem(CHAVE_SESSAO); } catch (e) { /* idem */ }
}

// Erro padronizado: { status, mensagem, campos: { nomeDoCampo: "mensagem" } }
function ErroApi(status, mensagem, campos) {
  this.status = status;
  this.mensagem = mensagem;
  this.campos = campos || {};
}

async function chamarApi(metodo, caminho, corpo) {
  if (!API_URL) throw new ErroApi(0, "O servidor ainda não está no ar. Tente mais tarde.");

  const headers = {};
  if (corpo !== undefined) headers["Content-Type"] = "application/json";
  const sessao = lerSessao();
  if (sessao && sessao.token) headers["Authorization"] = "Bearer " + sessao.token;

  let resp;
  try {
    resp = await fetch(API_URL + caminho, {
      method: metodo,
      headers: headers,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch (e) {
    throw new ErroApi(0, "Não foi possível falar com o servidor. Confira sua internet e tente de novo.");
  }

  // o servidor manda um token novo quando o atual esta perto de vencer
  const novoToken = resp.headers.get("X-Novo-Token");
  if (novoToken && sessao) { sessao.token = novoToken; salvarSessao(sessao); }

  let dados = null;
  const texto = await resp.text();
  if (texto) { try { dados = JSON.parse(texto); } catch (e) { dados = null; } }

  if (resp.ok) return dados;

  if (resp.status === 401 && sessao) {
    encerrarSessao();
  }

  const campos = {};
  if (dados && dados.errors) {
    Object.keys(dados.errors).forEach(function (k) { campos[k] = [].concat(dados.errors[k])[0]; });
  }
  const mensagem = (dados && (dados.detail || (Object.keys(campos).length ? "" : dados.title))) ||
    (Object.keys(campos).length ? "Confira os campos destacados." : "Algo deu errado. Tente de novo.");
  throw new ErroApi(resp.status, mensagem, campos);
}

// leva para a area certa conforme o perfil que o SERVIDOR devolveu
function destinoPorPerfil(perfil) {
  return perfil === "GERENTE" ? "/gerente" : "/funcionario";
}

// botao "Sair" do menu lateral
document.addEventListener("click", function (e) {
  if (e.target.closest(".app-logout-btn")) encerrarSessao();
});
