/* ============================================================
   devolver-alquiler.js
   Modal para devolver un alquiler
============================================================ */

const DevolverAlquilerModal = {
  API: 'http://localhost/Ferreteria_Jamarraya/backend/api/alquileres.php',
  inicializado: false,
  alquilerActualId: null,

  init() {
    const modal = document.getElementById('modalDevolverAlquilerBackdrop');
    const btnCerrar1 = document.getElementById('btnCerrarDevolverAlquiler');
    const btnCerrar2 = document.getElementById('btnCerrarDevolverAlquiler2');
    const btnConfirmar = document.getElementById('btnConfirmarDevolver');

    if (!modal) return;

    if (btnCerrar1) {
      btnCerrar1.addEventListener('click', () => this.cerrar());
    }

    if (btnCerrar2) {
      btnCerrar2.addEventListener('click', () => this.cerrar());
    }

    if (btnConfirmar) {
      btnConfirmar.addEventListener('click', () => this.confirmar());
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

      // Guardar el ID
      this.alquilerActualId = id;

      // Llenar datos
      document.getElementById('devolverAlquilerId').textContent = alq.id;
      document.getElementById('devolverAlquilerCliente').textContent = alq.cliente || '—';
      document.getElementById('devolverAlquilerMaquinaria').textContent = alq.maquinaria || '—';
      document.getElementById('devolverAlquilerMonto').textContent = this.fmt$(alq.monto);
      document.getElementById('devolverAlquilerEstado').innerHTML = this.estadoBadge(alq.estado);

      const modal = document.getElementById('modalDevolverAlquilerBackdrop');
      if (modal) {
        modal.classList.add('active');
      }
    } catch (e) {
      alert('Error al cargar la información del alquiler');
    }
  },

  cerrar() {
    const modal = document.getElementById('modalDevolverAlquilerBackdrop');
    if (modal) modal.classList.remove('active');
    this.alquilerActualId = null;
  },

  async confirmar() {
    if (!this.alquilerActualId) {
      alert('Error: No hay alquiler seleccionado');
      return;
    }

    const btn = document.getElementById('btnConfirmarDevolver');
    btn.disabled = true;
    btn.textContent = '⏳ Procesando...';

    try {
      const r = await fetch(this.API + '?accion=devolver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(this.alquilerActualId) })
      });

      const resultado = await r.json();

      if (resultado.ok) {
        this.cerrar();
        alert('✅ Alquiler devuelto exitosamente');

        if (typeof cargarAlquileres === 'function') {
          cargarAlquileres();
        }
      } else {
        alert('❌ Error: ' + (resultado.mensaje || resultado.error || 'No se pudo procesar la devolución'));
      }
    } catch (e) {
      alert('Error al procesar la devolución');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Confirmar Devolución';
    }
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
  document.addEventListener('DOMContentLoaded', () => DevolverAlquilerModal.init());
} else {
  DevolverAlquilerModal.init();
}
