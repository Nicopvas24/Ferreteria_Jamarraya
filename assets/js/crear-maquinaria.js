/* ============================================================
   crear-maquinaria.js
   Modal para crear nova maquinaria para alquiler
============================================================ */

const CrearMaquinariaModal = {
  API: 'http://localhost/Ferreteria_Jamarraya/backend/api/maquinaria.php',
  inicializado: false,
  imagenSeleccionada: null,

  abrir() {
    try {
      console.log('📂 Abriendo modal para crear maquinaria');
      this.limpiarFormulario();
      
      // Mostrar modal
      const modal = document.getElementById('modalCrearMaquinaria');
      if (modal) modal.classList.add('active');

    } catch (error) {
      console.error('Error abriendo modal:', error);
      this.mostrarError(error.message || 'Error al abrir modal');
    }
  },

  cerrar() {
    const modal = document.getElementById('modalCrearMaquinaria');
    if (modal) modal.classList.remove('active');
    this.limpiarFormulario();
  },

  limpiarFormulario() {
    const form = document.getElementById('formCrearMaquinaria');
    if (form) {
      form.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(el => {
        el.value = '';
      });
      // No limpiar el file input
    }
    
    this.imagenSeleccionada = null;
    const preview = document.getElementById('maqPreview');
    if (preview) {
      preview.classList.add('empty');
      preview.innerHTML = '<span>📸 Click para subir imagen</span>';
    }
    
    const errorDiv = document.getElementById('maquinariaError');
    if (errorDiv) {
      errorDiv.innerHTML = '';
      errorDiv.style.display = 'none';
    }

    const successDiv = document.getElementById('maquinariaSuccess');
    if (successDiv) {
      successDiv.innerHTML = '';
      successDiv.style.display = 'none';
    }
  },

  configurarCargaImagen() {
    const input = document.getElementById('maqImgInput');
    const preview = document.getElementById('maqPreview');

    if (!input || !preview) {
      console.warn('⚠️ Elementos de imagen no encontrados');
      return;
    }

    // Remover listeners anteriores
    input.removeEventListener('change', this.handleChangeImage);
    preview.removeEventListener('click', this.handleClickPreview);

    // Definir o actualizar handlers
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
        document.getElementById('maquinariaError').style.display = 'none';
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
    const form = document.getElementById('formCrearMaquinaria');
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
      const nombre = document.getElementById('maq_nombre').value.trim();
      const descripcion = document.getElementById('maq_descripcion').value.trim();
      const tarifa = parseFloat(document.getElementById('maq_tarifa').value);

      // Validaciones
      if (!nombre) {
        this.mostrarError('El nombre es requerido');
        return;
      }
      if (isNaN(tarifa) || tarifa <= 0) {
        this.mostrarError('La tarifa debe ser mayor a 0');
        return;
      }

      console.log('💾 Enviando datos de maquinaria...');

      // Crear FormData para multipart
      const formData = new FormData();
      formData.append('accion', 'registrar');
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
        throw new Error(resultado.error || 'Error al crear maquinaria');
      }

      this.mostrarExito('Maquinaria creada exitosamente');

      setTimeout(() => {
        this.cerrar();
        // Recargar lista de maquinaria si existe
        if (window.cargarMaquinaria) {
          cargarMaquinaria();
        }
      }, 1500);

    } catch (error) {
      console.error('Error enviando datos:', error);
      this.mostrarError(error.message || 'Error al crear maquinaria');
    }
  },

  mostrarError(mensaje) {
    const errorDiv = document.getElementById('maquinariaError');
    if (errorDiv) {
      errorDiv.textContent = '❌ ' + mensaje;
      errorDiv.style.display = 'block';
    }
  },

  mostrarExito(mensaje) {
    const successDiv = document.getElementById('maquinariaSuccess');
    if (successDiv) {
      successDiv.textContent = '✅ ' + mensaje;
      successDiv.style.display = 'block';
    }
  },

  init() {
    if (this.inicializado) {
      console.log('ℹ️ CrearMaquinariaModal ya fue inicializado');
      return;
    }

    console.log('🔄 Inicializando CrearMaquinariaModal...');
    this.configurarCargaImagen();
    this.configurarFormulario();
    this.inicializado = true;
    console.log('✅ CrearMaquinariaModal inicializado');
  }
};

// Exponer globalmente
window.CrearMaquinariaModal = CrearMaquinariaModal;
console.log('📦 CrearMaquinariaModal disponible globalmente');

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    CrearMaquinariaModal.init();
  });
} else {
  CrearMaquinariaModal.init();
}
