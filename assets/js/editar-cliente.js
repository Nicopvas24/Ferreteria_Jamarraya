/**
 * MÓDULO: ClienteEditModal
 * Gestiona la edición de clientes
 * Patrón: IIFE + Module Pattern
 */

const ClienteEditModal = (() => {
  const API = '../backend/api/clientes.php';
  let isInitialized = false;
  let maxWaitTime = 5000; // 5 segundos
  let waitStartTime = 0;
  let clienteActualId = null;

  /**
   * Espera a que los elementos del DOM existan
   */
  const waitForElements = () => {
    return new Promise((resolve, reject) => {
      waitStartTime = Date.now();
      const checkElements = () => {
        const modal = document.getElementById('modalEditarCliente');
        const form = document.getElementById('formEditarCliente');
        
        if (modal && form) {
          resolve({ modal, form });
        } else if (Date.now() - waitStartTime > maxWaitTime) {
          reject(new Error('Modal elements not found'));
        } else {
          setTimeout(checkElements, 100);
        }
      };
      checkElements();
    });
  };

  /**
   * Inicializa el modal
   */
  const init = () => {
    if (isInitialized) return;
    
    waitForElements().then(({ modal, form }) => {
      form.addEventListener('submit', handleSubmit);
      isInitialized = true;
    }).catch(err => {
      console.error('ClienteEditModal init error:', err);
    });
  };

  /**
   * Abre el modal para editar un cliente
   */
  const abrir = (clienteId) => {
    if (!isInitialized) {
      console.warn('⚠️ ClienteEditModal aún no inicializado');
      return;
    }

    clienteActualId = clienteId;
    const modal = document.getElementById('modalEditarCliente');
    
    if (!modal) return;

    // Fetch datos del cliente
    fetch(`${API}?accion=detalle&id=${clienteId}`)
      .then(r => r.json())
      .then(cliente => {
        // Llenar formulario
        document.getElementById('edt_cli_nombre').value = cliente.nombre || '';
        document.getElementById('edt_cli_identificacion').value = cliente.identificacion || '';
        document.getElementById('edt_cli_email').value = cliente.email || '';
        document.getElementById('edt_cli_telefono').value = cliente.telefono || '';
        document.getElementById('edt_cli_direccion').value = cliente.direccion || '';

        // Limpiar errores
        clearForm();

        // Mostrar modal
        modal.classList.add('active');
        document.getElementById('edt_cli_nombre').focus();
      })
      .catch(err => {
        console.error('Error fetching cliente:', err);
        showError('Error cargando datos del cliente');
      });
  };

  /**
   * Maneja el envío del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const nombre = document.getElementById('edt_cli_nombre').value.trim();
    const identificacion = document.getElementById('edt_cli_identificacion').value.trim();
    const email = document.getElementById('edt_cli_email').value.trim();
    const telefono = document.getElementById('edt_cli_telefono').value.trim();
    const direccion = document.getElementById('edt_cli_direccion').value.trim();
    
    // Validación
    if (!nombre || !identificacion) {
      showError('Nombre e identificación son requeridos');
      return;
    }

    if (email && !isValidEmail(email)) {
      showError('Email inválido');
      return;
    }

    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'editar',
          id: clienteActualId,
          nombre,
          identificacion,
          email: email || null,
          telefono: telefono || null,
          direccion: direccion || null
        })
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        // ✓ Éxito
        clearForm();
        cerrar();
        
        // Callback
        if (typeof window.onClienteActualizado === 'function') {
          window.onClienteActualizado(data);
        }
      } else {
        // Mostrar el mensaje de error específico
        const errorMsg = data.error || data.mensaje || 'Error al actualizar cliente';
        showError(errorMsg);
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Error de conexión: ' + error.message);
    }
  };

  /**
   * Valida email
   */
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  /**
   * Muestra error
   */
  const showError = (message) => {
    const errorDiv = document.getElementById('editarClienteError');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  };

  /**
   * Limpia el formulario
   */
  const clearForm = () => {
    const form = document.getElementById('formEditarCliente');
    if (form) form.reset();
    
    const errorDiv = document.getElementById('editarClienteError');
    if (errorDiv) errorDiv.style.display = 'none';
  };

  /**
   * Cierra el modal
   */
  const cerrar = () => {
    const modal = document.getElementById('modalEditarCliente');
    if (modal) {
      modal.classList.remove('active');
      clearForm();
    }
    clienteActualId = null;
  };

  // ====================
  // API PÚBLICA
  // ====================
  return {
    init,
    abrir,
    cerrar
  };
})();

// Inicializa cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ClienteEditModal.init());
} else {
  ClienteEditModal.init();
}
