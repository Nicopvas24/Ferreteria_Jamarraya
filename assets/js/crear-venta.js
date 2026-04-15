/* ============================================================
   crear-venta.js
   Modal para crear nueva venta con búsqueda de productos
============================================================ */

const CrearVentaModal = {
  API: 'http://localhost/Ferreteria_Jamarraya/backend/api/ventas.php',
  apiClientes: 'http://localhost/Ferreteria_Jamarraya/backend/api/clientes.php',
  apiProductos: 'http://localhost/Ferreteria_Jamarraya/backend/api/productos.php',
  
  // Estado
  productos: [],
  carrito: [], // [{id_producto, nombre, codigo, cantidad, precio_unitario, subtotal}]
  inicializado: false,

  // ══════════════════════════════════════════════════════════════
  // ABRIR/CERRAR MODAL
  // ══════════════════════════════════════════════════════════════

  async abrir() {
    try {
      this.limpiarFormulario();
      
      // Mostrar modal
      const modal = document.getElementById('modalCrearVenta');
      if (modal) modal.classList.add('active');

      // Cargar datos
      await this.cargarClientes();
      await this.cargarProductos();

      // Configurar búsqueda
      this.configurarBusquedaProductos();

    } catch (error) {
      console.error('Error abriendo modal:', error);
      this.mostrarError(error.message || 'Error al abrir modal');
    }
  },

  cerrar() {
    const modal = document.getElementById('modalCrearVenta');
    if (modal) modal.classList.remove('active');
    this.limpiarFormulario();
  },

  // ══════════════════════════════════════════════════════════════
  // CARGAR DATOS
  // ══════════════════════════════════════════════════════════════

  async cargarClientes() {
    try {
      const r = await fetch(this.apiClientes + '?accion=listar');
      const clientes = await r.json();
      
      const select = document.getElementById('vta_cliente');
      select.innerHTML = '<option value="">Seleccionar cliente...</option>';
      
      clientes.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = `${c.nombre} (${c.identificacion})`;
        select.appendChild(option);
      });

    } catch (error) {
      console.error('Error cargando clientes:', error);
      this.mostrarError('Error al cargar clientes');
    }
  },

  async cargarProductos() {
    try {
      const r = await fetch(this.apiProductos + '?accion=listar&solo_activos=true');
      const prods = await r.json();
      
      // Filtrar solo productos con stock disponible
      this.productos = prods.filter(p => p.stock_actual > 0);

    } catch (error) {
      console.error('Error cargando productos:', error);
      this.mostrarError('Error al cargar productos');
    }
  },

  // ══════════════════════════════════════════════════════════════
  // BÚSQUEDA DE PRODUCTOS
  // ══════════════════════════════════════════════════════════════

  configurarBusquedaProductos() {
    const input = document.getElementById('vta_producto_search');
    const resultsDiv = document.getElementById('vta_producto_results');

    if (!this.handleSearchChange) {
      this.handleSearchChange = (e) => {
        const query = e.target.value.toLowerCase().trim();

        if (query.length === 0) {
          resultsDiv.classList.remove('active');
          resultsDiv.innerHTML = '';
          return;
        }

        // Buscar en código o nombre
        const filtrados = this.productos.filter(p => 
          p.codigo.toLowerCase().includes(query) ||
          p.nombre.toLowerCase().includes(query)
        );

        if (filtrados.length === 0) {
          resultsDiv.innerHTML = '<div class="producto-item" style="color: var(--text-muted);">No hay resultados</div>';
          resultsDiv.classList.add('active');
          return;
        }

        resultsDiv.innerHTML = '';
        filtrados.forEach(p => {
          const div = document.createElement('div');
          div.className = 'producto-item';
          div.innerHTML = `
            <div class="producto-item-nombre">${p.nombre}</div>
            <div class="producto-item-info">Código: ${p.codigo} | Stock: ${p.stock_actual} | $${parseFloat(p.precio).toLocaleString('es-CO')}</div>
          `;
          div.addEventListener('click', () => this.agregarProducto(p));
          resultsDiv.appendChild(div);
        });

        resultsDiv.classList.add('active');
      };
    }

    input.removeEventListener('input', this.handleSearchChange);
    input.addEventListener('input', this.handleSearchChange);

    // Cerrar resultados al hacer click fuera
    if (!this.handleClickOutside) {
      this.handleClickOutside = (e) => {
        if (!input.contains(e.target) && !resultsDiv.contains(e.target)) {
          resultsDiv.classList.remove('active');
        }
      };
    }

    document.removeEventListener('click', this.handleClickOutside);
    document.addEventListener('click', this.handleClickOutside);
  },

  // ══════════════════════════════════════════════════════════════
  // GESTIÓN DEL CARRITO
  // ══════════════════════════════════════════════════════════════

  agregarProducto(producto) {
    // Validar stock
    if (producto.stock_actual <= 0) {
      this.mostrarError('Producto sin stock disponible');
      return;
    }

    // Verificar si ya está en el carrito
    const existente = this.carrito.find(p => p.id_producto === producto.id);
    
    if (existente) {
      // Validar que no exceda el stock
      if (existente.cantidad >= producto.stock_actual) {
        this.mostrarError(`No hay stock suficiente. Disponible: ${producto.stock_actual}`);
        return;
      }
      existente.cantidad += 1;
      existente.subtotal = existente.cantidad * existente.precio_unitario;
    } else {
      // Agregar nuevo producto
      this.carrito.push({
        id_producto: producto.id,
        nombre: producto.nombre,
        codigo: producto.codigo,
        cantidad: 1,
        precio_unitario: parseFloat(producto.precio),
        stock_disponible: parseInt(producto.stock_actual)
      });
    }

    // Actualizar visualización
    this.actualizarCarrito();

    // Limpiar búsqueda
    document.getElementById('vta_producto_search').value = '';
    document.getElementById('vta_producto_results').classList.remove('active');
  },

  actualizarCarrito() {
    const carritoDiv = document.getElementById('vta_carrito');

    if (this.carrito.length === 0) {
      carritoDiv.innerHTML = '<div class="carrito-vacio">No hay productos agregados. Busca y agrega productos.</div>';
      this.actualizarTotales();
      return;
    }

    let html = '';
    this.carrito.forEach((item, idx) => {
      const subtotal = item.cantidad * item.precio_unitario;
      html += `
        <div class="carrito-item">
          <div class="carrito-item-code">${item.codigo}</div>
          <div class="carrito-item-nombre">${item.nombre}</div>
          <div class="carrito-item-qty">
            <button type="button" class="qty-btn" onclick="CrearVentaModal.decrementarCantidad(${idx})">−</button>
            <input type="number" class="qty-input" value="${item.cantidad}" 
                   onchange="CrearVentaModal.cambiarCantidad(${idx}, this.value)"/>
            <button type="button" class="qty-btn" onclick="CrearVentaModal.incrementarCantidad(${idx})">+</button>
          </div>
          <div class="carrito-item-price">$${subtotal.toLocaleString('es-CO', {maximumFractionDigits: 2})}</div>
          <button type="button" class="carrito-item-remove" onclick="CrearVentaModal.removerProducto(${idx})">✕</button>
        </div>
      `;
    });

    carritoDiv.innerHTML = html;
    this.actualizarTotales();
  },

  incrementarCantidad(idx) {
    const item = this.carrito[idx];
    if (item.cantidad < item.stock_disponible) {
      item.cantidad += 1;
      this.actualizarCarrito();
    } else {
      this.mostrarError(`Stock máximo disponible: ${item.stock_disponible}`);
    }
  },

  decrementarCantidad(idx) {
    const item = this.carrito[idx];
    if (item.cantidad > 1) {
      item.cantidad -= 1;
      this.actualizarCarrito();
    }
  },

  cambiarCantidad(idx, nuevaCantidad) {
    const cant = parseInt(nuevaCantidad) || 0;
    const item = this.carrito[idx];

    if (cant < 1) {
      this.removerProducto(idx);
      return;
    }

    if (cant > item.stock_disponible) {
      this.mostrarError(`Stock máximo disponible: ${item.stock_disponible}`);
      this.actualizarCarrito();
      return;
    }

    item.cantidad = cant;
    this.actualizarCarrito();
  },

  removerProducto(idx) {
    this.carrito.splice(idx, 1);
    this.actualizarCarrito();
  },

  // ══════════════════════════════════════════════════════════════
  // CÁLCULOS Y TOTALES
  // ══════════════════════════════════════════════════════════════

  actualizarTotales() {
    const subtotal = this.carrito.reduce((sum, item) => 
      sum + (item.cantidad * item.precio_unitario), 0
    );
    
    const impuestos = 0; // Por ahora sin impuestos
    const total = subtotal + impuestos;

    document.getElementById('vta_subtotal').textContent = 
      '$' + subtotal.toLocaleString('es-CO', {maximumFractionDigits: 2});
    document.getElementById('vta_impuestos').textContent = 
      '$' + impuestos.toLocaleString('es-CO', {maximumFractionDigits: 2});
    document.getElementById('vta_total').textContent = 
      '$' + total.toLocaleString('es-CO', {maximumFractionDigits: 2});
  },

  // ══════════════════════════════════════════════════════════════
  // ENVIAR FORMULARIO
  // ══════════════════════════════════════════════════════════════

  limpiarFormulario() {
    const form = document.getElementById('formCrearVenta');
    if (form) {
      form.querySelectorAll('input, select').forEach(el => {
        if (el.type !== 'hidden') el.value = '';
      });
    }

    this.carrito = [];
    
    const carritoDiv = document.getElementById('vta_carrito');
    if (carritoDiv) {
      carritoDiv.innerHTML = '<div class="carrito-vacio">No hay productos agregados. Busca y agrega productos.</div>';
    }

    this.actualizarTotales();

    const errorDiv = document.getElementById('ventaError');
    if (errorDiv) {
      errorDiv.innerHTML = '';
      errorDiv.style.display = 'none';
    }

    const successDiv = document.getElementById('ventaSuccess');
    if (successDiv) {
      successDiv.innerHTML = '';
      successDiv.style.display = 'none';
    }
  },

  configurarFormulario() {
    const form = document.getElementById('formCrearVenta');
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
      const idCliente = parseInt(document.getElementById('vta_cliente').value);

      // Validaciones
      if (!idCliente) {
        this.mostrarError('Selecciona un cliente');
        return;
      }

      if (this.carrito.length === 0) {
        this.mostrarError('Debes agregar al menos un producto');
        return;
      }

      // Preparar items para el API
      const items = this.carrito.map(item => ({
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario
      }));

      const response = await fetch(this.API + '?accion=registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_cliente: idCliente,
          items: items
        })
      });

      const resultado = await response.json();

      if (!resultado.ok) {
        throw new Error(resultado.mensaje || resultado.error || 'Error al crear venta');
      }

      this.mostrarExito(`✅ Venta creada: ${resultado.comprobante}`);

      setTimeout(() => {
        this.cerrar();
        if (window.cargarVentas) {
          window.cargarVentas();
        }
      }, 1500);

    } catch (error) {
      console.error('Error enviando datos:', error);
      this.mostrarError(error.message || 'Error al crear venta');
    }
  },

  mostrarError(mensaje) {
    const errorDiv = document.getElementById('ventaError');
    if (errorDiv) {
      errorDiv.textContent = '❌ ' + mensaje;
      errorDiv.style.display = 'block';
    }
  },

  mostrarExito(mensaje) {
    const successDiv = document.getElementById('ventaSuccess');
    if (successDiv) {
      successDiv.textContent = mensaje;
      successDiv.style.display = 'block';
    }
  },

  init() {
    if (this.inicializado) {
      console.log('ℹ️ CrearVentaModal ya fue inicializado');
      return;
    }

    console.log('🔄 Inicializando CrearVentaModal...');
    this.configurarFormulario();
    this.inicializado = true;
    console.log('✅ CrearVentaModal inicializado');
  }
};

// Exponer globalmente
window.CrearVentaModal = CrearVentaModal;
console.log('📦 CrearVentaModal disponible globalmente');

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    CrearVentaModal.init();
  });
} else {
  CrearVentaModal.init();
}
