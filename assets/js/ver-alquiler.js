/* ============================================================
   ver-alquiler.js
   Modal para ver detalles del alquiler
============================================================ */

const VerAlquilerModal = {
  API: 'http://localhost/Ferreteria_Jamarraya/backend/api/alquileres.php',
  inicializado: false,

  init() {
    const modal = document.getElementById('modalVerAlquilerBackdrop');
    const btnCerrar1 = document.getElementById('btnCerrarVerAlquiler');
    const btnCerrar2 = document.getElementById('btnCerrarVerAlquiler2');

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
  },

  async abrir(id) {
    try {
      const r = await fetch(this.API + `?accion=detalle&id=${id}`);
      const alq = await r.json();

      if (!alq.id) {
        alert('Error: Alquiler no encontrado');
        return;
      }

      // Llenar datos
      document.getElementById('verAlquilerId').textContent = alq.id;
      document.getElementById('verAlquilerCliente').textContent = alq.cliente || '—';
      document.getElementById('verAlquilerIdentificacion').textContent = alq.identificacion || '—';
      document.getElementById('verAlquilerTelefono').textContent = alq.telefono || '—';
      document.getElementById('verAlquilerEmail').textContent = alq.email || '—';
      document.getElementById('verAlquilerMaquinaria').textContent = alq.maquinaria || '—';
      document.getElementById('verAlquilerTarifa').textContent = this.fmt$(alq.tarifa_alquiler || 0);
      document.getElementById('verAlquilerFechaInicio').textContent = this.fmtFecha(alq.fecha_inicio);
      document.getElementById('verAlquilerFechaFin').textContent = this.fmtFecha(alq.fecha_fin);
      document.getElementById('verAlquilerMonto').textContent = this.fmt$(alq.monto);
      document.getElementById('verAlquilerEstado').innerHTML = this.estadoBadge(alq.estado);

      const modal = document.getElementById('modalVerAlquilerBackdrop');
      if (modal) {
        modal.classList.add('active');
      }
    } catch (e) {
      alert('Error al cargar los detalles del alquiler');
    }
  },

  cerrar() {
    const modal = document.getElementById('modalVerAlquilerBackdrop');
    if (modal) modal.classList.remove('active');
  },

  // Helpers
  fmt$(n) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
  },

  fmtFecha(s) {
    return new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },

  estadoBadge(estado) {
    const map = {
      activo: 'green',
      disponible: 'green',
      finalizado: 'blue',
      alquilada: 'orange',
      mantenimiento: 'yellow',
      inactivo: 'red'
    };
    return `<span class="badge badge-${map[estado] || 'blue'}">${estado}</span>`;
  }
};

// Inicializar cuando esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => VerAlquilerModal.init());
} else {
  VerAlquilerModal.init();
}
