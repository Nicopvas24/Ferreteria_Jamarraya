'use strict';

/* ══════════════════════════════════════════
   FERRETERÍA JAMARRAYA – productos.js
══════════════════════════════════════════ */

/* ══════════════════════════════════════════
   DOM
══════════════════════════════════════════ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const grid          = $('#pp-grid');
const countEl       = $('#pp-count');
const priceRange    = $('#pp-price-range');
const priceVal      = $('#pp-price-val');
const inStockCheck  = $('#pp-in-stock');
const sortSel       = $('#pp-sort');
const btnGrid       = $('#btn-grid');
const btnList       = $('#btn-list');
const filterToggle  = $('#pp-filter-toggle');
const sidebar       = $('#pp-sidebar');
const clearBtn      = $('#pp-clear');
// Modal
const modal         = $('#pp-modal');
const modalClose    = $('#pp-modal-close');
const modalQtyVal   = $('#pp-qty-val');
const modalQtyMinus = $('#pp-qty-minus');
const modalQtyPlus  = $('#pp-qty-plus');
const modalAddCart  = $('#pp-modal-add-cart');
// Carrito
const cartFab       = $('#pp-cart-fab');
const cartCount     = $('#pp-cart-count');
const cartPanel     = $('#pp-cart-panel');
const cartOverlay   = $('#pp-cart-overlay');
const cartClose     = $('#pp-cart-close');
const cartCta       = $('#pp-cart-cta');
const cartQuote     = $('#pp-cart-quote');
const cartItems     = $('#pp-cart-items');
const cartTotal     = $('#pp-cart-total');
// Modal de compra
const checkoutModal = $('#pp-checkout-modal');
const checkoutForm  = $('#pp-checkout-form');
const checkoutClose = $('#pp-checkout-close');
const checkoutOverlay = $('#pp-checkout-overlay');
const deliveryRadios = document.querySelectorAll('input[name="delivery"]');
const direccionSection = $('#pp-direccion-section');
const summaryItems = $('#pp-summary-items');
const checkoutTotal = $('#pp-checkout-total');
const gatewayStatus = $('#pp-gateway-status');
// Paginación
const prevBtn       = $('#pp-prev');
const nextBtn       = $('#pp-next');
const pagesEl       = $('#pp-pages');

/* ══════════════════════════════════════════
   ESTADO
══════════════════════════════════════════ */
  let state = {
    productos: [],
    filtrados: [],
    categoriaActiva: 'todos',
    precioMax: 2000000,
    soloStock: true,
    badgeActivo: null,
    orden: 'default',
    vista: 'grid',
    pagina: 1,
    porPagina: 6,
    carrito: leerCarritoCompartido(),
    modalProducto: null,
    modalCantidad: 1,
  };

const CART_KEY = 'jm_shared_cart';

function normalizarCarrito(items) {
  return (Array.isArray(items) ? items : []).map(item => ({
    ...item,
    kind: item.kind || (item.precio != null && item.tarifa == null ? 'producto' : 'rental'),
    qty: Number(item.qty) || 1,
    tarifa: Number(item.tarifa) || 0,
    precio: Number(item.precio) || 0,
  }));
}

function leerCarritoCompartido() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return normalizarCarrito(data);
  } catch {
    return [];
  }
}

function guardarCarritoCompartido(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(normalizarCarrito(items)));
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const fmt = (n) => '$' + (Number(n) || 0).toLocaleString('es-CO');

function stockLabel(stock) {
  if (stock <= 0)  return { text: 'Agotado', cls: 'out' };
  if (stock <= 5)  return { text: `Últimas ${stock}`, cls: 'low' };
  return { text: 'En stock', cls: 'ok' };
}

function badgeHTML(badge, agotado) {
  if (agotado) return `<span class="pp-card-tag agotado">Agotado</span>`;
  const map = { nuevo: 'Nuevo', oferta: 'Oferta', destacado: 'Destacado' };
  return badge && map[badge] ? `<span class="pp-card-tag ${badge}">${map[badge]}</span>` : '';
}

/* ══════════════════════════════════════════
   FILTRADO & ORDEN
══════════════════════════════════════════ */
function aplicarFiltros() {
  let lista = [...state.productos];

  if (state.categoriaActiva !== 'todos')
    lista = lista.filter(p => p.categoria === state.categoriaActiva);

  lista = lista.filter(p => p.precio <= state.precioMax);

  if (state.soloStock)
    lista = lista.filter(p => p.stock > 0);

  if (state.badgeActivo)
    lista = lista.filter(p => p.badge === state.badgeActivo);

  if (state.orden === 'price-asc')  lista.sort((a,b) => a.precio - b.precio);
  if (state.orden === 'price-desc') lista.sort((a,b) => b.precio - a.precio);
  if (state.orden === 'name-asc')   lista.sort((a,b) => a.nombre.localeCompare(b.nombre));

  state.filtrados = lista;
  state.pagina = 1;
  renderGrid();
  renderPaginacion();
}

/* ══════════════════════════════════════════
   RENDER TARJETAS
══════════════════════════════════════════ */
function renderGrid() {
  const start = (state.pagina - 1) * state.porPagina;
  const page  = state.filtrados.slice(start, start + state.porPagina);

  countEl.textContent = `${state.filtrados.length} producto${state.filtrados.length !== 1 ? 's' : ''}`;

  if (page.length === 0) {
    grid.innerHTML = `
      <div class="pp-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>No encontramos productos con esos filtros.</p>
      </div>`;
    return;
  }

  grid.className = `pp-grid${state.vista === 'list' ? ' list-view' : ''}`;
  grid.innerHTML = page.map(cardHTML).join('');

  grid.querySelectorAll('.pp-card').forEach(card => {
    const id = Number(card.dataset.id);
    card.addEventListener('click', (e) => {
      if (e.target.closest('.pp-add-btn')) return;
      abrirModal(id);
    });
  });
  grid.querySelectorAll('.pp-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      agregarAlCarrito(id, 1);
      animarBoton(btn);
    });
  });
}

function cardHTML(p) {
  const agotado = p.stock <= 0;
  const { text: stockTxt, cls: stockCls } = stockLabel(p.stock);
  return `
    <div class="pp-card" data-id="${p.id}">
      <div class="pp-card-img-wrap">
        ${badgeHTML(p.badge, agotado)}
        <img
          src="../assets/img/productos/${p.imagen}"
          alt="${p.nombre}"
          class="pp-card-img"
          onerror="this.src='../assets/img/productos/nombreimagen.webp'"
        />
        ${p.envioGratis ? '<span class="pp-shipping-tag">Envío gratis</span>' : ''}
      </div>
      <div class="pp-card-body">
        <span class="pp-card-brand">${p.marca}</span>
        <p class="pp-card-name">${p.nombre}</p>
        <div>
          <span class="pp-card-price">${fmt(p.precio)}</span>
          ${p.precioAntes ? `<span class="pp-card-price-old">${fmt(p.precioAntes)}</span>` : ''}
        </div>
        <div class="pp-card-footer">
          <span class="pp-card-stock ${stockCls}">${stockTxt}</span>
          <button class="pp-add-btn" data-id="${p.id}" ${agotado ? 'disabled' : ''}>
            + Carrito
          </button>
        </div>
      </div>
    </div>`;
}

function animarBoton(btn) {
  const orig = btn.textContent;
  btn.textContent = '✓ Agregado';
  btn.style.background = '#4caf50';
  setTimeout(() => {
    btn.textContent = orig;
    btn.style.background = '';
  }, 1200);
}

/* ══════════════════════════════════════════
   PAGINACIÓN
══════════════════════════════════════════ */
function renderPaginacion() {
  const total = Math.ceil(state.filtrados.length / state.porPagina);
  prevBtn.disabled = state.pagina === 1;
  nextBtn.disabled = state.pagina === total || total === 0;

  pagesEl.innerHTML = Array.from({ length: total }, (_, i) => i + 1)
    .map(n => `<button class="pp-page-num${n === state.pagina ? ' active' : ''}" data-page="${n}">${n}</button>`)
    .join('');

  pagesEl.querySelectorAll('.pp-page-num').forEach(btn => {
    btn.addEventListener('click', () => {
      state.pagina = Number(btn.dataset.page);
      renderGrid();
      renderPaginacion();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

/* ══════════════════════════════════════════
   MODAL
══════════════════════════════════════════ */
function abrirModal(id) {
  const p = state.productos.find(x => x.id === id);
  if (!p) return;
  state.modalProducto = p;
  state.modalCantidad = 1;

  $('#pp-modal-img').src     = `../assets/img/productos/${p.imagen}`;
  $('#pp-modal-img').onerror = () => { $('#pp-modal-img').src = '../assets/img/productos/nombreimagen.webp'; };
  $('#pp-modal-cat').textContent   = p.categoria.replace(/-/g,' ');
  $('#pp-modal-name').textContent  = p.nombre;
  $('#pp-modal-brand').textContent = p.marca;
  $('#pp-modal-desc').textContent  = p.descripcion;
  $('#pp-modal-price').textContent = fmt(p.precio);

  const { text, cls } = stockLabel(p.stock);
  const stockEl = $('#pp-modal-stock');
  stockEl.textContent = text;
  stockEl.className   = `pp-modal-stock ${cls}`;
  modalQtyVal.textContent = 1;

  const badgeEl = $('#pp-modal-badge');
  const agotado = p.stock <= 0;
  if (p.badge && !agotado) {
    const map = { nuevo:'Nuevo', oferta:'Oferta', destacado:'Destacado' };
    badgeEl.textContent = map[p.badge] || '';
    badgeEl.className   = `pp-modal-badge-tag pp-card-tag ${p.badge}`;
    badgeEl.style.display = 'block';
  } else {
    badgeEl.style.display = 'none';
  }

  modalAddCart.disabled = agotado;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function cerrarModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', cerrarModal);
modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });

modalQtyMinus.addEventListener('click', () => {
  if (state.modalCantidad > 1) state.modalCantidad--;
  modalQtyVal.textContent = state.modalCantidad;
});
modalQtyPlus.addEventListener('click', () => {
  if (state.modalProducto && state.modalCantidad < state.modalProducto.stock)
    state.modalCantidad++;
  modalQtyVal.textContent = state.modalCantidad;
});
modalAddCart.addEventListener('click', () => {
  if (!state.modalProducto) return;
  agregarAlCarrito(state.modalProducto.id, state.modalCantidad);
  cerrarModal();
  abrirCarrito();
});

/* ══════════════════════════════════════════
   CARRITO
══════════════════════════════════════════ */
function agregarAlCarrito(id, qty = 1) {
  const p = state.productos.find(x => x.id === id);
  if (!p || p.stock <= 0) return;

  if (window.GlobalCart) {
    window.GlobalCart.agregar({
      id,
      kind:     'producto',
      qty,
      nombre:   p.nombre,
      precio:   p.precio,
      imagen:   p.imagen,
      maxStock: p.stock,
    });
    // Sync estado local para checkout
    state.carrito = window.GlobalCart.leer();
    return;
  }

  // Fallback
  const existe = state.carrito.find(x => x.id === id);
  if (existe) {
    existe.qty = Math.min(existe.qty + qty, p.stock);
  } else {
    state.carrito.push({ id, kind: 'producto', qty, nombre: p.nombre, precio: p.precio, imagen: p.imagen });
  }
  renderCarrito();
}

function renderCarrito() {
  guardarCarritoCompartido(state.carrito);

  const subtotalProductos = state.carrito
    .filter(x => (x.kind || 'producto') === 'producto')
    .reduce((s, x) => s + ((x.precio || 0) * x.qty), 0);
  const subtotalAlquiler = state.carrito
    .filter(x => (x.kind || 'producto') === 'rental')
    .reduce((s, x) => s + ((x.tarifa || 0) * x.qty), 0);
  const total      = subtotalProductos + subtotalAlquiler;
  const totalItems = state.carrito.reduce((s, x) => s + (x.kind === 'rental' ? 1 : x.qty), 0);

  if (cartCount) cartCount.textContent = totalItems;
  if (cartTotal) cartTotal.textContent = fmt(total);

  if (state.carrito.length === 0) {
    if (cartItems) cartItems.innerHTML = '<p class="pp-cart-empty">Tu carrito está vacío.</p>';
    let subt = document.getElementById('pp-cart-subtotals');
    if (!subt) {
      subt = document.createElement('div');
      subt.id = 'pp-cart-subtotals';
      subt.style.cssText = 'font-size:.78rem;color:var(--text-muted);margin:.35rem 0 .5rem;display:grid;gap:.2rem';
      cartTotal?.closest('.pp-cart-total-row')?.insertAdjacentElement('afterend', subt);
    }
    subt.innerHTML = '';
    return;
  }

  if (cartItems) cartItems.innerHTML = state.carrito.map(item => `
    <div class="pp-cart-item" data-id="${item.id}" data-kind="${item.kind || 'producto'}">
      <img
        src="${(item.kind === 'rental' ? '../assets/img/maquinaria/' : '../assets/img/productos/') + item.imagen}"
        alt="${item.nombre}"
        class="pp-cart-item-img"
        onerror="this.src='../assets/img/productos/nombreimagen.webp'"
      />
      <div class="pp-cart-item-info">
        <div style="display:inline-flex;align-items:center;font-size:.66rem;text-transform:uppercase;letter-spacing:.08em;color:#fff;margin-bottom:.25rem;background:${item.kind === 'rental' ? 'rgba(88,166,255,.95)' : 'rgba(249,115,22,.95)'};padding:.12rem .45rem;border-radius:999px;font-weight:700">${item.kind === 'rental' ? 'Alquiler' : 'Producto'}</div>
        <p class="pp-cart-item-name">${item.nombre}</p>
        <span class="pp-cart-item-price">${fmt(item.kind === 'rental' ? item.tarifa : item.precio)}${item.kind === 'rental' ? '/día' : ''}</span>
            ${item.kind === 'rental' ? `<div style="font-size:.75rem;color:var(--text-muted);margin:.25rem 0"><strong>${item.qty}</strong> día${item.qty !== 1 ? 's' : ''}</div>` : ''}
            <div class="pp-cart-qty-mini">
              <button data-action="minus" data-id="${item.id}" title="${item.kind === 'rental' ? 'Menos días' : 'Menos'}">−</button>
              <span>${item.qty}</span>
              <button data-action="plus" data-id="${item.id}" title="${item.kind === 'rental' ? 'Más días' : 'Más'}">+</button>
            </div>
      </div>
      <div class="pp-cart-item-qty">
        <button class="pp-cart-item-remove" data-id="${item.id}" title="Eliminar">✕</button>
      </div>
    </div>`).join('');

  if (cartItems) cartItems.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = Number(btn.dataset.id);
      const kind = btn.closest('.pp-cart-item')?.dataset.kind || 'producto';
      const item = state.carrito.find(x => x.id === id && (x.kind || 'producto') === kind);
      if (!item) return;
      if (kind === 'rental') {
        if (btn.dataset.action === 'plus')  item.qty = Math.min(item.qty + 1, 365);
        if (btn.dataset.action === 'minus') item.qty = Math.max(item.qty - 1, 1);
      } else {
        const prod = state.productos.find(x => x.id === id);
        if (btn.dataset.action === 'plus')  item.qty = Math.min(item.qty + 1, prod?.stock || 99);
        if (btn.dataset.action === 'minus') item.qty = Math.max(item.qty - 1, 1);
      }
      renderCarrito();
    });
  });
  if (cartItems) cartItems.querySelectorAll('.pp-cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const kind = btn.closest('.pp-cart-item')?.dataset.kind || 'producto';
      state.carrito = state.carrito.filter(x => !(x.id === id && (x.kind || 'producto') === kind));
      renderCarrito();
    });
  });

  let subt = document.getElementById('pp-cart-subtotals');
  if (!subt) {
    subt = document.createElement('div');
    subt.id = 'pp-cart-subtotals';
    subt.style.cssText = 'font-size:.78rem;color:var(--text-muted);margin:.35rem 0 .5rem;display:grid;gap:.2rem';
    cartTotal?.closest('.pp-cart-total-row')?.insertAdjacentElement('afterend', subt);

  }
  subt.innerHTML = `
    <div style="display:flex;justify-content:space-between"><span>Subtotal productos</span><strong>${fmt(subtotalProductos)}</strong></div>
    <div style="display:flex;justify-content:space-between"><span>Subtotal alquileres</span><strong>${fmt(subtotalAlquiler)}</strong></div>
  `;
}

function abrirCarrito() {
  if (window.GlobalCart) { window.GlobalCart.abrir(); return; }
  cartPanel?.classList.add('open');
  cartOverlay?.classList.add('open');
  cartPanel?.setAttribute('aria-hidden', 'false');
}
function cerrarCarrito() {
  cartPanel?.classList.remove('open');
  cartOverlay?.classList.remove('open');
}

if (cartFab)     cartFab.addEventListener('click', abrirCarrito);
if (cartClose)   cartClose.addEventListener('click', cerrarCarrito);
if (cartOverlay) cartOverlay.addEventListener('click', cerrarCarrito);

/* ══════════════════════════════════════════
   MODAL CHECKOUT
══════════════════════════════════════════ */
let _cachedClienteId = null; // id_cliente guardado al abrir el checkout

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sumarDiasIncluyente(fechaBase, dias) {
  const d = new Date(fechaBase.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + Math.max(0, (Number(dias) || 1) - 1));
  return d;
}

function toISODateLocal(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function abrirCheckout() {
  const usuario = sessionStorage.getItem('jm_nombre');
  if (!usuario) {
    alert('Debes iniciar sesión o registrarte para comprar.');
    return;
  }
  const productosCarrito = state.carrito;
  if (!productosCarrito.length) return;

  // Pre-cargar datos del cliente desde BD
  _cachedClienteId = null;
  try {
    const resV = await fetch('../backend/usuarios.php?accion=verificar');
    const dataV = await resV.json();
    if (dataV.ok && dataV.id_cliente) {
      _cachedClienteId = dataV.id_cliente;
      const resC = await fetch(`../backend/api/clientes.php?accion=detalle&id=${_cachedClienteId}`);
      const cliente = await resC.json();
      if (!cliente.error) {
        // Guardar en sessionStorage para que JMCheckout.abrir() los pre-rellene
        sessionStorage.setItem('jm_nombre',         cliente.nombre         || usuario);
        sessionStorage.setItem('jm_email',          cliente.email          || '');
        sessionStorage.setItem('jm_telefono',       cliente.telefono       || '');
        sessionStorage.setItem('jm_identificacion', cliente.identificacion || '');
      }
    }
  } catch (e) { console.warn('No se pudieron obtener datos del cliente:', e); }

  // Usar modal compartido JMCheckout
  function abrirConJMCheckout() {
    window.JMCheckout.abrir({
      modo: 'compra',
      carrito: productosCarrito,
      onConfirmar: procesarCompra,
    });
  }

  if (window.JMCheckout) {
    abrirConJMCheckout();
  } else {
    // JMCheckout puede tardar un poco en cargar
    const t = setInterval(() => {
      if (window.JMCheckout) { clearInterval(t); abrirConJMCheckout(); }
    }, 50);
    setTimeout(() => clearInterval(t), 3000);
  }
}

function cerrarCheckout() {
  window.JMCheckout?.cerrar();
}

async function procesarCompra(formDatos) {
  const productosCarrito = state.carrito;
  if (!productosCarrito.length) throw new Error('Tu carrito está vacío.');

  // Obtener id_cliente
  let idClienteSession = _cachedClienteId;
  if (!idClienteSession) {
    try {
      const resVerify = await fetch('../backend/usuarios.php?accion=verificar');
      const dataVerify = await resVerify.json();
      if (dataVerify.ok) { idClienteSession = dataVerify.id_cliente || null; _cachedClienteId = idClienteSession; }
    } catch (err) { console.error('Error verificando sesión:', err); }
  }
  if (!idClienteSession) throw new Error('Tu cuenta no tiene un perfil de cliente registrado. Ve a Mi Perfil y guarda tus datos primero.');

  const datos = {
    delivery:  formDatos.delivery  || 'tienda',
    direccion: formDatos.delivery === 'domicilio' ? (formDatos.direccion || '') : 'Recolección en tienda',
    notas:     formDatos.notas    || '',
    carrito:   productosCarrito,
    total:     productosCarrito.reduce((s,x) => s + (x.precio || x.tarifa || 0) * x.qty, 0)
  };

  // Simular pasarela
  const pasos = ['Validando datos de compra...', 'Autorizando medio de pago...', `Confirmando ${fmt(datos.total)}...`];
  for (const paso of pasos) {
    window.JMCheckout?.setStatus('⟳ ' + paso);
    await esperar(650);
  }
  window.JMCheckout?.setStatus('✓ Aprobado. Registrando compra...');

  // Guardar snapshot del carrito ANTES de vaciarlo
  const carritoSnapshot = [...productosCarrito];

  // Registrar venta
  await new Promise((resolve, reject) => {
    registrarVenta(datos, idClienteSession, (resultados) => {
      window.JMCheckout?.cerrar();

      state.carrito = [];
      guardarCarritoCompartido([]);
      if (window.GlobalCart) window.GlobalCart.vaciar();
      else renderCarrito();

      // Mostrar comprobante unificado con productos Y alquileres
      const ventaResult    = resultados && resultados.find(r => r.id_venta);
      const alqResultados  = (resultados || []).filter(r => r.id_alquiler);
      mostrarComprobanteUnificado(ventaResult, alqResultados, carritoSnapshot);
      resolve();
    });
  });
}

function registrarVenta(datos, idClienteDirecto, callback) {
  // Usar el id_cliente de la sesión directamente — sin pasar por registrar cliente
  const promesaCliente = Promise.resolve(idClienteDirecto);

  promesaCliente
  .then(idCliente => {
    if (!idCliente) throw new Error('No se pudo obtener el cliente de la sesión.');
    
    const productos = datos.carrito.filter(x => x.kind !== 'rental');
    const alquileres = datos.carrito.filter(x => x.kind === 'rental');
    const promises = [];

    // 1. Registrar venta de productos
    if (productos.length > 0) {
      const items = productos.map(item => ({
        id_producto: item.id,
        cantidad: item.qty,
        precio_unitario: item.precio
      }));
      const totalVenta = productos.reduce((s,x) => s + x.precio * x.qty, 0);

      promises.push(
        fetch('../backend/api/ventas.php?accion=registrar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_cliente: idCliente,
            items: items,
            total: totalVenta,
            notas: datos.notas,
            delivery: datos.delivery
          })
        }).then(r => r.json()).then(res => {
          if (!res.ok && !res.id_venta) throw new Error(res.mensaje || res.error || 'Error en venta');
          return res;
        })
      );
    }

    // 2. Registrar alquileres
    if (alquileres.length > 0) {
      const hoyDate = new Date();
      hoyDate.setHours(0, 0, 0, 0);
      const fechaInicio = toISODateLocal(hoyDate);

      for (const alq of alquileres) {
        const fechaFin = toISODateLocal(sumarDiasIncluyente(hoyDate, alq.qty));
        promises.push(
          fetch('../backend/api/alquileres.php?accion=registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id_cliente: idCliente,
              id_maquinaria: alq.id,
              fecha_inicio: fechaInicio,
              fecha_fin: fechaFin,
              monto: (alq.tarifa || 0) * alq.qty
            })
          }).then(r => r.json()).then(res => {
            if (!res.ok && !res.id_alquiler) throw new Error(res.mensaje || res.error || 'Error en alquiler');
            return res;
          })
        );
      }
    }

    return Promise.all(promises);
  })
  .then(resultados => {
    console.log('✓ Pedido registrado:', resultados);
    callback(resultados);
  })
  .catch(err => {
    console.error('Error registrando el pedido:', err);
    window.JMCheckout?.setStatus('❌ ' + err.message, true);
    window.JMCheckout?.resetStatus();
  });
}

function procesarInventario(carrito) {
  // NOTA: El descontar ya se hace automáticamente en ventas.php cuando se registra la venta
  // Esta función se mantiene por compatibilidad pero no hace nada
  console.log('✓ Inventario ya procesado durante registro de venta');
}

function mostrarMensajeExito() {
  const msg = document.createElement('div');
  msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a1a;border:2px solid #FF6B00;border-radius:12px;padding:32px;text-align:center;z-index:9999;max-width:400px;box-shadow:0 20px 60px rgba(255,107,0,0.3);font-family:Barlow,sans-serif;color:#fff';
  msg.innerHTML = `
    <div style="font-size:2.4rem;margin-bottom:16px">✓</div>
    <h3 style="font-size:1.3rem;font-weight:700;margin:0 0 8px;color:#FF6B00">¡Pedido Confirmado!</h3>
    <p style="color:rgba(255,255,255,0.6);margin:0 0 24px">Un asesor se pondrá en contacto contigo pronto.</p>
    <button onclick="this.parentElement.remove()" style="background:#FF6B00;color:#fff;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-weight:700">Cerrar</button>
  `;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 5000);
}

/**
 * Comprobante unificado que muestra productos y alquileres.
 * @param {object|null}  ventaResult   - respuesta de ventas.php con id_venta
 * @param {object[]}     alqResultados - array de respuestas de alquileres.php
 * @param {object[]}     carritoSnap   - snapshot del carrito al momento de pagar
 */
async function mostrarComprobanteUnificado(ventaResult, alqResultados, carritoSnap) {
  const fmt2 = (n) => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', minimumFractionDigits:0 }).format(n);
  const hoy  = new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' });

  // ── Separar items del snapshot ──────────────────────────
  const itemsProducto  = carritoSnap.filter(x => x.kind !== 'rental');
  const itemsAlquiler  = carritoSnap.filter(x => x.kind === 'rental');

  // ── Intentar traer detalle de venta de la API si hay productos ──
  let ventaAPI = null;
  if (ventaResult?.id_venta) {
    try {
      const r = await fetch('../backend/api/ventas.php?accion=detalle&id=' + ventaResult.id_venta);
      const d = await r.json();
      if (!d.error) ventaAPI = d;
    } catch(_) {}
  }

  // ── Número de comprobante ────────────────────────────────
  const comprobante = ventaAPI?.comprobante
    || (ventaResult?.id_venta ? `VTA-${String(ventaResult.id_venta).padStart(5,'0')}` : null)
    || (alqResultados[0]?.id_alquiler ? `ALQ-${String(alqResultados[0].id_alquiler).padStart(5,'0')}` : null)
    || 'PED-' + Date.now().toString().slice(-6);

  const clienteNombre = ventaAPI?.cliente || sessionStorage.getItem('jm_nombre') || '—';

  // ── HTML tabla productos ─────────────────────────────────
  let tablaProductosHTML = '';
  if (itemsProducto.length > 0) {
    const filas = (ventaAPI?.items?.length ? ventaAPI.items : itemsProducto.map(p => ({
      codigo: p.codigo || '—',
      nombre: p.nombre,
      cantidad: p.qty,
      precio_unitario: p.precio,
      subtotal: p.precio * p.qty,
    }))).map(item => `
      <tr>
        <td style="padding:.55rem .75rem;color:#aaa;font-size:.8rem">${item.codigo || '—'}</td>
        <td style="padding:.55rem .75rem;font-weight:600">${item.nombre}</td>
        <td style="padding:.55rem .75rem;text-align:center">${item.cantidad}</td>
        <td style="padding:.55rem .75rem;text-align:right">${fmt2(item.precio_unitario)}</td>
        <td style="padding:.55rem .75rem;text-align:right;color:#4CAF50;font-weight:700">${fmt2(item.subtotal)}</td>
      </tr>`).join('');

    tablaProductosHTML = `
      <div style="margin-bottom:1.5rem">
        <h3 style="margin:0 0 .75rem;font-size:.75rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#aaa">🛒 Productos Adquiridos</h3>
        <div style="overflow-x:auto;border-radius:8px;border:1px solid rgba(255,255,255,0.08)">
          <table style="width:100%;border-collapse:collapse;font-size:.86rem">
            <thead>
              <tr style="background:rgba(255,107,0,0.12)">
                <th style="padding:.55rem .75rem;text-align:left;font-size:.72rem;font-weight:700;letter-spacing:1px;color:#FF6B00">CÓD.</th>
                <th style="padding:.55rem .75rem;text-align:left;font-size:.72rem;font-weight:700;letter-spacing:1px;color:#FF6B00">PRODUCTO</th>
                <th style="padding:.55rem .75rem;text-align:center;font-size:.72rem;font-weight:700;letter-spacing:1px;color:#FF6B00">CANT.</th>
                <th style="padding:.55rem .75rem;text-align:right;font-size:.72rem;font-weight:700;letter-spacing:1px;color:#FF6B00">P.U.</th>
                <th style="padding:.55rem .75rem;text-align:right;font-size:.72rem;font-weight:700;letter-spacing:1px;color:#FF6B00">SUBTOTAL</th>
              </tr>
            </thead>
            <tbody style="color:#fff">${filas}</tbody>
          </table>
        </div>
      </div>`;
  }

  // ── HTML tabla alquileres ────────────────────────────────
  let tablaAlquilerHTML = '';
  if (itemsAlquiler.length > 0) {
    const hoyDate = new Date(); hoyDate.setHours(0,0,0,0);
    const filas = itemsAlquiler.map((alq, i) => {
      const dias     = alq.qty;
      const tarifa   = alq.tarifa || 0;
      const monto    = tarifa * dias;
      const idAlq    = alqResultados[i]?.id_alquiler;
      const finDate  = new Date(hoyDate); finDate.setDate(hoyDate.getDate() + Math.max(0, dias - 1));
      const fechaFin = finDate.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
      return `
        <tr>
          <td style="padding:.55rem .75rem;color:#aaa;font-size:.8rem">${idAlq ? 'ALQ-' + String(idAlq).padStart(4,'0') : '—'}</td>
          <td style="padding:.55rem .75rem;font-weight:600">${alq.nombre}</td>
          <td style="padding:.55rem .75rem;text-align:center">${dias} día${dias !== 1 ? 's' : ''}</td>
          <td style="padding:.55rem .75rem;text-align:right">${fmt2(tarifa)}/día</td>
          <td style="padding:.55rem .75rem;text-align:right">${hoy}</td>
          <td style="padding:.55rem .75rem;text-align:right">${fechaFin}</td>
          <td style="padding:.55rem .75rem;text-align:right;color:#58a6ff;font-weight:700">${fmt2(monto)}</td>
        </tr>`;
    }).join('');

    tablaAlquilerHTML = `
      <div style="margin-bottom:1.5rem">
        <h3 style="margin:0 0 .75rem;font-size:.75rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#aaa">🔧 Equipos en Alquiler</h3>
        <div style="overflow-x:auto;border-radius:8px;border:1px solid rgba(88,166,255,0.15)">
          <table style="width:100%;border-collapse:collapse;font-size:.86rem">
            <thead>
              <tr style="background:rgba(88,166,255,0.08)">
                <th style="padding:.55rem .75rem;text-align:left;font-size:.72rem;font-weight:700;letter-spacing:1px;color:#58a6ff">ID</th>
                <th style="padding:.55rem .75rem;text-align:left;font-size:.72rem;font-weight:700;letter-spacing:1px;color:#58a6ff">EQUIPO</th>
                <th style="padding:.55rem .75rem;text-align:center;font-size:.72rem;font-weight:700;letter-spacing:1px;color:#58a6ff">DURACIÓN</th>
                <th style="padding:.55rem .75rem;text-align:right;font-size:.72rem;font-weight:700;letter-spacing:1px;color:#58a6ff">TARIFA</th>
                <th style="padding:.55rem .75rem;text-align:right;font-size:.72rem;font-weight:700;letter-spacing:1px;color:#58a6ff">INICIO</th>
                <th style="padding:.55rem .75rem;text-align:right;font-size:.72rem;font-weight:700;letter-spacing:1px;color:#58a6ff">FIN EST.</th>
                <th style="padding:.55rem .75rem;text-align:right;font-size:.72rem;font-weight:700;letter-spacing:1px;color:#58a6ff">MONTO</th>
              </tr>
            </thead>
            <tbody style="color:#fff">${filas}</tbody>
          </table>
        </div>
        <div style="margin-top:.75rem;padding:.7rem 1rem;background:rgba(88,166,255,0.07);border:1px solid rgba(88,166,255,0.18);border-radius:8px;font-size:.82rem;color:rgba(255,255,255,0.65);line-height:1.5">
          📞 <strong style="color:#58a6ff">Un asesor se contactará contigo</strong> para coordinar la entrega y condiciones del alquiler.
        </div>
      </div>`;
  }

  // ── Total global ─────────────────────────────────────────
  const totalGlobal = carritoSnap.reduce((s, x) => s + (x.tarifa || x.precio || 0) * x.qty, 0);

  // ── Montar modal ─────────────────────────────────────────
  document.getElementById('pp-detalle-checkout-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'pp-detalle-checkout-modal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Barlow,sans-serif';

  overlay.innerHTML = `
    <div style="background:#181818;border:1px solid rgba(255,255,255,0.12);border-radius:16px;max-width:680px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.7);color:#fff">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#FF6B00,#e55a00);padding:1.4rem 2rem;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:.72rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:.85;margin-bottom:.3rem">✓ Pedido Confirmado</div>
          <h2 style="margin:0;font-size:1.4rem;font-weight:900">${comprobante}</h2>
          <p style="margin:.3rem 0 0;font-size:.82rem;opacity:.85">${hoy}</p>
        </div>
        <button id="pp-detalle-close-btn" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>
      </div>

      <!-- Info cliente -->
      <div style="padding:.9rem 2rem;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;gap:2rem;flex-wrap:wrap">
        <div><span style="font-size:.72rem;color:#aaa;display:block;margin-bottom:.2rem">CLIENTE</span><strong>${clienteNombre}</strong></div>
        <div><span style="font-size:.72rem;color:#aaa;display:block;margin-bottom:.2rem">FECHA</span><strong>${hoy}</strong></div>
      </div>

      <!-- Tablas -->
      <div style="padding:1.5rem 2rem">
        ${tablaProductosHTML}
        ${tablaAlquilerHTML}

        <!-- Total -->
        <div style="padding:1rem 1.25rem;background:rgba(255,107,0,0.08);border:1px solid rgba(255,107,0,0.2);border-radius:8px;display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem">
          <span style="font-weight:600;color:#aaa">Total del Pedido</span>
          <span style="font-size:1.45rem;font-weight:900;color:#FF6B00">${fmt2(totalGlobal)}</span>
        </div>

        <button id="pp-detalle-accept-btn" style="display:block;width:100%;padding:.85rem;background:#FF6B00;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer;transition:background .2s">Aceptar y cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  document.getElementById('pp-detalle-close-btn').addEventListener('click', close);
  document.getElementById('pp-detalle-accept-btn').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

// Mantener alias para compatibilidad
async function verDetalleVentaCheckout(idVenta) {
  mostrarComprobanteUnificado({ id_venta: idVenta }, [], state.carrito);
}

checkoutClose?.addEventListener('click', cerrarCheckout);
checkoutOverlay?.addEventListener('click', cerrarCheckout);
checkoutForm?.addEventListener('submit', procesarCompra);


// Toggle dirección
function toggleDireccionSection() {
  const mostrar = document.querySelector('input[name="delivery"]:checked').value === 'domicilio';
  direccionSection.style.display = mostrar ? 'block' : 'none';
  // Actualizar required en campos de dirección
  const camposDireccion = document.querySelectorAll('#co-direccion, #co-ciudad, #co-departamento, #co-codigo');
  camposDireccion.forEach(input => {
    input.required = mostrar;
    if (!mostrar) input.value = ''; // Limpiar si se regresa a tienda
  });
}

deliveryRadios.forEach(radio => {
  radio.addEventListener('change', toggleDireccionSection);
});

// Inicializar estado al cargar
toggleDireccionSection();

// Botón comprar
cartCta?.addEventListener('click', abrirCheckout);

// Botón cotización (WhatsApp)
cartQuote?.addEventListener('click', () => {
  if (state.carrito.length === 0) return;
  const lineas = state.carrito
    .map(x => {
      const unit = Number(x.kind === 'rental' ? x.tarifa : x.precio) || 0;
      const detalle = x.kind === 'rental'
        ? `${x.qty} día${x.qty !== 1 ? 's' : ''}`
        : `x${x.qty}`;
      return `• ${x.nombre} (${x.kind === 'rental' ? 'Alquiler' : 'Producto'}) ${detalle} = ${fmt(unit * x.qty)}`;
    })
    .join('%0A');
  const total = state.carrito.reduce((s, x) => {
    const unit = Number(x.kind === 'rental' ? x.tarifa : x.precio) || 0;
    return s + unit * x.qty;
  }, 0);
  const msg = encodeURIComponent(
    `Hola, quiero cotizar estos items del carrito:%0A${lineas}%0A%0ATotal estimado: ${fmt(total)}`
  );
  window.open(`https://wa.me/573017213193?text=${msg}`, '_blank');
});

/* ══════════════════════════════════════════
   COTIZACIÓN
══════════════════════════════════════════ */
// Comentado: función antigua de cotización por WhatsApp
// $('#pp-cart-cta').addEventListener('click', () => { ... });

/* ══════════════════════════════════════════
   FILTROS – EVENTOS
══════════════════════════════════════════ */
document.querySelectorAll('.pp-cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pp-cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.categoriaActiva = btn.dataset.cat;
    aplicarFiltros();
  });
});

priceRange?.addEventListener('input', () => {
  state.precioMax = Number(priceRange.value);
  priceVal.textContent = fmt(state.precioMax);
  aplicarFiltros();
});

inStockCheck?.addEventListener('change', () => {
  state.soloStock = inStockCheck.checked;
  aplicarFiltros();
});

sortSel?.addEventListener('change', () => {
  state.orden = sortSel.value;
  aplicarFiltros();
});

document.querySelectorAll('.pp-badge-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const same = btn.classList.contains('active');
    document.querySelectorAll('.pp-badge-btn').forEach(b => b.classList.remove('active'));
    state.badgeActivo = same ? null : btn.dataset.badge;
    if (!same) btn.classList.add('active');
    aplicarFiltros();
  });
});

clearBtn?.addEventListener('click', () => {
  state.categoriaActiva = 'todos';
  state.precioMax       = 2000000;
  state.soloStock       = true;
  state.badgeActivo     = null;
  state.orden           = 'default';
  if (priceRange)   { priceRange.value = 2000000; priceVal.textContent = fmt(2000000); }
  if (inStockCheck)   inStockCheck.checked = true;
  if (sortSel)        sortSel.value = 'default';
  document.querySelectorAll('.pp-cat-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.pp-cat-btn[data-cat="todos"]')?.classList.add('active');
  document.querySelectorAll('.pp-badge-btn').forEach(b => b.classList.remove('active'));
  aplicarFiltros();
});

btnGrid?.addEventListener('click', () => {
  state.vista = 'grid';
  btnGrid.classList.add('active');
  btnList.classList.remove('active');
  renderGrid();
});
btnList?.addEventListener('click', () => {
  state.vista = 'list';
  btnList.classList.add('active');
  btnGrid.classList.remove('active');
  renderGrid();
});

filterToggle?.addEventListener('click', () => sidebar?.classList.toggle('open'));

prevBtn?.addEventListener('click', () => {
  if (state.pagina > 1) {
    state.pagina--;
    renderGrid();
    renderPaginacion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});
nextBtn?.addEventListener('click', () => {
  const total = Math.ceil(state.filtrados.length / state.porPagina);
  if (state.pagina < total) {
    state.pagina++;
    renderGrid();
    renderPaginacion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

/* ══════════════════════════════════════════
   CARGAR PRODUCTOS DESDE PHP
   [ CONECTAR PHP ] — ruta: php/api/productos.php
══════════════════════════════════════════ */
async function cargarProductos() {
  try {
    const res = await fetch('../backend/api/productos.php');
    if (!res.ok) throw new Error('Error servidor');

    const raw = await res.json();

    const productos = raw.map(p => ({
      id:          p.id,
      nombre:      p.nombre,
      marca:       p.codigo        ?? '',
      categoria:   p.categoria     ?? '',
      precio:      p.precio,
      precioAntes: p.precio_antes  ?? null,
      descripcion: p.descripcion   ?? '',
      imagen:      p.img           ?? 'nombreimagen.webp',
      stock:       p.stock_actual,
      badge:       p.badge         ?? '',
      envioGratis: p.envio_gratis == 1
    }));

    state.productos = productos;
    state.carrito = leerCarritoCompartido();
    state.filtrados = productos;
    aplicarFiltros();
    renderCarrito();

  } catch (err) {
    console.error(err);
    document.getElementById('pp-grid').innerHTML = `
      <div class="pp-empty">
        <p>No se pudieron cargar los productos. Intenta de nuevo.</p>
      </div>`;
  }
}

cargarProductos();

/* ══════════════════════════════════════════
   INTEGRACIÓN CON CARRITO GLOBAL
══════════════════════════════════════════ */
(function initGlobalCartIntegration() {
  // Registrar el checkout de esta página en GlobalCart
  function registrar() {
    if (!window.GlobalCart) return;
    // Cuando se pulse "Confirmar compra" en el carrito del navbar
    window.GlobalCart.registrarCheckout(async () => {
      state.carrito = window.GlobalCart.leer();
      await abrirCheckout();
    });
    // Sincronizar state.carrito cuando GlobalCart cambie
    window.GlobalCart.onCambio((items) => {
      state.carrito = items;
    });
    // Actualizar carrito inicial
    state.carrito = window.GlobalCart.leer();
  }

  // GlobalCart puede cargar ligeramente después
  if (window.GlobalCart) {
    registrar();
  } else {
    const t = setInterval(() => {
      if (window.GlobalCart) { clearInterval(t); registrar(); }
    }, 80);
    setTimeout(() => clearInterval(t), 5000);
  }
})();