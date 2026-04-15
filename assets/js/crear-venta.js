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
        option.textContent = `${c.nombre} (c.c: ${c.identificacion})`;
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
      
      console.log('📦 Productos cargados:', this.productos.slice(0, 3).map(p => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        stock: p.stock_actual
      })));

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

    console.log('🔍 Producto que se intenta agregar:', {
      id: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      stock: producto.stock_actual
    });

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
      const nuevoItem = {
        id_producto: parseInt(producto.id),
        nombre: producto.nombre,
        codigo: producto.codigo,
        cantidad: 1,
        precio_unitario: parseFloat(producto.precio),
        stock_disponible: parseInt(producto.stock_actual)
      };
      
      console.log('➕ Agregando al carrito:', nuevoItem);
      this.carrito.push(nuevoItem);
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
    this.carrito.forEach((item) => {
      const subtotal = item.cantidad * item.precio_unitario;
      html += `
        <div class="carrito-item">
          <div class="carrito-item-code"><strong>Código:</strong> ${item.codigo}</div>
          <div class="carrito-item-nombre">${item.nombre}<br/><small style="color: var(--text-muted);">Stock disponible: ${item.stock_disponible}</small></div>
          <div class="carrito-item-qty">
            <button type="button" class="qty-btn" onclick="CrearVentaModal.decrementarCantidad(${item.id_producto})">−</button>
            <input type="number" class="qty-input" value="${item.cantidad}" 
                   onchange="CrearVentaModal.cambiarCantidad(${item.id_producto}, this.value)"/>
            <button type="button" class="qty-btn" onclick="CrearVentaModal.incrementarCantidad(${item.id_producto})">+</button>
          </div>
          <div class="carrito-item-price">$${subtotal.toLocaleString('es-CO', {maximumFractionDigits: 2})}</div>
          <button type="button" class="carrito-item-remove" onclick="CrearVentaModal.removerProducto(${item.id_producto})">✕</button>
        </div>
      `;
    });

    carritoDiv.innerHTML = html;
    this.actualizarTotales();
  },

  incrementarCantidad(idProducto) {
    const item = this.carrito.find(p => p.id_producto === idProducto);
    if (!item) return;
    
    if (item.cantidad < item.stock_disponible) {
      item.cantidad += 1;
      this.actualizarCarrito();
    } else {
      this.mostrarError(`Stock máximo disponible: ${item.stock_disponible}`);
    }
  },

  decrementarCantidad(idProducto) {
    const item = this.carrito.find(p => p.id_producto === idProducto);
    if (!item) return;
    
    if (item.cantidad > 1) {
      item.cantidad -= 1;
      this.actualizarCarrito();
    }
  },

  cambiarCantidad(idProducto, nuevaCantidad) {
    const cant = parseInt(nuevaCantidad) || 0;
    const item = this.carrito.find(p => p.id_producto === idProducto);
    if (!item) return;

    if (cant < 1) {
      this.removerProducto(idProducto);
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

  removerProducto(idProducto) {
    this.carrito = this.carrito.filter(p => p.id_producto !== idProducto);
    this.actualizarCarrito();
  },

  // Obtener stock actual de todos los productos antes de crear venta
  async obtenerStockActual() {
    try {
      const response = await fetch(this.apiProductos + '?accion=listar');
      const productos = await response.json();
      return productos;
    } catch (error) {
      console.error('Error obteniendo stock:', error);
      throw new Error('Error al refrescar el stock: ' + error.message);
    }
  },

  // ══════════════════════════════════════════════════════════════
  // CÁLCULOS Y TOTALES
  // ══════════════════════════════════════════════════════════════

  actualizarTotales() {
    const subtotal = this.carrito.reduce((sum, item) => 
      sum + (item.cantidad * item.precio_unitario), 0
    );
    
    const impuestos = subtotal * 0.19; // IVA del 19%
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

      // Validar que todos los productos tengan datos correctos
      const productosInvalidos = this.carrito.filter(item => 
        !item.id_producto || item.cantidad < 1 || item.precio_unitario < 0
      );

      if (productosInvalidos.length > 0) {
        this.mostrarError('Hay productos con datos inválidos en el carrito');
        console.error('Productos inválidos:', productosInvalidos);
        return;
      }

      // Preparar items para el API - NO modificar el carrito
      const items = this.carrito.map(item => ({
        id_producto: parseInt(item.id_producto),
        cantidad: parseInt(item.cantidad),
        precio_unitario: parseFloat(item.precio_unitario)
      }));

      // REFRESCAR STOCK DEL CARRITO JUSTO ANTES DE ENVIAR
      console.log('🔄 Refrescando stock de productos antes de crear venta...');
      const productosActualizados = await this.obtenerStockActual();
      
      // Validar que los productos tengan stock suficiente
      for (const item of this.carrito) {
        const prodActualizado = productosActualizados.find(p => parseInt(p.id) === parseInt(item.id_producto));
        
        if (!prodActualizado) {
          this.mostrarError(`Producto "${item.nombre}" ha sido eliminado`);
          return;
        }
        
        const stockReal = parseInt(prodActualizado.stock_actual);
        const cantidadSolicitada = parseInt(item.cantidad);
        
        if (stockReal < cantidadSolicitada) {
          this.mostrarError(`❌ Stock insuficiente para "${item.nombre}"\nDisponible: ${stockReal}, Solicitado: ${cantidadSolicitada}`);
          return;
        }
      }

      console.log('✅ Stock validado correctamente');
      console.log('📦 CARRITO COMPLETO:', JSON.stringify(this.carrito, null, 2));
      console.log('📦 ITEMS A ENVIAR:', JSON.stringify(items, null, 2));
      console.log('📦 Enviando venta:', { id_cliente: idCliente, items: items });

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
