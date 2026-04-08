/**
 * MÓDULO: ClienteVerModal
 * Gestiona la visualización de detalles de clientes
 * Patrón: IIFE + Module Pattern
 */

const ClienteVerModal = (() => {
  const API = '/Ferreteria_Jamarraya/backend/api/clientes.php';
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
        const modal = document.getElementById('modalVerCliente');
        
        if (modal) {
          resolve({ modal });
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
    
    waitForElements().then(() => {
      isInitialized = true;
      console.log('✓ ClienteVerModal initialized');
    }).catch(err => {
      console.error('ClienteVerModal init error:', err);
    });
  };

  /**
   * Abre el modal para ver detalles de un cliente
   */
  const abrir = (clienteId) => {
    if (!isInitialized) {
      console.warn('⚠️ ClienteVerModal aún no inicializado');
      return;
    }

    clienteActualId = clienteId;
    const modal = document.getElementById('modalVerCliente');
    
    if (!modal) return;

    // Mostrar modal sin datos mientras carga
    modal.classList.add('active');

    // Fetch datos del cliente
    fetch(`${API}?accion=detalle&id=${clienteId}`)
      .then(r => r.json())
      .then(cliente => {
        // Llenar info básica
        document.getElementById('ver_cli_nombre').textContent = cliente.nombre || '—';
        document.getElementById('ver_cli_identificacion').textContent = cliente.identificacion || '—';
        document.getElementById('ver_cli_email').textContent = cliente.email || '—';
        document.getElementById('ver_cli_telefono').textContent = cliente.telefono || '—';
        document.getElementById('ver_cli_direccion').textContent = cliente.direccion || '—';

        // Llenar tabla de compras
        renderCompras(cliente.ventas || []);

        // Llenar tabla de alquileres
        renderAlquileres(cliente.alquileres || []);
      })
      .catch(err => {
        console.error('Error fetching cliente:', err);
        document.getElementById('tablaCompras').innerHTML = 
          '<tr><td colspan="3" class="empty-state">Error cargando datos</td></tr>';
        document.getElementById('tablaAlquileres').innerHTML = 
          '<tr><td colspan="5" class="empty-state">Error cargando datos</td></tr>';
      });
  };

  /**
   * Renderiza tabla de compras
   */
  const renderCompras = (ventas) => {
    const tbody = document.getElementById('tablaCompras');
    
    if (!ventas || ventas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Sin compras registradas</td></tr>';
      return;
    }

    tbody.innerHTML = ventas.map(v => `
      <tr>
        <td><code style="color:var(--orange);font-size:.8rem">${v.comprobante || '—'}</code></td>
        <td style="font-size:.82rem;color:var(--text-muted)">${formatFecha(v.fecha)}</td>
        <td style="font-weight:600">${formatMoney(v.total || 0)}</td>
      </tr>
    `).join('');
  };

  /**
   * Renderiza tabla de alquileres
   */
  const renderAlquileres = (alquileres) => {
    const tbody = document.getElementById('tablaAlquileres');
    
    if (!alquileres || alquileres.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Sin alquileres registrados</td></tr>';
      return;
    }

    tbody.innerHTML = alquileres.map(a => {
      const estadoClass = {
        'activo': 'badge-orange',
        'finalizado': 'badge-blue',
        'cancelado': 'badge-red'
      }[a.estado] || 'badge-blue';

      return `
      <tr>
        <td style="color:var(--text-muted);font-size:.8rem">#${a.id}</td>
        <td>${a.maquinaria || '—'}</td>
        <td style="font-size:.8rem">${formatFecha(a.fecha_inicio)} a ${formatFecha(a.fecha_fin)}</td>
        <td style="font-weight:600">${formatMoney(a.monto || 0)}</td>
        <td><span class="badge ${estadoClass}">${a.estado || '—'}</span></td>
      </tr>
    `;
    }).join('');
  };

  /**
   * Formatea fecha
   */
  const formatFecha = (fecha) => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-CO', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  /**
   * Formatea moneda
   */
  const formatMoney = (n) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP', 
      minimumFractionDigits: 0 
    }).format(n);
  };

  /**
   * Obtiene ID actual del cliente (para el botón Editar)
   */
  const getCurrentId = () => clienteActualId;

  /**
   * Cierra el modal
   */
  const cerrar = () => {
    const modal = document.getElementById('modalVerCliente');
    if (modal) modal.classList.remove('active');
    clienteActualId = null;
  };

  // ====================
  // API PÚBLICA
  // ====================
  return {
    init,
    abrir,
    cerrar,
    getCurrentId
  };
})();

// Inicializa cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ClienteVerModal.init());
} else {
  ClienteVerModal.init();
}
