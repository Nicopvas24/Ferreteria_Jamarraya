/* ============================================================
   editar-usuario.js
   Módulo para editar usuarios — Funciona con componentes/editar-usuario-modal.html
   ============================================================ */

const UsuarioEditModal = (() => {
  const API = '/Ferreteria_Jamarraya/backend/usuarios.php';
  
  // Elementos - serán obtenidos cuando se inicialice
  let modal, form, errorEl;
  let initialized = false;
  let usuarioActual = null;

  /** Obtiene los elementos del DOM */
  function obtenerElementos() {
    modal = document.getElementById('modalEditarUsuario');
    form = document.getElementById('formEditarUsuario');
    errorEl = document.getElementById('editarUsuarioError');
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

  /** Abre el modal con datos del usuario */
  function abrir(usuarioId) {
    if (!initialized) {
      console.warn('⚠️ UsuarioEditModal aún no inicializado');
      return;
    }
    if (!modal) return;

    // Obtener datos del usuario
    const usuarioData = window.usuariosData?.[usuarioId];
    if (!usuarioData) {
      console.error('❌ Usuario no encontrado:', usuarioId);
      return;
    }

    // Guardar datos actuales
    usuarioActual = usuarioData;

    // Llenar formulario
    document.getElementById('edt_nombre').value = usuarioData.nombre || '';
    document.getElementById('edt_email').value = usuarioData.email || '';
    document.getElementById('edt_rol').value = usuarioData.rol || '';
    document.getElementById('edt_activo').value = usuarioData.activo ? '1' : '0';

    modal.classList.add('active');
    limpiarError();
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
    limpiarError();
    usuarioActual = null;
  }

  /** Limpia errores */
  function limpiarError() {
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
  function validar(nombre, email) {
    if (!nombre || !email) {
      mostrarError('Completa todos los campos');
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
    limpiarError();

    if (!usuarioActual) {
      mostrarError('Error: Usuario no cargado');
      return;
    }

    const nombre = document.getElementById('edt_nombre').value.trim();
    const email = document.getElementById('edt_email').value.trim();
    const rol = document.getElementById('edt_rol').value;
    const activo = document.getElementById('edt_activo').value;

    // Validar
    if (!validar(nombre, email)) return;
    if (!rol) {
      mostrarError('Selecciona un rol');
      return;
    }

    // Enviar
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    const textoOriginal = btn.textContent;
    btn.textContent = 'Guardando...';

    try {
      const response = await fetch(API, {
        method: 'POST',
        body: new URLSearchParams({
          accion: 'editar',
          id: usuarioActual.id,
          nombre,
          email,
          rol,
          activo,
        })
      });

      const data = await response.json();

      if (!data.ok) {
        mostrarError(data.mensaje || 'Error al actualizar usuario');
        return;
      }

      // Éxito
      cerrar();
      
      // Callback si existe
      if (typeof window.onUsuarioEditado === 'function') {
        window.onUsuarioEditado();
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
      console.error('❌ UsuarioEditModal: No se encontraron los elementos del modal');
      return false;
    }

    if (form) {
      form.addEventListener('submit', onSubmit);
      initialized = true;
      console.log('✓ UsuarioEditModal inicializado correctamente');
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
  document.addEventListener('DOMContentLoaded', () => UsuarioEditModal.init());
} else {
  UsuarioEditModal.init();
};
