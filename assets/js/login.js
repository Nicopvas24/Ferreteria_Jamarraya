/* ============================================================
   js/login.js
   Maneja el modal de login y redirección por rol.
   Se carga en components.js junto con login-modal.html
   ============================================================ */
 
(function () {
 
  let modalInitialized = false; // Flag para evitar listeners duplicados
  
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
      // Limpiar formulario
      document.getElementById('lm-email').value = '';
      document.getElementById('lm-pass').value = '';
    } else if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      limpiarError();
      // Limpiar formulario
      document.getElementById('lm-email').value = '';
      document.getElementById('lm-pass').value = '';
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
 
  /* ── Validar contraseña según requisitos de ciberseguridad ─────────────────────────────── */
  function validarContrasena(pass) {
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
    
    // Remover listeners previos para evitar duplicados
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', () => {
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      newBtn.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
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
      
      // Remover listeners previos para evitar duplicados
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      newBtn.addEventListener('click', () => {
        const visible = input.type === 'text';
        input.type = visible ? 'password' : 'text';
        newBtn.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
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

    const validation = validarContrasena(contrasena);
    if (!validation.valida) {
      mostrarErrorRegistro(validation.mensaje);
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
      // Limpiar formulario de registro
      document.getElementById('reg-nombre').value = '';
      document.getElementById('reg-identificacion').value = '';
      document.getElementById('reg-email').value = '';
      document.getElementById('reg-pass').value = '';
      document.getElementById('reg-confirmar').value = '';
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
    // Evitar que se agreguen listeners múltiples veces
    if (modalInitialized) return;
    modalInitialized = true;
    
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

    // ── Botón ¿Olvidaste tu contraseña? ──
    document.getElementById('loginForgotPass')
      ?.addEventListener('click', e => {
        e.preventDefault();
        cerrarModal();
        // Pequeño delay y luego abrir modal de recuperación
        setTimeout(() => {
          RecuperarContrasena.abrir();
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
    let intentos = 0;
    const esperar = setInterval(() => {
      intentos++;
      const headerNoAuth = document.getElementById('headerNoAuth');
      const headerClienteAuth = document.getElementById('headerClienteAuth');
      const greetingUsuario = document.getElementById('greetingUsuario');
      const btnLogout = document.getElementById('btnLogout');
      
      // Si no encuentra después de 50 intentos (4 segundos), detener
      if (intentos > 50) {
        clearInterval(esperar);
        return;
      }
      
      if (!headerNoAuth || !headerClienteAuth) return;
      clearInterval(esperar);
 
      // Mostrar vista autenticada solo si es cliente
      if (rol === 'cliente') {
        headerNoAuth.style.display = 'none';
        headerClienteAuth.style.display = 'flex';
        greetingUsuario.textContent = `¡Hola ${nombre}!`;
      }
      
      // Configurar botón logout una sola vez
      if (btnLogout && !btnLogout.dataset.logoutConfigured) {
        btnLogout.dataset.logoutConfigured = 'true';
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
    // ── Verificar si es admin/empleado logueado ──────────────
    const rol = sessionStorage.getItem('jm_rol');
    
    // 🔒 Si es admin o empleado, NO inyectar modales. Redirigir al dashboard
    // PERO: solo redirigir si NO está ya en el dashboard
    if (rol === 'admin' || rol === 'empleado') {
      const paginaActual = window.location.pathname.toLowerCase();
      const dashboardAdmin = '/dashboard-admin.html';
      const dashboardEmpleado = '/dashboard-empleado.html';
      
      // Si es admin pero NO está en dashboard-admin, redirigir
      if (rol === 'admin' && !paginaActual.includes(dashboardAdmin)) {
        console.log('🔒 Admin detectado fuera del dashboard. Redirigiendo a dashboard-admin.html');
        window.location.href = './dashboard-admin.html';
        return;
      }
      
      // Si es empleado pero NO está en dashboard-empleado, redirigir
      if (rol === 'empleado' && !paginaActual.includes(dashboardEmpleado)) {
        console.log('🔒 Empleado detectado fuera del dashboard. Redirigiendo a dashboard-empleado.html');
        window.location.href = './dashboard-empleado.html';
        return;
      }
      
      // Si ya está en su dashboard, no hacer nada
      console.log('✅ Ya está en su dashboard, continuando normalmente');
      return;
    }
    
    inyectarCSS();

    // ── Inicializar módulo de recuperación de contraseña ──────
    // Esperar a que RecuperarContrasena esté disponible (se carga antes en include.js)
    if (window.RecuperarContrasena && window.RecuperarContrasena.init) {
      RecuperarContrasena.init().catch(err => {
        console.warn('Error al cargar módulo de recuperación:', err);
      });
    } else {
      console.warn('⚠️ RecuperarContrasena no está disponible aún');
    }
 
    // Conectar botón "Iniciar Sesión" del navbar
    // El navbar se carga dinámicamente, hay que esperar
    let eventoAlClick = false;
    let intentosNavbar = 0;
    const esperar = setInterval(() => {
      intentosNavbar++;
      const btnLogin = document.getElementById('btnLogin');
      const btnRegister = document.getElementById('btnRegister');
      
      // Si no encuentra después de 50 intentos (4 segundos), detener
      if (intentosNavbar > 50) {
        clearInterval(esperar);
        console.warn('⚠️ Navbar no cargó a tiempo');
        return;
      }
      
      if (!btnLogin) return;
      clearInterval(esperar);
 
      // Conectar eventos solo si NO se han conectado ya
      if (!eventoAlClick) {
        eventoAlClick = true;
        console.log('✅ Conectando event listeners a botones de login');
        
        // Clonar para remover event listeners previos
        const newBtnLogin = btnLogin.cloneNode(true);
        btnLogin.parentNode.replaceChild(newBtnLogin, btnLogin);
        
        newBtnLogin.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Abriendo modal de login');
          inyectarModal().then(() => {
            initModal();
            abrirModal();
          });
        });

        // Conectar botón registrarse
        if (btnRegister) {
          const newBtnRegister = btnRegister.cloneNode(true);
          btnRegister.parentNode.replaceChild(newBtnRegister, btnRegister);
          
          newBtnRegister.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Abriendo modal de registro');
            inyectarModal().then(() => {
              initModal();
              abrirModalRegistro();
            });
          });
        }
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