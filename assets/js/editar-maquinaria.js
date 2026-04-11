/* ============================================================
   editar-maquinaria.js
   Modal para editar maquinaria para alquiler
============================================================ */

const EditarMaquinariaModal = {
  API: 'http://localhost/Ferreteria_Jamarraya/backend/api/maquinaria.php',
  maquinariaActual: null,
  inicializado: false,
  imagenSeleccionada: null,
  handleChangeImage: null,
  handleClickPreview: null,
  handleFormSubmit: null,

  async abrirConId(id) {
    try {
      console.log('📂 Abriendo modal para editar maquinaria:', id);
      
      this.limpiarFormulario();
      
      // Mostrar modal vacío mientras se carga
      const modal = document.getElementById('modalEditarMaquinaria');
      if (modal) modal.classList.add('active');
      
      // Cargar datos de la maquinaria
      const url = `${this.API}?accion=obtener&id=${id}`;
      const r = await fetch(url);
      
      if (!r.ok) {
        throw new Error('Error al cargar maquinaria');
      }
      
      const maquinaria = await r.json();
      console.log('✅ Datos de maquinaria recibidos:', maquinaria);
      
      if (!maquinaria || !maquinaria.id) {
        this.mostrarError('Maquinaria no encontrada');
        return;
      }
      
      this.maquinariaActual = maquinaria;
      this.cargarDatosEnFormulario(maquinaria);
      
    } catch (error) {
      console.error('Error abriendo modal:', error);
      this.mostrarError(error.message || 'Error al cargar la maquinaria');
    }
  },

  cerrar() {
    const modal = document.getElementById('modalEditarMaquinaria');
    if (modal) modal.classList.remove('active');
    this.limpiarFormulario();
    this.maquinariaActual = null;
  },

  limpiarFormulario() {
    const form = document.getElementById('formEditarMaquinaria');
    if (form) {
      form.querySelectorAll('input[type="text"], input[type="number"], textarea, input[type="hidden"]').forEach(el => {
        el.value = '';
      });
    }
    
    this.imagenSeleccionada = null;
    const preview = document.getElementById('maqEditPreview');
    if (preview) {
      preview.classList.add('empty');
      preview.innerHTML = '<span>📸 Click para cambiar imagen</span>';
    }
    
    const errorDiv = document.getElementById('maquinariaEditError');
    if (errorDiv) {
      errorDiv.innerHTML = '';
      errorDiv.style.display = 'none';
    }

    const successDiv = document.getElementById('maquinariaEditSuccess');
    if (successDiv) {
      successDiv.innerHTML = '';
      successDiv.style.display = 'none';
    }

    const infoDiv = document.getElementById('maquinariaInfo');
    if (infoDiv) {
      infoDiv.innerHTML = '';
      infoDiv.style.display = 'none';
    }
  },

  cargarDatosEnFormulario(maquinaria) {
    // Cargar ID y datos básicos
    document.getElementById('maq_edit_id').value = maquinaria.id;
    document.getElementById('maq_edit_nombre').value = maquinaria.nombre || '';
    document.getElementById('maq_edit_descripcion').value = maquinaria.descripcion || '';
    document.getElementById('maq_edit_tarifa').value = maquinaria.tarifa_alquiler || '';

    // Cargar imagen actual
    const preview = document.getElementById('maqEditPreview');
    if (maquinaria.img && maquinaria.img !== 'default.png') {
      const rutaImg = `http://localhost/Ferreteria_Jamarraya/assets/img/maquinaria/${maquinaria.img}`;
      preview.classList.remove('empty');
      preview.innerHTML = `<img src="${rutaImg}" alt="Maquinaria" />`;
    }

    // Mostrar info
    const infoDiv = document.getElementById('maquinariaInfo');
    if (infoDiv) {
      infoDiv.innerHTML = `ID: ${maquinaria.id} | Estado: ${maquinaria.estado}`;
      infoDiv.style.display = 'block';
    }

    // Configurar botón toggle según estado activo
    const btnToggle = document.getElementById('btnToggleMaq');
    const avisoDiv = document.getElementById('maquinariaEstadoAviso');
    if (btnToggle && avisoDiv) {
      const activa = maquinaria.activo === 1 || maquinaria.activo === '1';
      if (activa) {
        btnToggle.innerHTML = '🗑️ Desactivar Maquinaria';
        avisoDiv.textContent = 'Desactivar esta maquinaria la ocultará de los listados y no podrá ser alquilada.';
        btnToggle.style.background = 'var(--red)';
      } else {
        btnToggle.innerHTML = '✅ Activar Maquinaria';
        avisoDiv.textContent = 'Activar esta maquinaria la mostrará nuevamente en los listados y podrá ser alquilada.';
        btnToggle.style.background = 'var(--green)';
      }
      btnToggle.style.display = 'block';
    }

    // Configurar carga de imagen
    this.configurarCargaImagen();
    
    // Configurar listeners del formulario
    this.configurarFormulario();
  },

  configurarCargaImagen() {
    const input = document.getElementById('maqEditImgInput');
    const preview = document.getElementById('maqEditPreview');

    if (!input || !preview) {
      console.warn('⚠️ Elementos de imagen no encontrados');
      return;
    }

    // Remover listeners anteriores
    input.removeEventListener('change', this.handleChangeImage);
    preview.removeEventListener('click', this.handleClickPreview);

    // Siempre regenerar handlers
    this.handleChangeImage = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        this.mostrarError('La imagen no debe exceder 5MB');
        input.value = '';
        return;
      }

      if (!file.type.startsWith('image/')) {
        this.mostrarError('El archivo debe ser una imagen');
        input.value = '';
        return;
      }

      this.imagenSeleccionada = file;
      const reader = new FileReader();
      reader.onload = (event) => {
        preview.classList.remove('empty');
        preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
        document.getElementById('maquinariaEditError').style.display = 'none';
      };
      reader.readAsDataURL(file);
    };

    this.handleClickPreview = () => {
      input.click();
    };

    // Agregar nuevos listeners
    input.addEventListener('change', this.handleChangeImage);
    preview.addEventListener('click', this.handleClickPreview);
  },

  configurarFormulario() {
    const form = document.getElementById('formEditarMaquinaria');
    if (!form) return;

    if (this.handleFormSubmit) {
      form.removeEventListener('submit', this.handleFormSubmit);
    }

    this.handleFormSubmit = (e) => {
      e.preventDefault();
      this.enviarDatos();
    };

    form.addEventListener('submit', this.handleFormSubmit);
  },

  async enviarDatos() {
    try {
      const id = document.getElementById('maq_edit_id').value;
      const nombre = document.getElementById('maq_edit_nombre').value.trim();
      const descripcion = document.getElementById('maq_edit_descripcion').value.trim();
      const tarifa = parseFloat(document.getElementById('maq_edit_tarifa').value);

      // Validaciones
      if (!id) {
        this.mostrarError('ID de maquinaria no válido');
        return;
      }
      if (!nombre) {
        this.mostrarError('El nombre es requerido');
        return;
      }
      if (isNaN(tarifa) || tarifa <= 0) {
        this.mostrarError('La tarifa debe ser mayor a 0');
        return;
      }

      console.log('💾 Enviando cambios de maquinaria...');

      // Crear FormData para multipart
      const formData = new FormData();
      formData.append('accion', 'editar');
      formData.append('id', id);
      formData.append('nombre', nombre);
      formData.append('descripcion', descripcion);
      formData.append('tarifa_alquiler', tarifa);
      
      // Si hay imagen seleccionada, agregarla
      if (this.imagenSeleccionada) {
        formData.append('img', this.imagenSeleccionada);
      }

      const response = await fetch(this.API, {
        method: 'POST',
        body: formData
      });

      const resultado = await response.json();

      if (!resultado.ok) {
        throw new Error(resultado.error || 'Error al editar maquinaria');
      }

      this.mostrarExito('Maquinaria actualizada exitosamente');

      setTimeout(() => {
        this.cerrar();
        // Recargar lista de maquinaria si existe
        if (window.cargarMaquinaria) {
          cargarMaquinaria();
        }
      }, 1500);

    } catch (error) {
      console.error('Error enviando datos:', error);
      this.mostrarError(error.message || 'Error al editar maquinaria');
    }
  },

  mostrarError(mensaje) {
    const errorDiv = document.getElementById('maquinariaEditError');
    if (errorDiv) {
      errorDiv.textContent = '❌ ' + mensaje;
      errorDiv.style.display = 'block';
    }
  },

  mostrarExito(mensaje) {
    const successDiv = document.getElementById('maquinariaEditSuccess');
    if (successDiv) {
      successDiv.textContent = '✅ ' + mensaje;
      successDiv.style.display = 'block';
    }
  },

  async toggleEstado() {
    if (!this.maquinariaActual || !this.maquinariaActual.id) {
      this.mostrarError('ID de maquinaria no válido');
      return;
    }

    const actualmente_activa = this.maquinariaActual.activo === 1 || this.maquinariaActual.activo === '1';
    const accion = actualmente_activa ? 'desactivar' : 'activar';
    const mensajeConfirm = actualmente_activa
      ? `¿Desactivar "${this.maquinariaActual.nombre}"?\n\nNo aparecerá en listados y no podrá ser alquilada.`
      : `¿Activar "${this.maquinariaActual.nombre}"?\n\nAparecerá nuevamente en listados y podrá ser alquilada.`;

    const confirmacion = confirm(mensajeConfirm);
    if (!confirmacion) return;

    try {
      console.log(`🔄 ${accion === 'desactivar' ? 'Desactivando' : 'Activando'} maquinaria:`, this.maquinariaActual.id);

      const formData = new FormData();
      formData.append('accion', 'cambiar_estado');
      formData.append('id', this.maquinariaActual.id);
      formData.append('activo', actualmente_activa ? 0 : 1);

      const response = await fetch(this.API, {
        method: 'POST',
        body: formData
      });

      const resultado = await response.json();

      if (!resultado.ok) {
        throw new Error(resultado.error || `Error al ${accion} maquinaria`);
      }

      const mensajeExito = actualmente_activa
        ? 'Maquinaria desactivada correctamente'
        : 'Maquinaria activada correctamente';
      
      this.mostrarExito(mensajeExito);

      setTimeout(() => {
        this.cerrar();
        // Recargar lista de maquinaria
        if (window.cargarMaquinaria) {
          cargarMaquinaria();
        }
      }, 1500);

    } catch (error) {
      console.error(`Error ${accion} maquinaria:`, error);
      this.mostrarError(error.message || `Error al ${accion} maquinaria`);
    }
  },

  init() {
    if (this.inicializado) {
      console.log('ℹ️ EditarMaquinariaModal ya fue inicializado');
      return;
    }

    console.log('🔄 Inicializando EditarMaquinariaModal...');
    this.configurarFormulario();
    this.inicializado = true;
    console.log('✅ EditarMaquinariaModal inicializado');
  }
};

// Exponer globalmente
window.EditarMaquinariaModal = EditarMaquinariaModal;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    EditarMaquinariaModal.init();
  });
} else {
  EditarMaquinariaModal.init();
}
