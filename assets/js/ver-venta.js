/* ============================================================
   ver-venta.js
   Modal para ver detalles de la venta
============================================================ */

const VerVentaModal = {
  API: 'http://localhost/Ferreteria_Jamarraya/backend/api/ventas.php',
  inicializado: false,

  init() {
    const modal = document.getElementById('modalVerVentaBackdrop');
    const btnCerrar1 = document.getElementById('btnCerrarVerVenta');
    const btnCerrar2 = document.getElementById('btnCerrarVerVenta2');

    if (!modal) return;

    if (btnCerrar1) {
      btnCerrar1.addEventListener('click', () => this.cerrar());
    }

    if (btnCerrar2) {
      btnCerrar2.addEventListener('click', () => this.cerrar());
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.cerrar();
    });

    this.inicializado = true;
    console.log('✅ VerVentaModal inicializado');
  },

  async abrir(id) {
    try {
      console.log('🔍 Abriendo venta:', id);
      const r = await fetch(this.API + `?accion=detalle&id=${id}`);
      const venta = await r.json();

      if (!venta.id) {
        alert('Error: Venta no encontrada');
        return;
      }

      console.log('📦 Venta cargada:', venta);

      // Llenar datos principales
      document.getElementById('verVentaId').textContent = venta.id;
      document.getElementById('verVentaComprobante').textContent = venta.comprobante || '—';
      document.getElementById('verVentaFecha').textContent = this.fmtFecha(venta.fecha);
      document.getElementById('verVentaCliente').textContent = venta.cliente || '—';
      document.getElementById('verVentaUsuario').textContent = venta.registrado_por || '—';

      // Calcular subtotal
      let subtotal = 0;
      if (venta.items && Array.isArray(venta.items)) {
        subtotal = venta.items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
      }
      const iva = subtotal * 0.19;

      // Llenar tabla de items
      const itemsContainer = document.getElementById('verVentaItems');
      itemsContainer.innerHTML = (venta.items || []).map(item => {
        const subtotalItem = item.cantidad * item.precio_unitario;
        return `
          <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 0.5rem;">${item.codigo}</td>
            <td style="padding: 0.5rem;">${item.nombre}</td>
            <td style="text-align: center; padding: 0.5rem;">${item.cantidad}</td>
            <td style="text-align: right; padding: 0.5rem;">${this.fmt$(item.precio_unitario)}</td>
            <td style="text-align: right; padding: 0.5rem; color: var(--green); font-weight: 600;">${this.fmt$(subtotalItem)}</td>
          </tr>
        `;
      }).join('');

      // Llenar totales
      document.getElementById('verVentaSubtotal').textContent = this.fmt$(subtotal);
      document.getElementById('verVentaIva').textContent = this.fmt$(iva);
      document.getElementById('verVentaTotal').textContent = this.fmt$(parseFloat(venta.total));

      // Mostrar modal
      const modal = document.getElementById('modalVerVentaBackdrop');
      if (modal) {
        modal.classList.add('active');
        console.log('✅ Modal mostrado');
      }
    } catch (e) {
      console.error('❌ Error al cargar venta:', e);
      alert('Error al cargar los detalles de la venta');
    }
  },

  cerrar() {
    const modal = document.getElementById('modalVerVentaBackdrop');
    if (modal) modal.classList.remove('active');
  },

  // Helpers
  fmt$(n) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
  },

  fmtFecha(s) {
    return new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
};
