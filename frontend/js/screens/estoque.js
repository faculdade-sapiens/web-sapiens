"use strict";
/* =========================================================
   SCREENS/ESTOQUE.JS — tela de Estoque (RF22 a RF30), ligada a API
   Uma tela so para Gerente e Funcionario: muda apenas o menu
   lateral e o botao Excluir (so Gerente, como no servidor).
   Depende de: utils.js, icons.js, components.js, api.js,
   validacao.js, screens/gerente.js (gerenteShell) e
   screens/funcionario.js (funcionarioShell).
   ========================================================= */

const ESTOQUE_UNIDADES = [
  { valor: "unidade", rotulo: "Unidade", curto: "un." },
  { valor: "kg", rotulo: "Quilo (kg)", curto: "kg" },
  { valor: "g", rotulo: "Grama (g)", curto: "g" },
  { valor: "litro", rotulo: "Litro", curto: "L" },
  { valor: "ml", rotulo: "Mililitro (ml)", curto: "ml" },
  { valor: "caixa", rotulo: "Caixa", curto: "cx." },
  { valor: "pacote", rotulo: "Pacote", curto: "pct." },
  { valor: "dúzia", rotulo: "Dúzia", curto: "dz." },
];

// mesmos limites do servidor (Regras.cs). Aqui so servem para avisar antes; quem decide e o servidor.
const ESTOQUE_LIMITES = { nome: 120, categoria: 60, motivo: 255, quantidade: 1000000 };

function unidadeCurta(valor) {
  const u = ESTOQUE_UNIDADES.find(function (x) { return x.valor === valor; });
  return u ? u.curto : valor;
}

function quantidadeComUnidade(item) {
  return item.quantidadeAtual.toLocaleString("pt-BR") + " " + unidadeCurta(item.unidadeMedida);
}

function dataHoraPt(iso) {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function perfilLogado() {
  const sessao = lerSessao();
  return sessao && sessao.usuario ? sessao.usuario.perfil : null;
}

// "" vira null (o servidor usa o padrao); texto que nao e numero inteiro vira NaN (para dar erro aqui)
function lerInteiro(input) {
  const v = String(input.value || "").trim();
  if (v === "") return null;
  return /^-?\d+$/.test(v) ? Number(v) : NaN;
}

function validarInteiroCampo(valor, rotulo, opcoes) {
  if (valor === null) return opcoes.obrigatorio ? "Informe " + rotulo + "." : null;
  if (isNaN(valor)) return "Use só números inteiros.";
  if (valor < opcoes.minimo) return opcoes.minimo > 0 ? "A quantidade precisa ser maior que zero." : "Não pode ser negativo.";
  if (valor > ESTOQUE_LIMITES.quantidade) return "O máximo é 1.000.000.";
  return null;
}

/* --- erros vindos da API --- */

// mapaCampos: { campoDaApi: idDoInput }
function tratarErroEstoque(e, raiz, mapaCampos) {
  if (!(e instanceof ErroApi)) throw e;
  if (e.status === 401) {
    closeModal();
    showToast("Sua sessão terminou. Entre de novo.");
    navigate("/login");
    return;
  }
  if (e.status === 403) {
    mostrarAlerta(raiz, "Você não tem permissão para fazer isso.");
    return;
  }
  const mapa = {};
  Object.keys(e.campos).forEach(function (campo) {
    if (mapaCampos && mapaCampos[campo]) mapa[mapaCampos[campo]] = e.campos[campo];
  });
  mostrarErrosCampos(mapa);
  focarPrimeiroErro(raiz);
  // erro que nao e de um campo deste formulario (ex.: item apagado por outra pessoa):
  // mostra no aviso do topo, com a mensagem do proprio servidor
  if (!Object.keys(mapa).length) {
    const primeiro = Object.keys(e.campos).map(function (c) { return e.campos[c]; })[0];
    mostrarAlerta(raiz, primeiro || e.mensagem);
  }
}

/* --- tela --- */

function estoqueTelaHtml(perfil) {
  const content =
    '<div class="screen-head-row"><h2 style="font-size:1.25rem;">Estoque</h2>' +
    '<button type="button" class="btn btn-primary" id="estNovoBtn">' + icon("plus", "icon-sm") + "Adicionar item</button></div>" +
    '<div class="stat-grid stat-grid-3">' +
    '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Itens cadastrados</span><span class="stat-card-icon">' + icon("box") + '</span></div><div class="stat-card-value" id="estTotal">–</div></div>' +
    '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Estoque baixo</span><span class="stat-card-icon">' + icon("alertTriangle") + '</span></div><div class="stat-card-value" id="estBaixos">–</div><div class="stat-card-trend" style="color:var(--warning);">no mínimo ou abaixo</div></div>' +
    '<div class="stat-card"><div class="stat-card-head"><span class="stat-card-label">Sem estoque</span><span class="stat-card-icon">' + icon("alertTriangle") + '</span></div><div class="stat-card-value" id="estEsgotados">–</div><div class="stat-card-trend" style="color:var(--danger);">precisam de reposição</div></div>' +
    "</div>" +
    '<p class="low-stock-note" id="estAlerta" role="status" hidden></p>' +
    '<div class="card">' +
    '<div style="padding:16px;border-bottom:1px solid var(--gray-100);display:flex;flex-wrap:wrap;gap:12px;">' +
    '<input type="search" class="search-input" id="estBusca" placeholder="Buscar item pelo nome..." aria-label="Buscar item pelo nome" maxlength="' + ESTOQUE_LIMITES.nome + '" style="flex:2 1 220px;">' +
    '<select class="search-input" id="estCategoria" aria-label="Filtrar por categoria" style="flex:1 1 160px;"><option value="">Todas as categorias</option></select>' +
    '<select class="search-input" id="estStatus" aria-label="Filtrar por status" style="flex:1 1 160px;">' +
    '<option value="">Todos os status</option><option value="normal">Normal</option><option value="baixo">Estoque baixo</option><option value="esgotado">Sem estoque</option></select>' +
    "</div>" +
    '<div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Categoria</th><th>Quantidade</th><th>Mínimo</th><th>Status</th><th>Ações</th></tr></thead>' +
    '<tbody id="estTbody"><tr><td colspan="6" style="text-align:center;color:var(--text-secondary);">Carregando...</td></tr></tbody></table></div>' +
    "</div>";

  return perfil === "GERENTE"
    ? gerenteShell("estoque", "Estoque", null, content)
    : funcionarioShell("estoque", "Estoque", content);
}

function estoqueTelaBind() {
  // o botao Excluir aparece pelo perfil de quem esta logado (vindo do servidor no login),
  // e o servidor confere de novo: Funcionario recebe 403 mesmo se forcar a chamada
  const podeExcluir = perfilLogado() === "GERENTE";
  const tbody = qs("#estTbody");
  const buscaEl = qs("#estBusca");
  const categoriaEl = qs("#estCategoria");
  const statusEl = qs("#estStatus");
  let itensVisiveis = [];
  let ultimasCategorias = []; // sugestoes no campo categoria do formulario
  let pedidoAtual = 0;   // ignora respostas antigas se o usuario mudar o filtro rapido
  let timerBusca = null;

  // erro numa acao: mostra no formulario e, se o item sumiu (404), atualiza a lista
  function falhou(e, raiz, mapaCampos) {
    tratarErroEstoque(e, raiz, mapaCampos);
    if (e instanceof ErroApi && e.status === 404) carregar();
  }

  function linhaMensagem(texto, cor) {
    return '<tr><td colspan="6" style="text-align:center;color:' + (cor || "var(--text-secondary)") + ';">' + texto + "</td></tr>";
  }

  function filtrosAtuais() {
    return { nome: buscaEl.value, categoria: categoriaEl.value, status: statusEl.value };
  }

  function temFiltro(f) { return Boolean(f.nome.trim() || f.categoria || f.status); }

  // resumo e categorias sempre do estoque inteiro, mesmo com filtro na tabela
  function atualizarResumo(todos) {
    const baixos = todos.filter(function (i) { return i.status === "BAIXO"; }).length;
    const esgotados = todos.filter(function (i) { return i.status === "ESGOTADO"; }).length;
    qs("#estTotal").textContent = String(todos.length);
    qs("#estBaixos").textContent = String(baixos);
    qs("#estEsgotados").textContent = String(esgotados);

    // RF28: alerta visual quando algum item esta no minimo ou abaixo
    const alerta = qs("#estAlerta");
    const comAlerta = todos.filter(function (i) { return i.alerta; });
    if (comAlerta.length) {
      const nomes = comAlerta.slice(0, 3).map(function (i) { return i.nome; }).join(", ") + (comAlerta.length > 3 ? " e outros" : "");
      alerta.textContent = (comAlerta.length === 1 ? "1 item precisa" : comAlerta.length + " itens precisam") + " de reposição: " + nomes + ".";
      alerta.hidden = false;
    } else {
      alerta.hidden = true;
    }

    const escolhida = categoriaEl.value;
    const categorias = Array.from(new Set(todos.map(function (i) { return i.categoria; }).filter(Boolean)))
      .sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
    if (escolhida && categorias.indexOf(escolhida) === -1) categorias.push(escolhida);
    categoriaEl.innerHTML = '<option value="">Todas as categorias</option>' +
      categorias.map(function (c) { return '<option value="' + escapeHtml(c) + '"' + (c === escolhida ? " selected" : "") + ">" + escapeHtml(c) + "</option>"; }).join("");
    return categorias;
  }

  function linhaItem(item) {
    const info = estoqueStatusInfo(item);
    const acoes =
      '<button type="button" class="btn-link" data-acao="entrada" data-id="' + item.id + '">Entrada</button>' +
      '<button type="button" class="btn-link" data-acao="saida" data-id="' + item.id + '"' + (item.quantidadeAtual === 0 ? " disabled" : "") + ">Saída</button>" +
      '<button type="button" class="btn-link" data-acao="historico" data-id="' + item.id + '">Histórico</button>' +
      '<button type="button" class="btn-link" data-acao="editar" data-id="' + item.id + '">Editar</button>' +
      (podeExcluir ? '<button type="button" class="btn-link" style="color:var(--danger);" data-acao="excluir" data-id="' + item.id + '">Excluir</button>' : "");
    return "<tr><td style=\"font-weight:600;\">" + escapeHtml(item.nome) + "</td>" +
      "<td>" + (item.categoria ? escapeHtml(item.categoria) : '<span style="color:var(--text-secondary);">—</span>') + "</td>" +
      '<td style="font-weight:600;">' + escapeHtml(quantidadeComUnidade(item)) + "</td>" +
      "<td>" + item.quantidadeMinima.toLocaleString("pt-BR") + "</td>" +
      "<td>" + badgeHtml(info.label, info.cls) + "</td>" +
      '<td><div style="display:flex;flex-wrap:wrap;gap:10px;">' + acoes + "</div></td></tr>";
  }

  async function carregar() {
    const meuPedido = ++pedidoAtual;
    const filtros = filtrosAtuais();
    try {
      // RF30: com filtro, a tabela vem filtrada pelo servidor; o resumo usa a lista completa
      const todos = await listarEstoque({});
      const visiveis = temFiltro(filtros) ? await listarEstoque(filtros) : todos;
      if (meuPedido !== pedidoAtual || !document.body.contains(tbody)) return;

      ultimasCategorias = atualizarResumo(todos);
      itensVisiveis = visiveis;
      if (!todos.length) {
        tbody.innerHTML = linhaMensagem("Nenhum item cadastrado ainda. Clique em <strong>Adicionar item</strong> para começar.");
      } else if (!visiveis.length) {
        tbody.innerHTML = linhaMensagem("Nenhum item encontrado com esses filtros.");
      } else {
        tbody.innerHTML = visiveis.map(linhaItem).join("");
      }
    } catch (e) {
      if (meuPedido !== pedidoAtual || !document.body.contains(tbody)) return;
      if (!(e instanceof ErroApi)) throw e;
      if (e.status === 401) { tratarErroEstoque(e, document); return; }
      tbody.innerHTML = linhaMensagem(escapeHtml(e.mensagem) +
        ' <button type="button" class="btn-link" id="estTentarDeNovo">Tentar de novo</button>', "var(--danger)");
      const botao = qs("#estTentarDeNovo");
      if (botao) botao.addEventListener("click", carregar);
    }
  }

  function acharItem(id) {
    return itensVisiveis.find(function (i) { return i.id === Number(id); });
  }

  /* --- cadastro e edicao (RF22, RF23) --- */
  function abrirFormularioItem(item) {
    const editando = Boolean(item);
    const opcoesUnidade = ESTOQUE_UNIDADES.map(function (u) {
      const atual = editando ? item.unidadeMedida : "unidade";
      return '<option value="' + escapeHtml(u.valor) + '"' + (u.valor === atual ? " selected" : "") + ">" + escapeHtml(u.rotulo) + "</option>";
    }).join("");
    const listaCategorias = ultimasCategorias.map(function (c) { return '<option value="' + escapeHtml(c) + '"></option>'; }).join("");

    const corpo =
      '<p class="form-alert" hidden></p>' +
      '<div class="field"><label for="estNome">Nome do item</label><input type="text" id="estNome" maxlength="' + ESTOQUE_LIMITES.nome + '" placeholder="Ex.: Farinha de trigo" value="' + (editando ? escapeHtml(item.nome) : "") + '"></div>' +
      '<div class="field"><label for="estUnidade">Unidade de medida</label><select id="estUnidade">' + opcoesUnidade + "</select></div>" +
      '<div class="field"><label for="estCat">Categoria (opcional)</label><input type="text" id="estCat" list="estCatLista" maxlength="' + ESTOQUE_LIMITES.categoria + '" placeholder="Ex.: Insumos, Bebidas" value="' + (editando && item.categoria ? escapeHtml(item.categoria) : "") + '"><datalist id="estCatLista">' + listaCategorias + "</datalist></div>" +
      (editando
        ? '<p style="font-size:.8125rem;color:var(--text-secondary);margin-bottom:16px;">Quantidade atual: <strong>' + escapeHtml(quantidadeComUnidade(item)) + "</strong>. Para mudar, use <strong>Entrada</strong> ou <strong>Saída</strong>, assim fica registrado no histórico.</p>"
        : '<div class="field"><label for="estQtd">Quantidade atual</label><input type="number" id="estQtd" min="0" step="1" inputmode="numeric" placeholder="0"></div>') +
      '<div class="field"><label for="estMin">Quantidade mínima (alerta)</label><input type="number" id="estMin" min="0" step="1" inputmode="numeric" placeholder="0" value="' + (editando ? item.quantidadeMinima : "") + '"></div>';

    const raiz = openModal(editando ? "Editar " + item.nome : "Adicionar item",
      corpo,
      '<button type="button" class="btn btn-outline btn-block" data-modal-close>Cancelar</button>' +
      '<button type="button" class="btn btn-primary btn-block" id="estSalvar">' + (editando ? "Salvar" : "Adicionar") + "</button>");
    qs("#estNome").focus();

    async function salvar() {
      limparErros(raiz);
      const nomeEl = qs("#estNome"), qtdEl = qs("#estQtd"), minEl = qs("#estMin");
      const dados = {
        nome: limparTexto(nomeEl.value),
        unidadeMedida: qs("#estUnidade").value,
        categoria: limparTexto(qs("#estCat").value),
        quantidadeMinima: lerInteiro(minEl),
      };
      if (!editando) dados.quantidadeAtual = lerInteiro(qtdEl);

      // aviso rapido no navegador; o servidor valida tudo de novo
      const erros = {};
      const erroNome = validarNomeCampo(dados.nome, "o nome do item");
      if (erroNome) erros.estNome = erroNome;
      if (dados.categoria.length === 1) erros.estCat = "A categoria está muito curta.";
      if (/[<>]/.test(dados.categoria)) erros.estCat = "A categoria tem caracteres que não são permitidos.";
      const erroMin = validarInteiroCampo(dados.quantidadeMinima, "a quantidade mínima", { minimo: 0 });
      if (erroMin) erros.estMin = erroMin;
      if (!editando) {
        const erroQtd = validarInteiroCampo(dados.quantidadeAtual, "a quantidade", { minimo: 0 });
        if (erroQtd) erros.estQtd = erroQtd;
      }
      if (Object.keys(erros).length) { mostrarErrosCampos(erros); focarPrimeiroErro(raiz); return; }

      const botao = qs("#estSalvar");
      botaoCarregando(botao, true, "Salvando...");
      try {
        if (editando) await editarItemEstoque(item.id, dados);
        else await criarItemEstoque(dados);
        closeModal();
        showToast(editando ? "Item atualizado." : "Item adicionado ao estoque.");
        carregar();
      } catch (e) {
        botaoCarregando(botao, false);
        falhou(e, raiz, { nome: "estNome", unidadeMedida: "estUnidade", categoria: "estCat", quantidadeAtual: "estQtd", quantidadeMinima: "estMin" });
      }
    }

    qs("#estSalvar").addEventListener("click", salvar);
    qsa("input", raiz).forEach(function (el) {
      el.addEventListener("keydown", function (ev) { if (ev.key === "Enter") salvar(); });
    });
  }

  /* --- entrada e saida (RF24, RF27) --- */
  function abrirMovimentacao(item, tipo) {
    const saida = tipo === "saida";
    const corpo =
      '<p class="form-alert" hidden></p>' +
      '<p style="font-size:.875rem;margin-bottom:16px;">Quantidade atual: <strong>' + escapeHtml(quantidadeComUnidade(item)) + "</strong></p>" +
      '<div class="field"><label for="estMovQtd">Quantidade ' + (saida ? "que saiu" : "que entrou") + " (" + escapeHtml(unidadeCurta(item.unidadeMedida)) + ")</label>" +
      '<input type="number" id="estMovQtd" min="1" step="1" inputmode="numeric" placeholder="0"></div>' +
      '<div class="field"><label for="estMovMotivo">Motivo' + (saida ? "" : " (opcional)") + "</label>" +
      '<input type="text" id="estMovMotivo" maxlength="' + ESTOQUE_LIMITES.motivo + '" placeholder="' + (saida ? "Ex.: perda, descarte, ajuste" : "Ex.: compra do fornecedor") + '"></div>' +
      '<p style="font-size:.75rem;color:var(--text-secondary);">A data e o seu nome são registrados automaticamente.</p>';

    const raiz = openModal((saida ? "Saída de " : "Entrada de ") + item.nome,
      corpo,
      '<button type="button" class="btn btn-outline btn-block" data-modal-close>Cancelar</button>' +
      '<button type="button" class="btn btn-primary btn-block" id="estMovSalvar">Registrar ' + (saida ? "saída" : "entrada") + "</button>");
    qs("#estMovQtd").focus();

    async function registrar() {
      limparErros(raiz);
      const qtdEl = qs("#estMovQtd");
      const quantidade = lerInteiro(qtdEl);
      const motivo = limparTexto(qs("#estMovMotivo").value);

      const erros = {};
      const erroQtd = validarInteiroCampo(quantidade, "a quantidade", { minimo: 1, obrigatorio: true });
      if (erroQtd) erros.estMovQtd = erroQtd;
      else if (saida && quantidade > item.quantidadeAtual) erros.estMovQtd = "Só há " + quantidadeComUnidade(item) + " em estoque.";
      if (saida && !motivo) erros.estMovMotivo = "Informe o motivo da saída (perda, descarte ou ajuste).";
      if (/[<>]/.test(motivo)) erros.estMovMotivo = "O motivo tem caracteres que não são permitidos.";
      if (Object.keys(erros).length) { mostrarErrosCampos(erros); focarPrimeiroErro(raiz); return; }

      const botao = qs("#estMovSalvar");
      botaoCarregando(botao, true, "Registrando...");
      try {
        const resposta = await movimentarEstoque(item.id, { tipo: tipo, quantidade: quantidade, motivo: motivo });
        closeModal();
        showToast((saida ? "Saída" : "Entrada") + " registrada. Agora: " + quantidadeComUnidade(resposta.item) + ".");
        carregar();
      } catch (e) {
        botaoCarregando(botao, false);
        falhou(e, raiz, { quantidade: "estMovQtd", motivo: "estMovMotivo" });
      }
    }

    qs("#estMovSalvar").addEventListener("click", registrar);
    qsa("input", raiz).forEach(function (el) {
      el.addEventListener("keydown", function (ev) { if (ev.key === "Enter") registrar(); });
    });
  }

  /* --- historico (RF29) --- */
  async function abrirHistorico(item) {
    const raiz = openModal("Histórico de " + item.nome,
      '<p class="form-alert" hidden></p><div id="estHist"><p style="color:var(--text-secondary);">Carregando...</p></div>',
      '<button type="button" class="btn btn-outline btn-block" data-modal-close>Fechar</button>');
    // a tabela tem 5 colunas: so este modal fica mais largo (no celular continua ocupando a tela toda)
    const folha = qs(".modal-sheet", raiz);
    if (folha) folha.style.maxWidth = "720px";
    try {
      const movs = await historicoEstoque(item.id);
      const destino = qs("#estHist");
      if (!destino) return; // modal fechado enquanto carregava
      if (!movs.length) {
        destino.innerHTML = '<p style="color:var(--text-secondary);">Nenhuma entrada ou saída registrada ainda.</p>';
        return;
      }
      destino.innerHTML =
        '<div class="table-wrap" style="max-height:55vh;overflow-y:auto;"><table class="table"><thead><tr><th>Data</th><th>Tipo</th><th>Qtd.</th><th>Motivo</th><th>Responsável</th></tr></thead><tbody>' +
        movs.map(function (m) {
          const entrada = m.tipo === "ENTRADA";
          return "<tr><td style=\"white-space:nowrap;\">" + escapeHtml(dataHoraPt(m.dataMovimentacao)) + "</td>" +
            "<td>" + badgeHtml(entrada ? "Entrada" : "Saída", entrada ? "badge-success" : "badge-danger") + "</td>" +
            '<td style="font-weight:700;color:' + (entrada ? "var(--success)" : "var(--danger)") + ';">' + (entrada ? "+" : "−") + m.quantidade.toLocaleString("pt-BR") + "</td>" +
            "<td>" + (m.motivo ? escapeHtml(m.motivo) : '<span style="color:var(--text-secondary);">—</span>') + "</td>" +
            "<td>" + escapeHtml(m.responsavel) + "</td></tr>";
        }).join("") +
        "</tbody></table></div>";
    } catch (e) {
      const destino = qs("#estHist");
      if (destino) destino.innerHTML = "";
      falhou(e, raiz);
    }
  }

  /* --- exclusao (RF23, so Gerente) --- */
  function abrirExclusao(item) {
    const raiz = openModal("Excluir " + item.nome + "?",
      '<p class="form-alert" hidden></p>' +
      '<p style="font-size:.875rem;">O item e todo o histórico de entradas e saídas dele serão apagados. Isso não pode ser desfeito.</p>',
      '<button type="button" class="btn btn-outline btn-block" data-modal-close>Cancelar</button>' +
      '<button type="button" class="btn btn-danger-ghost btn-block" id="estExcluirOk">Excluir</button>');

    qs("#estExcluirOk").addEventListener("click", async function () {
      const botao = qs("#estExcluirOk");
      botaoCarregando(botao, true, "Excluindo...");
      try {
        await excluirItemEstoque(item.id);
        closeModal();
        showToast("Item excluído.");
        carregar();
      } catch (e) {
        botaoCarregando(botao, false);
        falhou(e, raiz);
      }
    });
  }

  /* --- eventos --- */
  qs("#estNovoBtn").addEventListener("click", function () { abrirFormularioItem(null); });

  // um unico ouvinte para os botoes de todas as linhas
  tbody.addEventListener("click", function (ev) {
    const botao = ev.target.closest("[data-acao]");
    if (!botao || botao.disabled) return;
    const item = acharItem(botao.getAttribute("data-id"));
    if (!item) return;
    const acao = botao.getAttribute("data-acao");
    if (acao === "entrada" || acao === "saida") abrirMovimentacao(item, acao);
    else if (acao === "historico") abrirHistorico(item);
    else if (acao === "editar") abrirFormularioItem(item);
    else if (acao === "excluir" && podeExcluir) abrirExclusao(item);
  });

  buscaEl.addEventListener("input", function () {
    clearTimeout(timerBusca);
    timerBusca = setTimeout(carregar, 300); // espera a pessoa parar de digitar
  });
  categoriaEl.addEventListener("change", carregar);
  statusEl.addEventListener("change", carregar);

  carregar();
}

// rotas /gerente/estoque e /funcionario/estoque (main.js): a diferenca e so o menu lateral
const ScreenGerenteEstoque = {
  render: function () { return estoqueTelaHtml("GERENTE"); },
  bind: estoqueTelaBind,
};

const ScreenFuncionarioEstoque = {
  render: function () { return estoqueTelaHtml("FUNCIONARIO"); },
  bind: estoqueTelaBind,
};
