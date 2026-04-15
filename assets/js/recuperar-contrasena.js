/* ============================================================
   assets/js/recuperar-contrasena.js
   Maneja el flujo completo de recuperación de contraseña
   - Bifurcación cliente vs empleado/admin
   - Validación de códigos/respuestas
   - Cambio de contraseña con requisitos
   ============================================================ */

(function () {

  const API_ENDPOINT = '../backend/api/recuperar-contrasena.php';
  const MODAL_HTML = '../components/modals/recuperar-contrasena-modal.html';
  const MODAL_CSS = '../components/modals/recuperar-contrasena-modal.css';

  let modalInjected = false;
  let estadoRecuperacion = {
    tipoUsuario: null,
    email: null,
    codigoReal: null,
    idUsuario: null,
    tokenCorporativo: null,
    pregunta: null
  };

  // ── Inyectar CSS ─────────────────────────────────────────────
  function inyectarCSS() {
    const id = 'rcp-modal-css';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = MODAL_CSS;
      link.id = id;
      document.head.appendChild(link);
    }
  }

  // ── Inyectar HTML modal ──────────────────────────────────────
  function inyectarModal() {
    return new Promise((resolve, reject) => {
      if (document.getElementById('recuperarOverlay')) {
        resolve();
        return;
      }

      fetch(MODAL_HTML)
        .then(r => r.text())
        .then(html => {
          const div = document.createElement('div');
          div.innerHTML = html;
          document.body.appendChild(div.firstElementChild);
          inicializarEventos();
          resolve();
        })
        .catch(reject);
    });
  }

  // ── Abrir modal ──────────────────────────────────────────────
  function abrirModal() {
    const overlay = document.getElementById('recuperarOverlay');
    if (overlay) {
      overlay.hidden = false;
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      mostrarPaso(1);
      limpiarFormularios();
    }
  }

  // ── Cerrar modal ─────────────────────────────────────────────
  function cerrarModal() {
    const overlay = document.getElementById('recuperarOverlay');
    if (overlay) {
      overlay.hidden = true;
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      limpiarFormularios();
      limpiarErrores();
      estadoRecuperacion = { 
        tipoUsuario: null, 
        email: null, 
        codigoReal: null,
        idUsuario: null,
        tokenCorporativo: null,
        pregunta: null
      };
    }
  }

  // ── Mostrar paso específico del flujo ────────────────────────
  function mostrarPaso(paso) {
    document.querySelectorAll('.rcp-step').forEach(el => el.hidden = true);

    switch (paso) {
      case 1:
        document.getElementById('rcpStep1').hidden = false;
        document.getElementById('rcp-email')?.focus();
        break;
      case 2:
        if (estadoRecuperacion.tipoUsuario === 'cliente') {
          document.getElementById('rcpStep2Cliente').hidden = false;
          document.getElementById('rcpEmailDisplay').textContent = estadoRecuperacion.email;
          document.getElementById('rcp-codigo')?.focus();
          // Auto-llenar código después de 500ms de espera
          setTimeout(autoLlenarCodigoCliente, 500);
        } else {
          document.getElementById('rcpStep2Admin').hidden = false;
          document.getElementById('rcp-pregunta-display').textContent = estadoRecuperacion.pregunta || 'Cargando pregunta...';
          document.getElementById('rcp-respuesta')?.focus();
          // Auto-llenar respuesta y token después de 500ms
          setTimeout(() => {
            autoLlenarCodigoAdmin();
            autoLlenarTokenCorporativo();
          }, 500);
        }
        break;
      case 3:
        document.getElementById('rcpStep3').hidden = false;
        document.getElementById('rcp-nueva-pass')?.focus();
        initToggleContrasenas();
        break;
      case 4:
        document.getElementById('rcpStep4').hidden = false;
        break;
    }
  }

  // ── Auto-llenar código para clientes ─────────────────────────
  function autoLlenarCodigoCliente() {
    const input = document.getElementById('rcp-codigo');
    if (input && estadoRecuperacion.codigoReal) {
      input.value = estadoRecuperacion.codigoReal;
      mostrarNotificacion('Código completado automáticamente', 'info');
    }
  }

  // ── Auto-llenar código para admin/empleado ───────────────────
  function autoLlenarCodigoAdmin() {
    const input = document.getElementById('rcp-respuesta');
    if (input && estadoRecuperacion.codigoReal) {
      input.value = estadoRecuperacion.codigoReal;
      console.log('DEBUG: Auto-completado respuesta:', estadoRecuperacion.codigoReal);
      mostrarNotificacion('Respuesta completada automáticamente', 'info');
    } else {
      console.log('DEBUG: No se pudo completar respuesta. input:', !!input, 'codigoReal:', estadoRecuperacion.codigoReal);
    }
  }

  // ── Auto-llenar token corporativo ─────────────────────────────
  function autoLlenarTokenCorporativo() {
    const input = document.getElementById('rcp-token-corporativo');
    if (input && estadoRecuperacion.tokenCorporativo) {
      input.value = estadoRecuperacion.tokenCorporativo;
      console.log('DEBUG: Auto-completado token corporativo:', estadoRecuperacion.tokenCorporativo);
      mostrarNotificacion('Token corporativo completado automáticamente', 'info');
    } else {
      console.log('DEBUG: No se pudo completar token. input:', !!input, 'tokenCorporativo:', estadoRecuperacion.tokenCorporativo);
    }
  }

  // ── Mostrar notificación ─────────────────────────────────────
  function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear elemento de notificación simple
    const notif = document.createElement('div');
    notif.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${tipo === 'info' ? '#3498db' : '#27ae60'};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 6px;
      font-size: 0.9rem;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    notif.textContent = mensaje;
    document.body.appendChild(notif);

    setTimeout(() => {
      notif.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notif.remove(), 300);
    }, 3000);
  }

  // ── Limpiar formularios ──────────────────────────────────────
  function limpiarFormularios() {
    document.getElementById('rcp-email').value = '';
    document.getElementById('rcp-codigo').value = '';
    document.getElementById('rcp-respuesta').value = '';
    document.getElementById('rcp-token-corporativo').value = '';
    document.getElementById('rcp-nueva-pass').value = '';
    document.getElementById('rcp-confirmar-pass').value = '';
  }

  // ── Limpiar errores ─────────────────────────────────────────
  function limpiarErrores() {
    ['rcpError1', 'rcpError2Cliente', 'rcpError2Admin', 'rcpError3'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.hidden = true;
        el.textContent = '';
      }
    });
  }

  // ── Mostrar error ────────────────────────────────────────────
  function mostrarError(paso, mensaje) {
    const errorMap = {
      1: 'rcpError1',
      '2-cliente': 'rcpError2Cliente',
      '2-admin': 'rcpError2Admin',
      3: 'rcpError3'
    };

    const elId = errorMap[paso];
    if (elId) {
      const el = document.getElementById(elId);
      if (el) {
        el.textContent = mensaje;
        el.hidden = false;
      }
    }
  }

  // ── Establecer estado cargando ───────────────────────────────
  function setCargando(btnId, estado) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    const texto = btn.querySelector('.rcp-btn-text');
    const spinner = btn.querySelector('.rcp-spinner');

    btn.disabled = estado;
    if (texto) texto.style.display = estado ? 'none' : '';
    if (spinner) spinner.hidden = !estado;
  }

  // ── PASO 1: Submit solicitud de código ──────────────────────
  function onSubmitPaso1(e) {
    e.preventDefault();
    limpiarErrores();

    const email = document.getElementById('rcp-email').value.trim();

    if (!email) {
      mostrarError(1, 'Por favor ingresa un correo válido.');
      return;
    }

    setCargando('rcpBtnStep1', true);

    const body = new URLSearchParams({
      accion: 'solicitar_codigo',
      email: email
    });

    fetch(API_ENDPOINT, { method: 'POST', body, credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        console.log('Respuesta Paso 1:', data);
        if (!data.ok) {
          mostrarError(1, data.mensaje || 'Error al solicitar código');
          setCargando('rcpBtnStep1', false);
          return;
        }

        // Guardar datos
        estadoRecuperacion.tipoUsuario = data.tipo_usuario;
        estadoRecuperacion.email = email;
        estadoRecuperacion.codigoReal = data.codigo_ficticio;

        console.log('DEBUG: Paso 1 completado. Estado:', estadoRecuperacion);

        // Si es cliente, mostrar que el código fue "enviado"
        if (data.tipo_usuario === 'cliente') {
          mostrarNotificacion(
            `Código enviado a ${email}:\n${data.codigo_ficticio}`,
            'info'
          );
        } else {
          // Si es admin/empleado, guardar token corporativo y pregunta
          estadoRecuperacion.tokenCorporativo = data.token_corporativo_ficticio;
          estadoRecuperacion.pregunta = data.pregunta;
          console.log('DEBUG Admin: Token corporativo:', data.token_corporativo_ficticio, 'Pregunta:', data.pregunta);
          mostrarNotificacion(
            `Tu Token Corporativo es: ${data.token_corporativo_ficticio}\nRespuesta de seguridad: ${data.codigo_ficticio}`,
            'info'
          );
        }

        // Pasar al paso 2
        setTimeout(() => {
          mostrarPaso(2);
          setCargando('rcpBtnStep1', false);
        }, 300);
      })
      .catch(err => {
        mostrarError(1, 'Error de conexión. Intenta nuevamente.');
        setCargando('rcpBtnStep1', false);
      });
  }

  // ── PASO 2A: Submit validación código (cliente) ──────────────
  function onSubmitPaso2Cliente(e) {
    e.preventDefault();
    limpiarErrores();

    const codigo = document.getElementById('rcp-codigo').value.trim();

    if (!codigo || codigo.length !== 6) {
      mostrarError('2-cliente', 'El código debe tener 6 dígitos.');
      return;
    }

    setCargando('rcpBtnStep2Cliente', true);

    const body = new URLSearchParams({
      accion: 'validar_codigo',
      codigo: codigo
    });

    fetch(API_ENDPOINT, { method: 'POST', body, credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (!data.ok) {
          mostrarError('2-cliente', data.mensaje || 'Código inválido');
          setCargando('rcpBtnStep2Cliente', false);
          return;
        }

        // Código válido, pasar a cambio de contraseña
        setTimeout(() => {
          mostrarPaso(3);
          setCargando('rcpBtnStep2Cliente', false);
        }, 300);
      })
      .catch(() => {
        mostrarError('2-cliente', 'Error de conexión.');
        setCargando('rcpBtnStep2Cliente', false);
      });
  }

  // ── PASO 2B: Submit validación (admin/empleado) ──────────────
  function onSubmitPaso2Admin(e) {
    e.preventDefault();
    limpiarErrores();

    const respuesta = document.getElementById('rcp-respuesta').value.trim();
    const token = document.getElementById('rcp-token-corporativo').value.trim();

    console.log('DEBUG: Paso 2 Admin - Respuesta:', respuesta, 'Token:', token);

    if (!respuesta) {
      mostrarError('2-admin', 'Por favor ingresa tu respuesta a la pregunta de seguridad.');
      return;
    }

    if (!token) {
      mostrarError('2-admin', 'Por favor ingresa tu token corporativo.');
      return;
    }

    setCargando('rcpBtnStep2Admin', true);

    const body = new URLSearchParams({
      accion: 'validar_codigo',
      respuesta: respuesta,
      token: token
    });

    console.log('DEBUG: Enviando body:', [...body.entries()]);

    fetch(API_ENDPOINT, { method: 'POST', body, credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        console.log('DEBUG: Respuesta Paso 2 Admin:', data);
        if (!data.ok) {
          mostrarError('2-admin', data.mensaje || 'Verificación fallida. Por favor intenta de nuevo.');
          setCargando('rcpBtnStep2Admin', false);
          return;
        }

        // Válido, pasar a cambio de contraseña
        setTimeout(() => {
          mostrarPaso(3);
          setCargando('rcpBtnStep2Admin', false);
        }, 300);
      })
      .catch(() => {
        mostrarError('2-admin', 'Error de conexión.');
        setCargando('rcpBtnStep2Admin', false);
      });
  }

  // ── PASO 3: Submit nueva contraseña ──────────────────────────
  function onSubmitPaso3(e) {
    e.preventDefault();
    limpiarErrores();

    const nueva = document.getElementById('rcp-nueva-pass').value;
    const confirmar = document.getElementById('rcp-confirmar-pass').value;

    if (!nueva || !confirmar) {
      mostrarError(3, 'Las contraseñas son requeridas.');
      return;
    }

    if (nueva !== confirmar) {
      mostrarError(3, 'Las contraseñas no coinciden.');
      return;
    }

    const validacion = validarRequisitosContrasena(nueva);
    if (!validacion.valida) {
      mostrarError(3, validacion.mensaje);
      return;
    }

    setCargando('rcpBtnStep3', true);

    const body = new URLSearchParams({
      accion: 'cambiar_contrasena',
      nueva_contrasena: nueva,
      confirmar_contrasena: confirmar
    });

    fetch(API_ENDPOINT, { method: 'POST', body, credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        console.log('Respuesta Paso 3:', data);
        if (!data.ok) {
          mostrarError(3, data.mensaje || 'Error al cambiar contraseña');
          setCargando('rcpBtnStep3', false);
          return;
        }

        // Éxito
        setTimeout(() => {
          mostrarPaso(4);
          setCargando('rcpBtnStep3', false);
        }, 300);
      })
      .catch(() => {
        mostrarError(3, 'Error de conexión.');
        setCargando('rcpBtnStep3', false);
      });
  }

  // ── Validar requisitos de contraseña ────────────────────────
  function validarRequisitosContrasena(pass) {
    const requisitos = {
      minimo: pass.length >= 8,
      mayuscula: /[A-Z]/.test(pass),
      minuscula: /[a-z]/.test(pass),
      numero: /[0-9]/.test(pass),
      especial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)
    };

    const cumpleTodos = Object.values(requisitos).every(r => r);

    if (!cumpleTodos) {
      const faltantes = [];
      if (!requisitos.minimo) faltantes.push('8+ caracteres');
      if (!requisitos.mayuscula) faltantes.push('Mayúscula');
      if (!requisitos.minuscula) faltantes.push('Minúscula');
      if (!requisitos.numero) faltantes.push('Número');
      if (!requisitos.especial) faltantes.push('Símbolo especial');
      return { valida: false, mensaje: 'Requisitos: ' + faltantes.join(', ') };
    }

    return { valida: true };
  }

  // ── Mostrar requisitos en tiempo real ────────────────────────
  function mostrarRequisitosEnTiempoReal() {
    const input = document.getElementById('rcp-nueva-pass');
    const contenedor = document.getElementById('rcpRequisitos');

    if (!input || !contenedor) return;

    input.addEventListener('input', () => {
      const pass = input.value;

      const requisitos = [
        { label: '8+ caracteres', cumple: pass.length >= 8 },
        { label: 'Mayúscula', cumple: /[A-Z]/.test(pass) },
        { label: 'Minúscula', cumple: /[a-z]/.test(pass) },
        { label: 'Número', cumple: /[0-9]/.test(pass) },
        { label: 'Símbolo', cumple: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass) }
      ];

      contenedor.innerHTML = requisitos
        .map(
          r =>
            `<div class="rcp-requisito ${r.cumple ? 'cumple' : ''}">
          <span class="icono">${r.cumple ? '✓' : '○'}</span>
          ${r.label}
        </div>`
        )
        .join('');
    });
  }

  // ── Toggle contraseña ────────────────────────────────────────
  function initToggleContrasenas() {
    const toggles = [
      { btn: document.getElementById('rcpTogglePass1'), input: document.getElementById('rcp-nueva-pass') },
      { btn: document.getElementById('rcpTogglePass2'), input: document.getElementById('rcp-confirmar-pass') }
    ];

    toggles.forEach(({ btn, input }) => {
      if (!btn || !input) return;

      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const esPassword = input.type === 'password';
        input.type = esPassword ? 'text' : 'password';
        newBtn.setAttribute('aria-label', esPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
      });
    });

    mostrarRequisitosEnTiempoReal();
  }

  // ── Inicializar eventos ──────────────────────────────────────
  function inicializarEventos() {
    // Botón cerrar
    const btnCerrar = document.getElementById('rcpClose');
    if (btnCerrar) btnCerrar.addEventListener('click', cerrarModal);

    // Paso 1
    const form1 = document.getElementById('rcpFormStep1');
    if (form1) form1.addEventListener('submit', onSubmitPaso1);

    const backToLogin = document.getElementById('rcpBackToLogin');
    if (backToLogin) {
      backToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        cerrarModal();
        abrirLoginModal();
      });
    }

    // Paso 2 Cliente
    const form2Cliente = document.getElementById('rcpFormStep2Cliente');
    if (form2Cliente) form2Cliente.addEventListener('submit', onSubmitPaso2Cliente);

    const backStep2Cliente = document.getElementById('rcpBackStep2Cliente');
    if (backStep2Cliente) {
      backStep2Cliente.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarPaso(1);
        limpiarErrores();
      });
    }

    // Paso 2 Admin
    const form2Admin = document.getElementById('rcpFormStep2Admin');
    if (form2Admin) form2Admin.addEventListener('submit', onSubmitPaso2Admin);

    const backStep2Admin = document.getElementById('rcpBackStep2Admin');
    if (backStep2Admin) {
      backStep2Admin.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarPaso(1);
        limpiarErrores();
      });
    }

    // Paso 3
    const form3 = document.getElementById('rcpFormStep3');
    if (form3) form3.addEventListener('submit', onSubmitPaso3);

    const cancelStep3 = document.getElementById('rcpCancelStep3');
    if (cancelStep3) {
      cancelStep3.addEventListener('click', (e) => {
        e.preventDefault();
        cerrarModal();
        abrirLoginModal();
      });
    }

    // Paso 4 (éxito)
    const btnVolver = document.getElementById('rcpBtnVolver');
    if (btnVolver) {
      btnVolver.addEventListener('click', () => {
        cerrarModal();
        abrirLoginModal();
      });
    }

    // Cerrar al hacer clic en el overlay
    const overlay = document.getElementById('recuperarOverlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cerrarModal();
      });
    }
  }

  // ── Abrir modal de login (para volver) ───────────────────────
  function abrirLoginModal() {
    const overlay = document.getElementById('loginOverlay');
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  // ── API pública ──────────────────────────────────────────────
  window.RecuperarContrasena = {
    init: async function() {
      // 🔒 Validación: NO inyectar si es admin/empleado logueado
      const rol = sessionStorage.getItem('jm_rol');
      if (rol === 'admin' || rol === 'empleado') {
        console.log('🔒 Admin/empleado logueado. No inyectando modal de recuperación.');
        return;
      }
      
      inyectarCSS();
      await inyectarModal();
    },

    abrir: function() {
      abrirModal();
    },

    cerrar: function() {
      cerrarModal();
    }
  };

})();
