/* ============================================================
   editar-producto.js
   Modal para editar productos con carga de imágenes
============================================================ */

const EditarProductoModal = {
  API: 'http://localhost/Ferreteria_Jamarraya/backend/api/productos.php',
  productoActual: null,
  inicializado: false,  // Flag para evitar configuración múltiple
  handleChangeImage: null,  // Almacenar referencia del handler
  handleClickPreview: null,  // Almacenar referencia del handler
  handleFormSubmit: null,  // Almacenar referencia del handler

  async abrirConId(id) {
    try {
      // Limpiar cualquier dato anterior PRIMERO
      this.limpiarFormulario();
      
      // Mostrar modal vacío mientras se carga
      const modal = document.getElementById('modalEditarProducto');
      if (modal) modal.classList.add('active');
      
      // Cargar datos del producto
      const url = `${this.API}?accion=obtener&id=${id}`;
      const r = await fetch(url);
      
      if (!r.ok) {
        throw new Error('Error al cargar producto');
      }
      
      const producto = await r.json();
      
      if (!producto || !producto.id) {
        this.mostrarError('Producto no encontrado');
        return;
      }
      
      this.productoActual = producto;
      this.cargarDatosEnFormulario(producto);
      
    } catch (error) {
      console.error('Error abriendo modal:', error);
      this.mostrarError(error.message || 'Error al cargar el producto');
    }
  },

  cerrar() {
    document.getElementById('modalEditarProducto').classList.remove('active');
    this.limpiarFormulario();
    this.productoActual = null;
  },

  cargarDatosEnFormulario(producto) {
    
    // Verificar que todos los elementos existan
    const elementos = {
      id: document.getElementById('prod_edit_id'),
      codigo: document.getElementById('prod_edit_codigo'),
      nombre: document.getElementById('prod_edit_nombre'),
      descripcion: document.getElementById('prod_edit_descripcion'),
      categoria: document.getElementById('prod_edit_categoria'),
      precio: document.getElementById('prod_edit_precio'),
      stock: document.getElementById('prod_edit_stock'),
      stockMin: document.getElementById('prod_edit_stock_minimo'),
      preview: document.getElementById('prodEditPreview'),
      info: document.getElementById('productoInfo')
    };
    
    // Cargar datos
    if (elementos.id) elementos.id.value = producto.id;
    if (elementos.codigo) elementos.codigo.value = producto.codigo || '';
    if (elementos.nombre) elementos.nombre.value = producto.nombre || '';
    if (elementos.descripcion) elementos.descripcion.value = producto.descripcion || '';
    
    // Establecer categoría
    if (elementos.categoria) {
      elementos.categoria.value = producto.categoria || '';
    }
    
    if (elementos.precio) elementos.precio.value = producto.precio || '';
    if (elementos.stock) elementos.stock.value = producto.stock_actual || 0;
    if (elementos.stockMin) elementos.stockMin.value = producto.stock_minimo || 0;

    // Cargar imagen actual
    if (elementos.preview) {
      if (producto.img && producto.img !== 'nombreimagen.png') {
        const rutaImg = `http://localhost/Ferreteria_Jamarraya/assets/img/productos/${producto.img}`;
        elementos.preview.classList.remove('empty');
        elementos.preview.innerHTML = `<img src="${rutaImg}" alt="Producto" />`;
      } else {
        this.limpiarPreview();
      }
    }

    // Limpiar mensajes
    const errorDiv = document.getElementById('productoError');
    if (errorDiv) errorDiv.style.display = 'none';
    
    const successDiv = document.getElementById('productoSuccess');
    if (successDiv) successDiv.style.display = 'none';

    // Mostrar info del producto
    if (elementos.info) {
      elementos.info.innerHTML = `ID: ${producto.id} | Código: ${producto.codigo}`;
      elementos.info.style.display = 'block';
    }
    
    // Configurar botón toggle según estado activo
    const btnToggle = document.getElementById('btnToggleProd');
    const avisoDiv = document.getElementById('productoEstadoAviso');
    if (btnToggle && avisoDiv) {
      const activo = producto.activo === 1 || producto.activo === true;
      if (activo) {
        btnToggle.innerHTML = '🗑️ Desactivar Producto';
        avisoDiv.textContent = 'Desactivar este producto lo ocultará de los catálogos.';
        btnToggle.style.background = 'var(--red)';
      } else {
        btnToggle.innerHTML = '✅ Activar Producto';
        avisoDiv.textContent = 'Activar este producto lo mostrará nuevamente en los catálogos.';
        btnToggle.style.background = 'var(--green)';
      }
      btnToggle.style.display = 'block';
    }
    
    // Configurar carga de imagen DESPUÉS de cargar los datos
    this.configurarCargaImagen();
    
    // Configurar listeners del formulario
    this.configurarFormulario();
  },

  limpiarFormulario() {
    const form = document.getElementById('formEditarProducto');
    if (form) {
      // Resetear todos los inputs
      form.querySelectorAll('input, textarea, select').forEach(el => {
        if (el.type === 'text' || el.type === 'number') {
          el.value = '';
        } else if (el.type === 'file') {
          el.value = '';
        } else if (el.tagName === 'TEXTAREA') {
          el.value = '';
        } else if (el.tagName === 'SELECT') {
          el.selectedIndex = 0;
          el.value = '';
        }
      });
      
      // Limpiar el input del ID específicamente
      document.getElementById('prod_edit_id').value = '';
    }
    
    this.limpiarPreview();
    
    const errorDiv = document.getElementById('productoError');
    if (errorDiv) {
      errorDiv.innerHTML = '';
      errorDiv.style.display = 'none';
    }
    
    const successDiv = document.getElementById('productoSuccess');
    if (successDiv) {
      successDiv.innerHTML = '';
      successDiv.style.display = 'none';
    }
    
    const infoDiv = document.getElementById('productoInfo');
    if (infoDiv) {
      infoDiv.innerHTML = '';
      infoDiv.style.display = 'none';
    }
    
    console.log('✅ Formulario limpiado');
  },

  limpiarPreview() {
    const preview = document.getElementById('prodEditPreview');
    const input = document.getElementById('prodEditImgInput');
    
    if (preview) {
      preview.classList.add('empty');
      preview.innerHTML = '<span>📸 Click para cambiar imagen</span>';
    }
    
    if (input) {
      input.value = '';
    }
  },

  configurarCargaImagen() {
    const input = document.getElementById('prodEditImgInput');
    const preview = document.getElementById('prodEditPreview');

    if (!input || !preview) {
      console.warn('⚠️ Elementos de imagen no encontrados');
      return;
    }

    // Remover listeners anteriores
    input.removeEventListener('change', this.handleChangeImage);
    preview.removeEventListener('click', this.handleClickPreview);

    // Siempre regenerar handlers (no solo la primera vez)
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

      const reader = new FileReader();
      reader.onload = (event) => {
        preview.classList.remove('empty');
        preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
        document.getElementById('productoError').style.display = 'none';
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
    const form = document.getElementById('formEditarProducto');
    if (!form) return;

    // Crear handler si no existe
    if (!this.handleFormSubmit) {
      this.handleFormSubmit = (e) => {
        e.preventDefault();
        this.enviarDatos();
      };
    }

    // Remover listener anterior para evitar duplicados
    form.removeEventListener('submit', this.handleFormSubmit);

    // Agregar nuevo listener
    form.addEventListener('submit', this.handleFormSubmit);
  },

  async enviarDatos() {
    try {
      const id = document.getElementById('prod_edit_id').value;
      
      if (!id) {
        this.mostrarError('Error: ID de producto no válido');
        return;
      }

      // Validaciones básicas
      const codigo = document.getElementById('prod_edit_codigo').value.trim();
      const nombre = document.getElementById('prod_edit_nombre').value.trim();
      const categoria = document.getElementById('prod_edit_categoria').value;
      const precio = parseFloat(document.getElementById('prod_edit_precio').value);

      if (!codigo) {
        this.mostrarError('El código es requerido');
        return;
      }

      if (!nombre) {
        this.mostrarError('El nombre es requerido');
        return;
      }

      if (!categoria) {
        this.mostrarError('La categoría es requerida');
        return;
      }

      if (isNaN(precio) || precio < 0) {
        this.mostrarError('El precio debe ser un número positivo');
        return;
      }

      // Construir FormData
      const formData = new FormData();
      formData.append('accion', 'editar');
      formData.append('id', id);
      formData.append('codigo', codigo);
      formData.append('nombre', nombre);
      formData.append('descripcion', document.getElementById('prod_edit_descripcion').value.trim());
      formData.append('categoria', categoria);
      formData.append('precio', precio);
      formData.append('stock_actual', parseInt(document.getElementById('prod_edit_stock').value) || 0);
      formData.append('stock_minimo', parseInt(document.getElementById('prod_edit_stock_minimo').value) || 0);

      // Agregar imagen si se seleccionó una nueva
      const inputImg = document.getElementById('prodEditImgInput');
      if (inputImg.files.length > 0) {
        formData.append('imagen', inputImg.files[0]);
      }

      // Enviar al servidor
      const response = await fetch(this.API, {
        method: 'POST',
        body: formData
      });

      const resultado = await response.json();

      if (!resultado.ok) {
        throw new Error(resultado.mensaje || resultado.error || 'Error al actualizar producto');
      }

      // Mostrar éxito
      this.mostrarExito('Producto actualizado correctamente');
      
      // Recargar inventario tras 1.5 segundos
      setTimeout(() => {
        this.cerrar();
        if (window.cargarInventario) {
          cargarInventario();
        }
      }, 1500);

    } catch (error) {
      console.error('Error enviando datos:', error);
      this.mostrarError(error.message || 'Error al actualizar producto');
    }
  },

  mostrarError(mensaje) {
    const errorDiv = document.getElementById('productoError');
    if (errorDiv) {
      errorDiv.textContent = '❌ ' + mensaje;
      errorDiv.style.display = 'block';
    }
    document.getElementById('productoSuccess').style.display = 'none';
  },

  mostrarExito(mensaje) {
    const successDiv = document.getElementById('productoSuccess');
    if (successDiv) {
      successDiv.textContent = '✅ ' + mensaje;
      successDiv.style.display = 'block';
    }
    document.getElementById('productoError').style.display = 'none';
  },

  async toggleEstado() {
    if (!this.productoActual || !this.productoActual.id) {
      this.mostrarError('ID de producto no válido');
      return;
    }

    const actualmente_activo = this.productoActual.activo === 1 || this.productoActual.activo === true;
    const accion = actualmente_activo ? 'desactivar' : 'activar';
    const mensajeConfirm = actualmente_activo
      ? `¿Desactivar "${this.productoActual.nombre}"?\n\nNo aparecerá en catálogos.`
      : `¿Activar "${this.productoActual.nombre}"?\n\nAparecerá nuevamente en catálogos.`;

    const confirmacion = confirm(mensajeConfirm);
    if (!confirmacion) return;

    try {
      const formData = new FormData();
      formData.append('accion', 'cambiar_estado');
      formData.append('id', this.productoActual.id);
      formData.append('activo', actualmente_activo ? 0 : 1);

      const response = await fetch(this.API, {
        method: 'POST',
        body: formData
      });

      const resultado = await response.json();

      if (!resultado.ok) {
        throw new Error(resultado.error || `Error al ${accion} producto`);
      }

      const mensajeExito = actualmente_activo
        ? 'Producto desactivado correctamente'
        : 'Producto activado correctamente';
      
      this.mostrarExito(mensajeExito);

      setTimeout(() => {
        this.cerrar();
        // Recargar lista de inventario
        if (window.cargarInventario) {
          cargarInventario();
        }
      }, 1500);

    } catch (error) {
      console.error(`Error ${accion} producto:`, error);
      this.mostrarError(error.message || `Error al ${accion} producto`);
    }
  },

  formatearFecha(fechaStr) {
    try {
      const fecha = new Date(fechaStr);
      return fecha.toLocaleDateString('es-CO', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch {
      return '—';
    }
  },

  init() {
    // Evitar múltiples inicializaciones
    if (this.inicializado) {
      console.log('ℹ️ EditarProductoModal ya fue inicializado');
      return;
    }
    
    console.log('🔄 Inicializando EditarProductoModal...');
    
    // Intentar configurar con reintentos si los elementos aún no existen
    const intentarConfigurar = (reintentos = 0) => {
      try {
        const form = document.getElementById('formEditarProducto');
        const imgInput = document.getElementById('prodEditImgInput');
        
        if (!form || !imgInput) {
          if (reintentos < 5) {
            setTimeout(() => intentarConfigurar(reintentos + 1), 100);
          } else {
            console.warn('⚠️ No se encontraron elementos del formulario tras 5 intentos');
          }
          return;
        }
        
        this.configurarFormulario();
        this.configurarCargaImagen();
        this.inicializado = true;
        console.log('✅ EditarProductoModal inicializado exitosamente');
      } catch (e) {
        console.error('❌ Error inicializando EditarProductoModal:', e);
      }
    };
    
    intentarConfigurar();
  }
};

// Exponer globalmente
window.EditarProductoModal = EditarProductoModal;
console.log('📦 EditarProductoModal disponible globalmente');

// Helper para reinicializar si es necesario
window.reinicializarEditarProductoModal = () => {
  console.log('🔄 Reinicializando EditarProductoModal...');
  if (window.EditarProductoModal) {
    window.EditarProductoModal.init();
  }
};

// Inicializar cuando el DOM esté listo o inmediatamente si ya lo está
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded: inicializando EditarProductoModal');
    EditarProductoModal.init();
  });
} else {
  // El DOM ya está listo, inicializar inmediatamente
  console.log('DOM ya listo: inicializando EditarProductoModal inmediatamente');
  EditarProductoModal.init();
}
