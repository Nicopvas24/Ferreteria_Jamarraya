/* ============================================================
   js/login.js
   Maneja el modal de login y redirección por rol.
   Se carga en components.js junto con login-modal.html
   ============================================================ */
 
(function () {
 
  /* ── Rutas según rol ────────────────────────────────────────
     Ajusta si tu estructura de carpetas cambia
  ─────────────────────────────────────────────────────────── */
  const RUTAS_ROL = {
    admin:    './dashboard-admin.html',
    empleado: './dashboard-empleado.html',
    cliente:  './index.html',   // index del catálogo
  };
 
  const API_LOGIN  = '../backend/usuarios.php';
  const MODAL_HTML = '../components/modals/login-modal.html';
  const MODAL_REGISTRO_HTML = '../components/registro-modal.html';
  const MODAL_CSS  = '../components/modals/login-modal.css';
  
 
  /* ── Inyectar CSS una sola vez ────────────────────────────── */
  function inyectarCSS() {
    const id = 'login-modal-css';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = MODAL_CSS; link.id = id;
      document.head.appendChild(link);
    }
  }
 
  /* ── Inyectar HTML del modal en el body ──────────────────── */
  function inyectarModal() {
    return new Promise((resolve, reject) => {
      // Verificar si los modales ya existen
      if (document.getElementById('loginOverlay') && document.getElementById('registroOverlay')) { 
        resolve(); 
        return; 
      }

      let pendientes = 0;
      
      // Inyectar login modal
      if (!document.getElementById('loginOverlay')) {
        pendientes++;
        fetch(MODAL_HTML)
          .then(r => r.text())
          .then(html => {
            const div = document.createElement('div');
            div.innerHTML = html;
            document.body.appendChild(div.firstElementChild);
            pendientes--;
            if (pendientes === 0) resolve();
          })
          .catch(reject);
      }
      
      // Inyectar registro modal
      if (!document.getElementById('registroOverlay')) {
        pendientes++;
        fetch(MODAL_REGISTRO_HTML)
          .then(r => r.text())
          .then(html => {
            const div = document.createElement('div');
            div.innerHTML = html;
            document.body.appendChild(div.firstElementChild);
            pendientes--;
            if (pendientes === 0) resolve();
          })
          .catch(reject);
      }

      // Si no hay nada pendiente, resolver inmediatamente
      if (pendientes === 0) resolve();
    });
  }
 
  /* ── Abrir modal ─────────────────────────────────────────── */
  function abrirModal() {
    // Buscar cual modal existe y abrirlo
    const overlay = document.getElementById('loginOverlay');
    const modal = document.getElementById('modalLogin');
    
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      document.getElementById('lm-email')?.focus();
    } else if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }
 
  /* ── Cerrar modal ────────────────────────────────────────── */
  function cerrarModal() {
    const overlay = document.getElementById('loginOverlay');
    const modal = document.getElementById('modalLogin');
    
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      limpiarError();
    } else if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }
 
  /* ── Mostrar / ocultar error ─────────────────────────────── */
  function mostrarError(msg) {
    const el = document.getElementById('loginError');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }
  function limpiarError() {
    const el = document.getElementById('loginError');
    if (el) { el.textContent = ''; el.hidden = true; }
  }
 
  /* ── Estado del botón submit ─────────────────────────────── */
  function setCargando(estado) {
    const btn     = document.getElementById('loginSubmit');
    const texto   = btn?.querySelector('.lm-btn-text');
    const spinner = btn?.querySelector('.lm-spinner');
    if (!btn) return;
    btn.disabled = estado;
    if (texto)   texto.style.display  = estado ? 'none'         : '';
    if (spinner) spinner.hidden        = !estado;
  }
 
  /* ── Submit del formulario ───────────────────────────────── */
  function onSubmit(e) {
    e.preventDefault();
    limpiarError();
 
    const email      = document.getElementById('lm-email').value.trim();
    const contrasena = document.getElementById('lm-pass').value;
 
    if (!email || !contrasena) {
      mostrarError('Completa todos los campos.');
      return;
    }
 
    setCargando(true);
 
    const body = new URLSearchParams({ accion: 'login', email, contrasena });
 
    fetch(API_LOGIN, { method: 'POST', body })
      .then(r => r.json())
      .then(data => {
        if (!data.ok) {
          mostrarError(data.mensaje || 'Credenciales incorrectas.');
          setCargando(false);
          return;
        }
 
        // ── Guardar datos básicos en sessionStorage para los dashboards ──
        sessionStorage.setItem('jm_nombre', data.nombre);
        sessionStorage.setItem('jm_rol',    data.rol);
        
        console.log('✓ Login exitoso:', data.nombre, data.rol);

        // ── Actualizar navbar y cerrar modal ──
        cerrarModal();
        actualizarNavbarSesion();
        
        // ── Redirigir según rol después de un delay ──
        const ruta = RUTAS_ROL[data.rol] ?? RUTAS_ROL.cliente;
        console.log('→ Redirigiendo a:', ruta);
        
        setTimeout(() => {
          window.location.href = ruta;
        }, 500);
      })
      .catch(() => {
        mostrarError('Error de conexión. Intenta de nuevo.');
        setCargando(false);
      });
  }
 
  /* ── Toggle contraseña visible ───────────────────────────── */
  function initTogglePass() {
    const btn   = document.getElementById('togglePass');
    const input = document.getElementById('lm-pass');
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      btn.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
    });
  }

  /* ── Toggle contraseña registro ──────────────────────────── */
  function initTogglePassRegistro() {
    const toggles = [
      { btn: document.getElementById('togglePassReg'), input: document.getElementById('reg-pass') },
      { btn: document.getElementById('togglePassReg2'), input: document.getElementById('reg-confirmar') }
    ];

    toggles.forEach(({ btn, input }) => {
      if (!btn || !input) return;
      btn.addEventListener('click', () => {
        const visible = input.type === 'text';
        input.type = visible ? 'password' : 'text';
        btn.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
      });
    });
  }

  /* ── Mostrar/ocultar error registro ───────────────────────── */
  function mostrarErrorRegistro(msg) {
    const el = document.getElementById('registroError');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }
  function limpiarErrorRegistro() {
    const el = document.getElementById('registroError');
    if (el) { el.textContent = ''; el.hidden = true; }
  }

  /* ── Estado del botón submit registro ────────────────────── */
  function setCargandoRegistro(estado) {
    const btn     = document.getElementById('registroSubmit');
    const texto   = btn?.querySelector('.lm-btn-text');
    const spinner = btn?.querySelector('.lm-spinner');
    if (!btn) return;
    btn.disabled = estado;
    if (texto)   texto.style.display  = estado ? 'none'         : '';
    if (spinner) spinner.hidden        = !estado;
  }

  /* ── Submit del formulario de registro ────────────────────── */
  function onSubmitRegistro(e) {
    e.preventDefault();
    limpiarErrorRegistro();

    const nombre    = document.getElementById('reg-nombre').value.trim();
    const identificacion = document.getElementById('reg-identificacion').value.trim();
    const email     = document.getElementById('reg-email').value.trim();
    const contrasena = document.getElementById('reg-pass').value;
    const confirmar = document.getElementById('reg-confirmar').value;

    // Validaciones
    if (!nombre || !identificacion || !email || !contrasena || !confirmar) {
      mostrarErrorRegistro('Completa todos los campos.');
      return;
    }

    if (contrasena !== confirmar) {
      mostrarErrorRegistro('Las contraseñas no coinciden.');
      return;
    }

    if (contrasena.length < 6) {
      mostrarErrorRegistro('La contraseña debe tener mínimo 6 caracteres.');
      return;
    }

    setCargandoRegistro(true);

    const body = new URLSearchParams({ accion: 'registrar', nombre, identificacion, email, contrasena });

    fetch(API_LOGIN, { method: 'POST', body })
      .then(r => r.json())
      .then(data => {
        if (!data.ok) {
          mostrarErrorRegistro(data.mensaje || 'Error al registrar.');
          setCargandoRegistro(false);
          return;
        }

        // ── Guardar datos en sessionStorage ──
        sessionStorage.setItem('jm_nombre', data.nombre);
        sessionStorage.setItem('jm_rol',    data.rol);
        
        console.log('✓ Registro exitoso:', data.nombre, data.rol);

        // ── Actualizar navbar y cerrar modal ──
        cerrarModalRegistro();
        actualizarNavbarSesion();
        
        // ── Mostrar mensaje de éxito ──
        alert('✓ ' + data.mensaje);
        
        // ── Pequeño delay y recargar si está en index ──
        setTimeout(() => {
          window.location.reload();
        }, 300);
      })
      .catch(() => {
        mostrarErrorRegistro('Error de conexión. Intenta de nuevo.');
        setCargandoRegistro(false);
      });
  }

  /* ── Cerrar modal de registro ────────────────────────────── */
  function cerrarModalRegistro() {
    const overlay = document.getElementById('registroOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      limpiarErrorRegistro();
    }
  }

  /* ── Abrir modal de registro ─────────────────────────────── */
  function abrirModalRegistro() {
    const overlay = document.getElementById('registroOverlay');
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      document.getElementById('reg-nombre')?.focus();
    }
  }
 
  /* ── Inicializar listeners del modal ─────────────────────── */
  function initModal() {
    const overlay = document.getElementById('loginOverlay');
    const modal = document.getElementById('modalLogin');
    
    // Cerrar con botón X (modal inyectado)
    document.getElementById('loginClose')
      ?.addEventListener('click', cerrarModal);
    
    // Cerrar con X (modal estático de index.html)
    document.getElementById('modalClose')
      ?.addEventListener('click', cerrarModal);
 
    // Cerrar al clic en overlay (fuera de la card) - modal inyectado
    if (overlay) {
      overlay.addEventListener('click', e => {
        if (e.target.id === 'loginOverlay') cerrarModal();
      });
    }
    
    // Cerrar al clic en overlay - modal estático
    if (modal) {
      modal.addEventListener('click', e => {
        if (e.target === modal) cerrarModal();
      });
    }

    // Cerrar modal de registro con botón X
    document.getElementById('registroClose')
      ?.addEventListener('click', cerrarModalRegistro);

    // Cerrar modal de registro al clic en overlay (fuera de la card)
    const registroOverlay = document.getElementById('registroOverlay');
    if (registroOverlay) {
      registroOverlay.addEventListener('click', e => {
        if (e.target.id === 'registroOverlay') cerrarModalRegistro();
      });
    }
 
    // Cerrar con Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        cerrarModal();
        cerrarModalRegistro();
      }
    });
 
    // Submit login
    document.getElementById('loginForm')
      ?.addEventListener('submit', onSubmit);

    // Submit registro
    document.getElementById('registroForm')
      ?.addEventListener('submit', onSubmitRegistro);

    // Toggle registro desde login
    document.getElementById('switchToRegisterLogin')
      ?.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        cerrarModal();
        // Pequeño delay para que se cierre antes de abrir el otro
        setTimeout(() => {
          abrirModalRegistro();
        }, 150);
      });

    // Toggle a login desde registro
    document.getElementById('switchToLoginReg')
      ?.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        cerrarModalRegistro();
        // Pequeño delay para que se cierre antes de abrir el otro
        setTimeout(() => {
          abrirModal();
        }, 150);
      });
 
    initTogglePass();
    initTogglePassRegistro();
  }
 
  /* ── Actualizar navbar si hay sesión activa ──────────────── */
  function actualizarNavbarSesion() {
    const nombre = sessionStorage.getItem('jm_nombre');
    const rol    = sessionStorage.getItem('jm_rol');
    if (!nombre) return;
 
    // Esperar a que el navbar esté en el DOM
    const esperar = setInterval(() => {
      const headerNoAuth = document.getElementById('headerNoAuth');
      const headerClienteAuth = document.getElementById('headerClienteAuth');
      const greetingUsuario = document.getElementById('greetingUsuario');
      const btnLogout = document.getElementById('btnLogout');
      
      if (!headerNoAuth || !headerClienteAuth) return;
      clearInterval(esperar);
 
      // Mostrar vista autenticada
      headerNoAuth.style.display = 'none';
      headerClienteAuth.style.display = 'flex';
      greetingUsuario.textContent = `¡Hola ${nombre}!`;
      
      // Configurar botón logout
      if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
          e.preventDefault();
          fetch(API_LOGIN + '?accion=logout')
            .finally(() => {
              sessionStorage.clear();
              // Recargar para resetear el navbar
              window.location.href = './index.html';
            });
        });
      }
    }, 80);
  }
 
  /* ── Punto de entrada ────────────────────────────────────── */
  function init() {
    inyectarCSS();
 
    // Conectar botón "Iniciar Sesión" del navbar
    // El navbar se carga dinámicamente, hay que esperar
    const esperar = setInterval(() => {
      const btnLogin = document.getElementById('btnLogin');
      const btnRegister = document.getElementById('btnRegister');
      if (!btnLogin) return;
      clearInterval(esperar);
 
      btnLogin.addEventListener('click', e => {
        e.preventDefault();
        inyectarModal().then(() => {
          initModal();
          abrirModal();
        });
      });

      // Conectar botón registrarse
      if (btnRegister) {
        btnRegister.addEventListener('click', e => {
          e.preventDefault();
          inyectarModal().then(() => {
            initModal();
            abrirModalRegistro();
          });
        });
      }
    }, 80);
 
    actualizarNavbarSesion();
  }
 
  // Exponer función global para que main.js la pueda llamar
  window.actualizarNavbarCliente = actualizarNavbarSesion;
 
  // Arrancar cuando el DOM esté listo
  // Como se carga dinámicamente, asegurar que se ejecute siempre
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  }
  
  // Ejecutar siempre para cubrir todos los casos de carga dinámica
  setTimeout(init, 0);
 
})();