/**
 * MÓDULO: ClienteModal
 * Gestiona la creación de clientes
 * Patrón: IIFE + Module Pattern
 */

const ClienteModal = (() => {
  const API = '/Ferreteria_Jamarraya/backend/api/clientes.php';
  let isInitialized = false;
  let maxWaitTime = 5000; // 5 segundos
  let waitStartTime = 0;

  /**
   * Espera a que los elementos del DOM existan
   */
  const waitForElements = () => {
    return new Promise((resolve, reject) => {
      waitStartTime = Date.now();
      const checkElements = () => {
        const modal = document.getElementById('modalCrearCliente');
        const form = document.getElementById('formCrearCliente');
        
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
      console.log('✓ ClienteModal initialized');
    }).catch(err => {
      console.error('ClienteModal init error:', err);
    });
  };

  /**
   * Maneja el envío del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const nombre = document.getElementById('cli_nombre').value.trim();
    const identificacion = document.getElementById('cli_identificacion').value.trim();
    const email = document.getElementById('cli_email').value.trim();
    const telefono = document.getElementById('cli_telefono').value.trim();
    const direccion = document.getElementById('cli_direccion').value.trim();
    const errorDiv = document.getElementById('clienteError');
    
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
          accion: 'registrar',
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
        if (typeof window.onClienteCreado === 'function') {
          window.onClienteCreado(data);
        }
      } else {
        // Mostrar el mensaje de error específico
        const errorMsg = data.error || data.mensaje || 'Error al crear cliente';
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
    const errorDiv = document.getElementById('clienteError');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  };

  /**
   * Limpia el formulario
   */
  const clearForm = () => {
    const form = document.getElementById('formCrearCliente');
    if (form) form.reset();
    
    const errorDiv = document.getElementById('clienteError');
    if (errorDiv) errorDiv.style.display = 'none';
  };

  /**
   * Abre el modal
   */
  const abrir = () => {
    const modal = document.getElementById('modalCrearCliente');
    if (modal) {
      modal.classList.add('active');
      clearForm();
    }
  };

  /**
   * Cierra el modal
   */
  const cerrar = () => {
    const modal = document.getElementById('modalCrearCliente');
    if (modal) modal.classList.remove('active');
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
  document.addEventListener('DOMContentLoaded', () => ClienteModal.init());
} else {
  ClienteModal.init();
}