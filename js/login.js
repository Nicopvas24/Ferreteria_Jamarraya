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
    administrador: '/Ferreteria_Jamarraya/pages/dashboard-admin.html',
    empleado:      '/Ferreteria_Jamarraya/pages/dashboard-empleado.html',
    cliente:       '/Ferreteria_Jamarraya/pages/index.html',   // index del catálogo
  };
 
  const API_LOGIN  = '/Ferreteria_Jamarraya/php/usuarios.php';
  const MODAL_HTML = '/Ferreteria_Jamarraya/components/login-modal.html';
  const MODAL_CSS  = '/Ferreteria_Jamarraya/components/login-modal.css';
 
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
      // Primero verificar si existe el modal de index.html
      if (document.getElementById('modalLogin')) { 
        resolve(); 
        return; 
      }

   
      // Si no existe, inyectar el modal de login-modal.html
      if (document.getElementById('loginOverlay')) { 
        resolve(); 
        return; 
      }
      
      fetch(MODAL_HTML)
        .then(r => r.text())
        .then(html => {
          const div = document.createElement('div');
          div.innerHTML = html;
          document.body.appendChild(div.firstElementChild);
          resolve();
        })
        .catch(reject);
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
 
        // ── Redirigir según rol ──
        const ruta = RUTAS_ROL[data.rol] ?? RUTAS_ROL.cliente;
        window.location.href = ruta;
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
 
    // Cerrar con Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') cerrarModal();
    });
 
    // Submit
    document.getElementById('loginForm')
      ?.addEventListener('submit', onSubmit);
 
    initTogglePass();
  }
 
  /* ── Actualizar navbar si hay sesión activa ──────────────── */
  function actualizarNavbarSesion() {
    const nombre = sessionStorage.getItem('jm_nombre');
    const rol    = sessionStorage.getItem('jm_rol');
    if (!nombre) return;
 
    // Esperar a que el navbar esté en el DOM
    const esperar = setInterval(() => {
      const btnLogin    = document.getElementById('btnLogin');
      const btnRegister = document.getElementById('btnRegister');
      if (!btnLogin) return;
      clearInterval(esperar);
 
      const ruta = RUTAS_ROL[rol] ?? RUTAS_ROL.cliente;
 
      // Reemplazar botones
      btnLogin.textContent = nombre;
      btnLogin.href = ruta;
      btnLogin.classList.replace('btn--ghost', 'btn--primary');
 
      if (btnRegister) {
        btnRegister.textContent = 'Cerrar sesión';
        btnRegister.href = '#';
        btnRegister.classList.replace('btn--primary', 'btn--ghost');
        btnRegister.addEventListener('click', e => {
          e.preventDefault();
          fetch(API_LOGIN + '?accion=logout')
            .finally(() => {
              sessionStorage.clear();
              window.location.href = '/Ferreteria_Jamarraya/pages/index.html';
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
      if (!btnLogin) return;
      clearInterval(esperar);
 
      btnLogin.addEventListener('click', e => {
        e.preventDefault();
        inyectarModal().then(() => {
          initModal();
          abrirModal();
        });
      });
    }, 80);
 
    actualizarNavbarSesion();
  }
 
  // Arrancar cuando el DOM esté listo
  // Como se carga dinámicamente, asegurar que se ejecute siempre
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  }
  
  // Ejecutar siempre para cubrir todos los casos de carga dinámica
  setTimeout(init, 0);
 
})();