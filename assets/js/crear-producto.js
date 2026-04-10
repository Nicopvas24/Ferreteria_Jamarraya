/* ============================================================
   crear-producto.js
   Modal para crear productos con carga de imágenes
============================================================ */

const ProductoModal = {
  API: 'http://localhost/Ferreteria_Jamarraya/backend/api/productos.php',

  abrir() {
    document.getElementById('modalCrearProducto').classList.add('active');
    this.limpiarFormulario();
  },

  cerrar() {
    document.getElementById('modalCrearProducto').classList.remove('active');
    this.limpiarFormulario();
  },

  limpiarFormulario() {
    const form = document.getElementById('formCrearProducto');
    if (form) {
      // Limpiar solo los inputs de texto, NO el file input
      form.querySelectorAll('input[type="text"], input[type="number"], textarea, select').forEach(el => {
        if (el.type === 'text' || el.type === 'number') el.value = '';
        if (el.tagName === 'TEXTAREA') el.value = '';
        if (el.tagName === 'SELECT') el.selectedIndex = 0;
      });
    }
    
    document.getElementById('productoError').style.display = 'none';
    
    const preview = document.getElementById('prodPreview');
    if (preview) {
      preview.classList.add('empty');
      preview.innerHTML = '<span>📸 Click para subir imagen</span>';
    }
  },

  configurarCargaImagen() {
    const input = document.getElementById('prodImgInput');
    const preview = document.getElementById('prodPreview');

    if (!input || !preview) {
      console.warn('⚠️ Elementos de imagen no encontrados');
      return;
    }

    input.addEventListener('change', (e) => {
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
    });

    preview.addEventListener('click', () => {
      input.click();
    });
  },

  mostrarError(mensaje) {
    const errorDiv = document.getElementById('productoError');
    if (errorDiv) {
      errorDiv.textContent = mensaje;
      errorDiv.style.display = 'block';
    }
  },

  validarFormulario() {
    const codigo = (document.getElementById('prod_codigo').value || '').trim();
    const nombre = (document.getElementById('prod_nombre').value || '').trim();
    const categoria = (document.getElementById('prod_categoria').value || '').trim();
    const precio = parseFloat(document.getElementById('prod_precio').value || 0);
    const stock = parseInt(document.getElementById('prod_stock').value || 0);
    const stockMin = parseInt(document.getElementById('prod_stock_minimo').value || 0);

    if (!codigo || codigo.length > 50) {
      this.mostrarError('Código inválido (1-50 caracteres)');
      return false;
    }
    if (!nombre || nombre.length > 150) {
      this.mostrarError('Nombre inválido (1-150 caracteres)');
      return false;
    }
    if (!categoria) {
      this.mostrarError('Categoría requerida');
      return false;
    }
    if (isNaN(precio) || precio < 0) {
      this.mostrarError('Precio debe ser válido y positivo');
      return false;
    }
    if (isNaN(stock) || stock < 0 || isNaN(stockMin) || stockMin < 0) {
      this.mostrarError('Stock debe ser válido y positivo');
      return false;
    }

    return true;
  },

  async enviar(e) {
    e.preventDefault();
    e.stopPropagation();
    
    document.getElementById('productoError').style.display = 'none';

    if (!this.validarFormulario()) {
      return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    if (!btn) {
      return;
    }

    const btnTexto = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Creando...';

    try {
      const formData = new FormData();
      formData.append('accion', 'crear');
      formData.append('codigo', document.getElementById('prod_codigo').value.trim());
      formData.append('nombre', document.getElementById('prod_nombre').value.trim());
      formData.append('descripcion', document.getElementById('prod_descripcion').value.trim() || '');
      formData.append('categoria', document.getElementById('prod_categoria').value.trim());
      formData.append('precio', document.getElementById('prod_precio').value);
      formData.append('stock_actual', document.getElementById('prod_stock').value);
      formData.append('stock_minimo', document.getElementById('prod_stock_minimo').value);

      const imgInput = document.getElementById('prodImgInput');
      if (imgInput && imgInput.files && imgInput.files.length > 0) {
        formData.append('imagen', imgInput.files[0]);
      }

      const r = await fetch(this.API, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await r.json();

      if (!r.ok || !data.ok) {
        const msg = data.error || data.mensaje || 'Error desconocido';
        this.mostrarError(msg);
        return;
      }

      this.cerrar();
      
      if (window.cargarInventario) {
        await window.cargarInventario();
      }

      alert('✅ Producto creado exitosamente');

    } catch (e) {
      console.error('❌ Error:', e.message);
      this.mostrarError('Error de conexión: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = btnTexto;
    }
  },

  init() {
    console.log('✓ ProductoModal inicializado');
    
    this.configurarCargaImagen();
    
    const form = document.getElementById('formCrearProducto');
    if (!form) return;

    form.addEventListener('submit', (e) => this.enviar(e));
  }
};
