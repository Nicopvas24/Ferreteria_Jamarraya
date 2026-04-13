/* ============================================================
   crear-alquiler.js
   Modal para crear novo alquiler
============================================================ */

const CrearAlquilerModal = {
  API: 'http://localhost/Ferreteria_Jamarraya/backend/api/alquileres.php',
  apiClientes: 'http://localhost/Ferreteria_Jamarraya/backend/api/clientes.php',
  apiMaquinaria: 'http://localhost/Ferreteria_Jamarraya/backend/api/alquileres.php?accion=equipos',
  tariffaCurrent: 0,
  inicializado: false,

  async abrir() {
    try {
      this.limpiarFormulario();
      
      // Mostrar modal
      const modal = document.getElementById('modalCrearAlquiler');
      if (modal) modal.classList.add('active');

      // Cargar selectores
      await this.cargarClientes();
      await this.cargarMaquinaria();

      // Configurar listeners de cálculo
      this.configurarCalculoAutomatico();

    } catch (error) {
      console.error('Error abriendo modal:', error);
      this.mostrarError(error.message || 'Error al abrir modal');
    }
  },

  cerrar() {
    const modal = document.getElementById('modalCrearAlquiler');
    if (modal) modal.classList.remove('active');
    this.limpiarFormulario();
  },

  async cargarClientes() {
    try {
      const r = await fetch(this.apiClientes + '?accion=listar');
      const clientes = await r.json();
      
      const select = document.getElementById('alq_cliente');
      select.innerHTML = '<option value="">Seleccionar cliente...</option>';
      
      clientes.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = `${c.nombre} (${c.identificacion})`;
        select.appendChild(option);
      });

      // Cargar clientes
    } catch (error) {
      console.error('Error cargando clientes:', error);
      this.mostrarError('Error al cargar clientes');
    }
  },

  async cargarMaquinaria() {
    try {
      const r = await fetch(this.apiMaquinaria);
      const maq = await r.json();
      
      const select = document.getElementById('alq_maquinaria');
      select.innerHTML = '<option value="">Seleccionar maquinaria...</option>';
      
      // Backend ya filtró: WHERE activo = 1 AND estado = 'disponible'
      // No necesitamos filtrar nuevamente en frontend
      maq.forEach(m => {
        const option = document.createElement('option');
        option.value = m.id;
        option.dataset.tarifa = m.tarifa_alquiler;
        option.textContent = `${m.nombre} - $${parseFloat(m.tarifa_alquiler).toLocaleString('es-CO')} /día`;
        select.appendChild(option);
      });

      // Máquinas disponibles cargadas
    } catch (error) {
      console.error('Error cargando maquinaria:', error);
      this.mostrarError('Error al cargar maquinaria');
    }
  },

  configurarCalculoAutomatico() {
    const inicio = document.getElementById('alq_fecha_inicio');
    const fin = document.getElementById('alq_fecha_fin');
    const maquinaria = document.getElementById('alq_maquinaria');
    const monto = document.getElementById('alq_monto');

    const calcular = () => {
      const fechaInicio = inicio.value;
      const fechaFin = fin.value;
      const idMaq = maquinaria.value;

      if (!fechaInicio || !fechaFin || !idMaq) return;

      const d1 = new Date(fechaInicio);
      const d2 = new Date(fechaFin);
      const dias = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;

      if (dias < 1) {
        this.mostrarError('Fecha fin debe ser mayor que fecha inicio');
        monto.value = '';
        document.getElementById('montoAutomatico').style.display = 'none';
        return;
      }

      // Obtener tarifa - IMPORTANTE: usar el mismo nombre que devuelve el backend
      const opt = maquinaria.options[maquinaria.selectedIndex];
      const tarifa = parseFloat(opt.dataset.tarifa || 0);

      // Validar que tarifa sea válida
      if (isNaN(tarifa) || tarifa <= 0) {
        console.warn('⚠️ Tarifa inválida:', opt.dataset.tarifa, '- tarifa parseada:', tarifa);
        this.mostrarError('La maquinaria no tiene tarifa configurada');
        monto.value = '';
        document.getElementById('montoAutomatico').style.display = 'none';
        return;
      }

      this.tariffaCurrent = tarifa;
      const total = dias * tarifa;

      // Mostrar cálculo
      document.getElementById('montoAutomatico').style.display = 'block';
      document.getElementById('diasCount').textContent = dias;
      document.getElementById('tarifaDisplay').textContent = '$' + tarifa.toLocaleString('es-CO', { maximumFractionDigits: 2 });
      document.getElementById('totalDisplay').textContent = '$' + total.toLocaleString('es-CO', { maximumFractionDigits: 2 });

      // Establecer monto - aquí ya sabemos que total es válido
      monto.value = total.toFixed(2);
    };

    // Remover listeners anteriores
    inicio.removeEventListener('change', calcular);
    fin.removeEventListener('change', calcular);
    maquinaria.removeEventListener('change', calcular);

    // Agregar nuevos
    inicio.addEventListener('change', calcular);
    fin.addEventListener('change', calcular);
    maquinaria.addEventListener('change', calcular);
  },

  limpiarFormulario() {
    const form = document.getElementById('formCrearAlquiler');
    if (form) {
      form.querySelectorAll('input, select').forEach(el => {
        el.value = '';
      });
    }

    document.getElementById('montoAutomatico').style.display = 'none';
    
    const errorDiv = document.getElementById('alquilerError');
    if (errorDiv) {
      errorDiv.innerHTML = '';
      errorDiv.style.display = 'none';
    }

    const successDiv = document.getElementById('alquilerSuccess');
    if (successDiv) {
      successDiv.innerHTML = '';
      successDiv.style.display = 'none';
    }
  },

  configurarFormulario() {
    const form = document.getElementById('formCrearAlquiler');
    if (!form) return;

    if (!this.handleFormSubmit) {
      this.handleFormSubmit = (e) => {
        e.preventDefault();
        this.enviarDatos();
      };
    }

    form.removeEventListener('submit', this.handleFormSubmit);
    form.addEventListener('submit', this.handleFormSubmit);
  },

  async enviarDatos() {
    try {
      const idCliente = document.getElementById('alq_cliente').value;
      const idMaquinaria = document.getElementById('alq_maquinaria').value;
      const fechaInicio = document.getElementById('alq_fecha_inicio').value;
      const fechaFin = document.getElementById('alq_fecha_fin').value;
      const monto = parseFloat(document.getElementById('alq_monto').value);

      // Validaciones
      if (!idCliente) {
        this.mostrarError('Selecciona un cliente');
        return;
      }
      if (!idMaquinaria) {
        this.mostrarError('Selecciona una maquinaria');
        return;
      }
      if (!fechaInicio || !fechaFin) {
        this.mostrarError('Las fechas son requeridas');
        return;
      }
      if (isNaN(monto) || monto <= 0) {
        this.mostrarError('El monto debe ser mayor a 0');
        return;
      }

      const response = await fetch(this.API + '?accion=registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_cliente: parseInt(idCliente),
          id_maquinaria: parseInt(idMaquinaria),
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          monto: monto
        })
      });

      const resultado = await response.json();

      if (!resultado.ok) {
        throw new Error(resultado.mensaje || resultado.error || 'Error al crear alquiler');
      }

      this.mostrarExito('Alquiler creado exitosamente');

      setTimeout(() => {
        this.cerrar();
        if (window.cargarAlquileres) {
          cargarAlquileres();
        }
      }, 1500);

    } catch (error) {
      console.error('Error enviando datos:', error);
      this.mostrarError(error.message || 'Error al crear alquiler');
    }
  },

  mostrarError(mensaje) {
    const errorDiv = document.getElementById('alquilerError');
    if (errorDiv) {
      errorDiv.textContent = '❌ ' + mensaje;
      errorDiv.style.display = 'block';
    }
  },

  mostrarExito(mensaje) {
    const successDiv = document.getElementById('alquilerSuccess');
    if (successDiv) {
      successDiv.textContent = '✅ ' + mensaje;
      successDiv.style.display = 'block';
    }
  },

  init() {
    if (this.inicializado) {
      console.log('ℹ️ CrearAlquilerModal ya fue inicializado');
      return;
    }

    console.log('🔄 Inicializando CrearAlquilerModal...');
    this.configurarFormulario();
    this.inicializado = true;
    console.log('✅ CrearAlquilerModal inicializado');
  }
};

// Exponer globalmente
window.CrearAlquilerModal = CrearAlquilerModal;
console.log('📦 CrearAlquilerModal disponible globalmente');

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    CrearAlquilerModal.init();
  });
} else {
  CrearAlquilerModal.init();
}
