/* ============================================================
   ventas.js
   Gestión y listado de ventas
============================================================ */

'use strict';

const VentasManager = {
  API: 'http://localhost/Ferreteria_Jamarraya/backend/api/ventas.php',
  
  ventas: [],
  ventaSeleccionada: null,

  // ══════════════════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ══════════════════════════════════════════════════════════════

  async init() {
    console.log('🔄 Inicializando VentasManager...');
    
    // Configurar filtros
    this.configurarFiltros();
    
    // Cargar ventas
    await this.cargarVentas();
    
    console.log('✅ VentasManager inicializado');
  },

  configurarFiltros() {
    const btnCrear = document.getElementById('btnCrearVenta');
    const inputDesde = document.getElementById('filtroDesde');
    const inputHasta = document.getElementById('filtroHasta');
    const btnFiltrar = document.getElementById('btnFiltrar');
    const btnLimpiar = document.getElementById('btnLimpiar');

    if (btnCrear) {
      btnCrear.addEventListener('click', () => {
        if (window.CrearVentaModal) {
          CrearVentaModal.abrir();
        } else {
          console.error('❌ CrearVentaModal no está disponible');
        }
      });
    }

    if (btnFiltrar) {
      btnFiltrar.addEventListener('click', () => {
        this.cargarVentas();
      });
    }

    if (btnLimpiar) {
      btnLimpiar.addEventListener('click', () => {
        if (inputDesde) inputDesde.value = '';
        if (inputHasta) inputHasta.value = '';
        this.cargarVentas();
      });
    }
  },

  // ══════════════════════════════════════════════════════════════
  // CARGAR VENTAS
  // ══════════════════════════════════════════════════════════════

  async cargarVentas() {
    try {
      let url = this.API + '?accion=listar';

      const desde = document.getElementById('filtroDesde')?.value;
      const hasta = document.getElementById('filtroHasta')?.value;

      if (desde) url += '&desde=' + desde;
      if (hasta) url += '&hasta=' + hasta;

      const response = await fetch(url);
      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Formato de respuesta inválido');
      }

      this.ventas = data;
      this.mostrarVentas();

    } catch (error) {
      console.error('Error cargando ventas:', error);
      this.mostrarError('Error al cargar ventas');
    }
  },

  mostrarVentas() {
    const tabla = document.getElementById('tablasVentas');
    if (!tabla) return;

    if (this.ventas.length === 0) {
      tabla.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          <p>📋 No hay ventas registradas</p>
        </div>
      `;
      return;
    }

    let html = `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: rgba(0,0,0,.2); border-bottom: 2px solid var(--border);">
              <th style="padding: .75rem; text-align: left; font-weight: 700;">Comprobante</th>
              <th style="padding: .75rem; text-align: left; font-weight: 700;">Cliente</th>
              <th style="padding: .75rem; text-align: center; font-weight: 700;">Productos</th>
              <th style="padding: .75rem; text-align: right; font-weight: 700;">Total</th>
              <th style="padding: .75rem; text-align: left; font-weight: 700;">Fecha</th>
              <th style="padding: .75rem; text-align: center; font-weight: 700;">Acciones</th>
            </tr>
          </thead>
          <tbody>
    `;

    this.ventas.forEach(venta => {
      const fecha = new Date(venta.fecha).toLocaleString('es-CO');
      const total = parseFloat(venta.total).toLocaleString('es-CO', {maximumFractionDigits: 2});

      html += `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: .75rem;"><strong>${venta.comprobante}</strong></td>
          <td style="padding: .75rem;">${venta.cliente || 'N/A'}</td>
          <td style="padding: .75rem; text-align: center;">${venta.num_productos || 0}</td>
          <td style="padding: .75rem; text-align: right; color: var(--green); font-weight: 600;">$${total}</td>
          <td style="padding: .75rem; font-size: .85rem; color: var(--text-muted);">${fecha}</td>
          <td style="padding: .75rem; text-align: center;">
            <button 
              class="btn-sm btn-orange"
              onclick="VentasManager.verDetalle(${venta.id})"
              style="cursor: pointer;"
            >Ver</button>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    tabla.innerHTML = html;
  },

  // ══════════════════════════════════════════════════════════════
  // VER DETALLE
  // ══════════════════════════════════════════════════════════════

  async verDetalle(idVenta) {
    try {
      const response = await fetch(this.API + '?accion=detalle&id=' + idVenta);
      const venta = await response.json();

      if (venta.error) {
        this.mostrarError(venta.error);
        return;
      }

      this.mostrarDetalleModal(venta);

    } catch (error) {
      console.error('Error cargando detalle:', error);
      this.mostrarError('Error al cargar detalle de la venta');
    }
  },

  mostrarDetalleModal(venta) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 2000;
      display: flex; align-items: center; justify-content: center;
    `;

    const itemsHTML = (venta.items || []).map(item => `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: .75rem;">${item.codigo}</td>
        <td style="padding: .75rem;">${item.nombre}</td>
        <td style="padding: .75rem; text-align: center;">${item.cantidad}</td>
        <td style="padding: .75rem; text-align: right;">$${parseFloat(item.precio_unitario).toLocaleString('es-CO', {maximumFractionDigits: 2})}</td>
        <td style="padding: .75rem; text-align: right; color: var(--green); font-weight: 600;">$${parseFloat(item.subtotal).toLocaleString('es-CO', {maximumFractionDigits: 2})}</td>
      </tr>
    `).join('');

    const contenido = `
      <div style="
        background: var(--dark-2); border: 1px solid var(--border);
        border-radius: var(--radius); padding: 2rem;
        max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0,0,0,.5);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h2 style="margin: 0; font-size: 1.3rem;">Detalle de Venta</h2>
          <button style="
            background: none; border: none; color: var(--text-muted);
            font-size: 1.5rem; cursor: pointer;
          " onclick="this.closest('[style*=position: fixed]').remove()">✕</button>
        </div>

        <div style="background: rgba(0,0,0,.2); border-radius: 6px; padding: 1rem; margin-bottom: 1.5rem;">
          <div style="margin-bottom: .5rem;">
            <span style="color: var(--text-muted);">Comprobante: </span>
            <strong>${venta.comprobante}</strong>
          </div>
          <div style="margin-bottom: .5rem;">
            <span style="color: var(--text-muted);">Cliente: </span>
            <strong>${venta.cliente}</strong>
          </div>
          <div style="margin-bottom: .5rem;">
            <span style="color: var(--text-muted);">Email: </span>
            <strong>${venta.email || 'N/A'}</strong>
          </div>
          <div style="margin-bottom: .5rem;">
            <span style="color: var(--text-muted);">Teléfono: </span>
            <strong>${venta.telefono || 'N/A'}</strong>
          </div>
          <div>
            <span style="color: var(--text-muted);">Registrado por: </span>
            <strong>${venta.registrado_por}</strong>
          </div>
        </div>

        <div style="margin-bottom: 1.5rem;">
          <h3 style="margin: 0 0 1rem 0; font-size: .95rem; text-transform: uppercase; color: var(--text-muted);">Productos</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: rgba(0,0,0,.3);">
                  <th style="padding: .75rem; text-align: left; font-size: .85rem; font-weight: 700;">Código</th>
                  <th style="padding: .75rem; text-align: left; font-size: .85rem; font-weight: 700;">Nombre</th>
                  <th style="padding: .75rem; text-align: center; font-size: .85rem; font-weight: 700;">Cantidad</th>
                  <th style="padding: .75rem; text-align: right; font-size: .85rem; font-weight: 700;">P.U.</th>
                  <th style="padding: .75rem; text-align: right; font-size: .85rem; font-weight: 700;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>
          </div>
        </div>

        <div style="background: rgba(76,175,80,.1); border: 1px solid rgba(76,175,80,.3); border-radius: 6px; padding: 1rem; margin-bottom: 1.5rem;">
          <div style="text-align: right; font-size: 1.2rem; font-weight: 700;">
            <span style="color: var(--text-muted);">Total: </span>
            <span style="color: var(--green);">$${parseFloat(venta.total).toLocaleString('es-CO', {maximumFractionDigits: 2})}</span>
          </div>
        </div>

        <button style="
          width: 100%; background: var(--border); border: none; border-radius: 6px;
          padding: .75rem; color: var(--text); cursor: pointer; font-weight: 600;
        " onclick="this.closest('[style*=position: fixed]').remove()">Cerrar</button>
      </div>
    `;

    modal.innerHTML = contenido;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  },

  // ══════════════════════════════════════════════════════════════
  // MENSAJES
  // ══════════════════════════════════════════════════════════════

  mostrarError(mensaje) {
    console.error('❌', mensaje);
    // Puedes agregar aquí una notificación visual si lo deseas
  }
};

// Exponer globalmente
window.VentasManager = VentasManager;
window.cargarVentas = () => VentasManager.cargarVentas();

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    VentasManager.init();
  });
} else {
  VentasManager.init();
}
