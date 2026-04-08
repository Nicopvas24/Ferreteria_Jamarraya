/* ============================================================
   crear-usuario.js
   Módulo para crear usuarios — Funciona con componentes/crear-usuario-modal.html
   ============================================================ */

const UsuarioModal = (() => {
  const API = '/Ferreteria_Jamarraya/php/usuarios.php';
  
  // Elementos - serán obtenidos cuando se inicialice
  let modal, form, errorEl;
  let initialized = false;

  /** Obtiene los elementos del DOM */
  function obtenerElementos() {
    modal = document.getElementById('modalCrearUsuario');
    form = document.getElementById('formCrearUsuario');
    errorEl = document.getElementById('usuarioError');
    return modal && form && errorEl;
  }

  /** Espera a que los elementos existan en el DOM */
  function esperarElementos() {
    return new Promise((resolve) => {
      const maxIntents = 50; // 5 segundos máximo
      let intents = 0;
      
      const checkInterval = setInterval(() => {
        intents++;
        if (obtenerElementos() || intents >= maxIntents) {
          clearInterval(checkInterval);
          resolve(obtenerElementos());
        }
      }, 100);
    });
  }

  /** Abre el modal */
  function abrir() {
    if (!initialized) {
      console.warn('⚠️ UsuarioModal aún no inicializado');
      return;
    }
    if (modal) {
      modal.classList.add('active');
      limpiar();
    }
  }

  /** Cierra el modal */
  function cerrar() {
    if (!initialized) return;
    if (modal) {
      modal.classList.remove('active');
      limpiar();
    }
  }

  /** Limpia el formulario y errores */
  function limpiar() {
    if (form) form.reset();
    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }
  }

  /** Muestra error */
  function mostrarError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }
  }

  /** Valida los campos */
  function validar(nombre, email, pass) {
    if (!nombre || !email || !pass) {
      mostrarError('Completa todos los campos');
      return false;
    }

    if (pass.length < 6) {
      mostrarError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(email)) {
      mostrarError('Email inválido');
      return false;
    }

    return true;
  }

  /** Maneja el submit del formulario */
  async function onSubmit(e) {
    e.preventDefault();
    if (errorEl) errorEl.style.display = 'none';

    const nombre = document.getElementById('usu_nombre').value.trim();
    const email = document.getElementById('usu_email').value.trim();
    const pass = document.getElementById('usu_pass').value;
    const rol = document.getElementById('usu_rol').value;

    // Validar
    if (!validar(nombre, email, pass)) return;
    if (!rol) {
      mostrarError('Selecciona un rol');
      return;
    }

    // Enviar
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    const textoOriginal = btn.textContent;
    btn.textContent = 'Creando...';

    try {
      const response = await fetch(API, {
        method: 'POST',
        body: new URLSearchParams({
          accion: 'crear',
          nombre,
          email,
          contrasena: pass,
          rol,
        })
      });

      const data = await response.json();

      if (!data.ok) {
        mostrarError(data.mensaje || 'Error al crear usuario');
        return;
      }

      // Éxito
      cerrar();
      
      // Callback si existe
      if (typeof window.onUsuarioCreado === 'function') {
        window.onUsuarioCreado();
      }

    } catch (error) {
      console.error('Error:', error);
      mostrarError('Error de conexión');
    } finally {
      btn.disabled = false;
      btn.textContent = textoOriginal;
    }
  }

  /** Inicializa el módulo */
  async function init() {
    // Esperar a que los elementos existan
    const existenElementos = await esperarElementos();
    
    if (!existenElementos) {
      console.error('❌ UsuarioModal: No se encontraron los elementos del modal');
      return false;
    }

    if (form) {
      form.addEventListener('submit', onSubmit);
      initialized = true;
      console.log('✓ UsuarioModal inicializado correctamente');
      return true;
    }
    
    return false;
  }

  // Exponer métodos públicos
  return {
    abrir,
    cerrar,
    init,
  };
})();

// Iniciar cuando esté disponible
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => UsuarioModal.init());
} else {
  UsuarioModal.init();
}
