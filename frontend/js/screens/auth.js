"use strict";
/* =========================================================
   SCREENS/AUTH.JS — telas: login, escolher perfil, cadastro
   de cliente, cadastro de empresa, login do funcionario
   ========================================================= */
const ScreenLogin = {
  render: function () {
    return (
      '<div class="auth-page fade-in"><div class="auth-box"><div class="auth-card">' +
      '<div class="auth-head">' + logoHtml("lg") + "<h1>Bem-vindo de volta!</h1><p>Acesse sua conta e continue gerenciando tudo de forma simples.</p></div>" +
      '<div class="field"><label for="login-email">E-mail</label><input id="login-email" type="email" placeholder="voce@seunegocio.com" autocomplete="email"></div>' +
      '<div class="field"><label for="login-senha">Senha</label><div class="field-password"><input id="login-senha" type="password" placeholder="••••••••" autocomplete="current-password">' +
      '<button type="button" class="field-toggle" id="loginTogglePwd">Mostrar</button></div></div>' +
      '<button type="button" class="btn-link" data-toast="Funcionalidade disponível em breve." style="margin-bottom:16px;display:inline-block;">Esqueci minha senha</button>' +
      '<div class="demo-box"><p class="label">Perfil de demonstração</p><div class="demo-grid" id="demoGrid">' +
      ["cliente", "funcionario", "gerente"].map(function (p) {
        const label = p === "funcionario" ? "Funcionário" : p === "gerente" ? "Gerente" : "Cliente";
        return '<button type="button" class="demo-btn' + (p === state.loginDemoPerfil ? " active" : "") + '" data-demo="' + p + '">' + label + "</button>";
      }).join("") + "</div></div>" +
      '<button type="button" class="btn btn-primary btn-block" id="loginEntrarBtn" style="margin-bottom:16px;">Entrar</button>' +
      '<div class="auth-divider">ou continue com</div>' +
      '<div class="auth-social">' +
      '<button type="button" class="auth-social-btn" data-toast="Funcionalidade disponível em breve."><span class="auth-social-avatar">G</span>Google</button>' +
      '<button type="button" class="auth-social-btn" data-toast="Funcionalidade disponível em breve."><span class="auth-social-avatar">W</span>WhatsApp</button>' +
      "</div>" +
      '<p class="auth-foot">Ainda não tem uma conta? <button type="button" class="btn-link" data-href="/cadastro">Criar conta</button></p>' +
      "</div></div></div>"
    );
  },
  bind: function () {
    const toggle = qs("#loginTogglePwd");
    const input = qs("#login-senha");
    if (toggle && input) {
      toggle.addEventListener("click", function () {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        toggle.textContent = show ? "Ocultar" : "Mostrar";
      });
    }
    qsa("#demoGrid .demo-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.loginDemoPerfil = btn.getAttribute("data-demo");
        qsa("#demoGrid .demo-btn").forEach(function (b) { b.classList.toggle("active", b === btn); });
      });
    });
    const entrarBtn = qs("#loginEntrarBtn");
    if (entrarBtn) {
      entrarBtn.addEventListener("click", function () {
        // TODO(backend): autenticar usuário e criar sessão
        navigate("/" + state.loginDemoPerfil);
      });
    }
  }
};

const ESCOLHER_PERFIL_CARDS = [
  { icon: "user", titulo: "Sou cliente", desc: "Quero fazer pedidos, acompanhar meus gastos e ver meu histórico.", href: "/cadastro/cliente" },
  { icon: "badge", titulo: "Sou funcionário", desc: "Quero acessar os pedidos e ferramentas do estabelecimento onde trabalho.", href: "/login/funcionario" },
  { icon: "store", titulo: "Tenho um negócio", desc: "Quero gerenciar pedidos, clientes, estoque, fiado e muito mais.", href: "/cadastro/empresa" },
];
const ScreenEscolherPerfil = {
  render: function () {
    return (
      '<div class="auth-page fade-in"><div class="profile-picker">' +
      '<div class="profile-picker-head">' + logoHtml("lg") + "<h1>Qual é o seu perfil?</h1><p>Escolha como deseja usar o Conecta+</p></div>" +
      '<div class="profile-grid">' + ESCOLHER_PERFIL_CARDS.map(function (c) {
        return '<div class="profile-card" data-href="' + c.href + '" role="link" tabindex="0">' +
          '<span class="profile-card-icon">' + icon(c.icon, "icon-lg") + "</span>" +
          "<h3>" + c.titulo + "</h3><p>" + c.desc + "</p>" +
          '<span class="btn btn-primary">Continuar</span></div>';
      }).join("") + "</div>" +
      '<p class="auth-foot">Já tem conta? <button type="button" class="btn-link" data-href="/login">Entrar</button></p>' +
      "</div></div>"
    );
  }
};

const ScreenCadastroCliente = {
  render: function () {
    return (
      '<div class="auth-page fade-in"><div class="auth-box"><div class="auth-card">' +
      '<div class="auth-head">' + logoHtml("lg") + "<h1>Crie sua conta</h1><p>É rápido e gratuito</p></div>" +
      '<div class="field"><label for="cc-nome">Nome completo</label><input id="cc-nome" type="text" placeholder="Seu nome completo" autocomplete="name"></div>' +
      '<div class="field"><label for="cc-tel">Telefone</label><input id="cc-tel" type="tel" placeholder="(00) 00000-0000" autocomplete="tel"></div>' +
      '<div class="field"><label for="cc-email">E-mail</label><input id="cc-email" type="email" placeholder="voce@email.com" autocomplete="email"></div>' +
      '<div class="field"><label for="cc-senha">Senha</label><input id="cc-senha" type="password" placeholder="Mínimo 8 caracteres" autocomplete="new-password"></div>' +
      '<div class="field"><label for="cc-conf">Confirmar senha</label><input id="cc-conf" type="password" placeholder="Repita a senha" autocomplete="new-password"></div>' +
      '<label class="checkbox-row" style="margin-bottom:20px;"><input type="checkbox" id="cc-aceito"><span style="font-size:.8125rem;color:var(--text-secondary);">Li e aceito os <span style="color:var(--blue-primary);">termos de uso</span></span></label>' +
      '<button type="button" class="btn btn-primary btn-block" id="cadastroClienteBtn" disabled style="margin-bottom:16px;">Criar minha conta</button>' +
      '<p class="auth-foot">Já possui uma conta? <button type="button" class="btn-link" data-href="/login">Entrar</button></p>' +
      "</div></div></div>"
    );
  },
  bind: function () {
    const checkbox = qs("#cc-aceito");
    const btn = qs("#cadastroClienteBtn");
    if (checkbox && btn) {
      checkbox.addEventListener("change", function () { btn.disabled = !checkbox.checked; });
      btn.addEventListener("click", function () {
        if (checkbox.checked) {
          // TODO(backend): validar dados e criar conta de cliente
          navigate("/cliente");
        }
      });
    }
  }
};

const ScreenLoginFuncionario = {
  render: function () {
    return (
      '<div class="auth-page fade-in"><div class="auth-box"><div class="auth-card">' +
      '<div class="auth-head">' + logoHtml("lg") + "<h1>Acesso do funcionário</h1><p>Entre com os dados fornecidos pelo estabelecimento.</p></div>" +
      '<div class="field"><label for="lf-email">E-mail</label><input id="lf-email" type="email" placeholder="funcionario@empresa.com" autocomplete="email"></div>' +
      '<div class="field"><label for="lf-senha">Senha</label><div class="field-password"><input id="lf-senha" type="password" placeholder="••••••••" autocomplete="current-password">' +
      '<button type="button" class="field-toggle" id="lfTogglePwd">Mostrar</button></div></div>' +
      '<button type="button" class="btn btn-primary btn-block" id="lfEntrarBtn" style="margin:20px 0 12px;">Entrar</button>' +
      '<button type="button" class="btn btn-outline btn-block" data-href="/cadastro" style="margin-bottom:16px;">' + icon("chevronLeft") + "Voltar</button>" +
      '<p class="auth-foot">Sua conta é criada pelo gerente do estabelecimento.</p>' +
      "</div></div></div>"
    );
  },
  bind: function () {
    const toggle = qs("#lfTogglePwd");
    const input = qs("#lf-senha");
    if (toggle && input) {
      toggle.addEventListener("click", function () {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        toggle.textContent = show ? "Ocultar" : "Mostrar";
      });
    }
    const btn = qs("#lfEntrarBtn");
    if (btn) btn.addEventListener("click", function () {
      // TODO(backend): autenticar funcionário e criar sessão
      navigate("/funcionario");
    });
  }
};

const CADASTRO_EMPRESA_TIPOS = ["Restaurante", "Lanchonete", "Mercadinho", "Loja", "Salão / Barbearia", "Prestador de serviço", "Outro"];
const ScreenCadastroEmpresa = {
  render: function () {
    return (
      '<div class="auth-page fade-in"><div class="auth-box"><div class="auth-card">' +
      '<div class="auth-head">' + logoHtml("lg") + "<h1>Cadastre seu negócio</h1><p>Comece a organizar seu negócio com o Conecta+.</p></div>" +
      '<div class="field"><label for="ce-resp">Nome do responsável</label><input id="ce-resp" type="text" placeholder="Seu nome completo"></div>' +
      '<div class="field"><label for="ce-nome">Nome do estabelecimento</label><input id="ce-nome" type="text" placeholder="Ex: Restaurante Sabor Caseiro"></div>' +
      '<div class="field"><label for="ce-tel">Telefone</label><input id="ce-tel" type="tel" placeholder="(00) 00000-0000"></div>' +
      '<div class="field"><label for="ce-email">E-mail</label><input id="ce-email" type="email" placeholder="contato@seunegocio.com"></div>' +
      '<div class="field"><label for="ce-senha">Senha</label><input id="ce-senha" type="password" placeholder="Mínimo 8 caracteres"></div>' +
      '<div class="field"><label for="ce-conf">Confirmar senha</label><input id="ce-conf" type="password" placeholder="Repita a senha"></div>' +
      '<div class="field"><label for="ce-tipo">Tipo de negócio</label><select id="ce-tipo"><option value="">Selecione...</option>' +
      CADASTRO_EMPRESA_TIPOS.map(function (t) { return "<option>" + t + "</option>"; }).join("") + "</select></div>" +
      '<button type="button" class="btn btn-primary btn-block" id="cadastroEmpresaBtn" style="margin:20px 0 16px;">Criar meu negócio</button>' +
      '<p class="auth-foot">Já tem conta? <button type="button" class="btn-link" data-href="/login">Entrar</button></p>' +
      "</div></div></div>"
    );
  },
  bind: function () {
    const btn = qs("#cadastroEmpresaBtn");
    if (btn) btn.addEventListener("click", function () {
      // TODO(backend): validar dados e criar conta de empresa/gerente
      navigate("/gerente");
    });
  }
};

