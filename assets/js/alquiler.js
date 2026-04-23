'use strict';

/* ══════════════════════════════════════════
   FERRETERÍA JAMARRAYA – alquiler.js
   Gestión de equipos en alquiler
══════════════════════════════════════════ */

/* ══════════════════════════════════════════
   DOM ELEMENTS
══════════════════════════════════════════ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const grid          = $('#alq-grid');
const countEl       = $('#alq-count');
const priceRange    = $('#alq-price-range');
const priceVal      = $('#alq-price-val');
const inStockCheck  = $('#alq-in-stock');
const sortSel       = $('#alq-sort');
const btnGrid       = $('#alq-btn-grid');
const btnList       = $('#alq-btn-list');
const filterToggle  = $('#alq-filter-toggle');
const sidebar       = $('#alq-sidebar');
const clearBtn      = $('#alq-clear');
// Modal
const modal         = $('#alq-modal');
const modalClose    = $('#alq-modal-close');
const modalQtyVal   = $('#alq-qty-val');
const modalQtyMinus = $('#alq-qty-minus');
const modalQtyPlus  = $('#alq-qty-plus');
const modalAddCart  = $('#alq-modal-add-cart');
// Carrito
const cartFab       = $('#alq-cart-fab');
const cartCount     = $('#alq-cart-count');
const cartPanel     = $('#alq-cart-panel');
const cartOverlay   = $('#alq-cart-overlay');
const cartClose     = $('#alq-cart-close');
const cartCta       = $('#alq-cart-cta');
const cartQuote     = $('#alq-cart-quote');
const cartItems     = $('#alq-cart-items');
const cartTotal     = $('#alq-cart-total');
// Paginación
const prevBtn       = $('#alq-prev');
const nextBtn       = $('#alq-next');
const pagesEl       = $('#alq-pages');

/* ══════════════════════════════════════════
   ESTADO
══════════════════════════════════════════ */
let state = {
  equipos: [],
  filtrados: [],
  tarifaMax: 5000000,
  soloDisponible: true,
  busqueda: '',
  orderBy: 'default',
  viewMode: 'grid',
  currentPage: 1,
  itemsPerPage: 12,
};

const CART_KEY = 'jm_shared_cart';

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

let carrito = leerCarritoCompartido();
let modalEquipo = null;
let modalQty = 1;

/* ══════════════════════════════════════════
   HELPERS FORMAT
══════════════════════════════════════════ */
const fmt = (n) => '$' + (Number(n) || 0).toLocaleString('es-CO');

function normalizarCarrito(items) {
  return (Array.isArray(items) ? items : []).map(item => ({
    ...item,
    kind: item.kind || (item.precio != null && item.tarifa == null ? 'producto' : 'rental'),
    qty: Number(item.qty) || 1,
    tarifa: Number(item.tarifa) || 0,
    precio: Number(item.precio) || 0,
  }));
}

/* ══════════════════════════════════════════
   FUNCIONES AUXILIARES
══════════════════════════════════════════ */

function stockLabel(stock) {
  if (stock <= 0)  return { text: 'Agotado', cls: 'out' };
  if (stock <= 5)  return { text: `Últimas ${stock}`, cls: 'low' };
  return { text: 'Disponible', cls: 'ok' };
}

function badgeHTML(badge, agotado) {
  if (agotado) return `<span class="alq-card-tag agotado">Agotado</span>`;
  const map = { nuevo: 'Nuevo', promocion: 'Promoción', destacado: 'Destacado' };
  return badge && map[badge] ? `<span class="alq-card-tag ${badge}">${map[badge]}</span>` : '';
}

/* ══════════════════════════════════════════
   FILTRADO & ORDEN
══════════════════════════════════════════ */
function aplicarFiltros() {
  let lista = [...state.equipos];

  // Filtrar por búsqueda
  if (state.busqueda.trim()) {
    const term = state.busqueda.toLowerCase();
    lista = lista.filter(e => 
      e.nombre.toLowerCase().includes(term) || 
      e.descripcion.toLowerCase().includes(term) ||
      e.marca.toLowerCase().includes(term)
    );
  }

  // Filtrar por tarifa
  lista = lista.filter(e => e.tarifa_diaria <= state.tarifaMax);

  // Filtrar por disponibilidad
  if (state.soloDisponible)
    lista = lista.filter(e => e.disponible && e.stock > 0);

  // Ordenar
  if (state.orderBy === 'price-asc')  lista.sort((a,b) => a.tarifa_diaria - b.tarifa_diaria);
  if (state.orderBy === 'price-desc') lista.sort((a,b) => b.tarifa_diaria - a.tarifa_diaria);
  if (state.orderBy === 'name-asc')   lista.sort((a,b) => a.nombre.localeCompare(b.nombre));

  state.filtrados = lista;
  state.currentPage = 1;
  renderGrid();
  renderPaginacion();
}

/* ══════════════════════════════════════════
   RENDER TARJETAS
══════════════════════════════════════════ */
function renderGrid() {
  const start = (state.currentPage - 1) * state.itemsPerPage;
  const page  = state.filtrados.slice(start, start + state.itemsPerPage);

  countEl.textContent = `${state.filtrados.length} equipo${state.filtrados.length !== 1 ? 's' : ''}`;

  if (page.length === 0) {
    grid.innerHTML = `
      <div class="alq-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>No encontramos equipos con esos filtros.</p>
      </div>`;
    return;
  }

  grid.className = `alq-grid${state.viewMode === 'list' ? ' list-view' : ''}`;
  grid.innerHTML = page.map(cardHTML).join('');

  $$('.alq-card', grid).forEach(card => {
    const id = Number(card.dataset.id);
    card.addEventListener('click', (e) => {
      if (e.target.closest('.alq-add-btn')) return;
      abrirModal(id);
    });
  });
  
  $$('.alq-add-btn', grid).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      agregarAlCarrito(id, 1);
      animarBoton(btn);
    });
  });
}

function cardHTML(e) {
  const agotado = e.stock <= 0 || !e.disponible;
  const { text: stockTxt, cls: stockCls } = stockLabel(e.stock);
  const rutaImagen = e.imagen.startsWith('http') || e.imagen.startsWith('../') 
    ? e.imagen 
    : `../assets/img/maquinaria/${e.imagen}`;
  
  return `
    <div class="alq-card" data-id="${e.id}">
      <div class="alq-card-img-wrap">
        ${badgeHTML(e.badge, agotado)}
        <img
          src="${rutaImagen}"
          alt="${e.nombre}"
          class="alq-card-img"
          onerror="this.src='../assets/img/default-maquinaria.png'"
        />
      </div>
      <div class="alq-card-body">
        <span class="alq-card-brand">${e.marca}</span>
        <p class="alq-card-name">${e.nombre}</p>
        <div class="alq-card-price">
          ${fmt(e.tarifa_diaria)}<span class="alq-card-period">/día</span>
        </div>
        <div class="alq-card-footer">
          <span class="alq-card-stock ${stockCls}">${stockTxt}</span>
          <button class="alq-add-btn" data-id="${e.id}" ${agotado ? 'disabled' : ''}>
            Alquilar
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
  const total = Math.ceil(state.filtrados.length / state.itemsPerPage);
  prevBtn.disabled = state.currentPage === 1;
  nextBtn.disabled = state.currentPage === total || total === 0;

  pagesEl.innerHTML = Array.from({ length: total }, (_, i) => i + 1)
    .map(n => `<button class="alq-page-num${n === state.currentPage ? ' active' : ''}" data-page="${n}">${n}</button>`)
    .join('');

  $$('.alq-page-num', pagesEl).forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentPage = Number(btn.dataset.page);
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
  const e = state.equipos.find(x => x.id === id);
  if (!e) return;
  modalEquipo = e;
  modalQty = 1;

  const rutaImagen = e.imagen.startsWith('http') || e.imagen.startsWith('../') 
    ? e.imagen 
    : `../assets/img/maquinaria/${e.imagen}`;
  
  $('#alq-modal-img').src     = rutaImagen;
  $('#alq-modal-img').onerror = () => { $('#alq-modal-img').src = '../assets/img/default-maquinaria.png'; };
  $('#alq-modal-cat').textContent   = e.categoria.replace(/_/g,' ');
  $('#alq-modal-name').textContent  = e.nombre;
  $('#alq-modal-brand').textContent = e.marca;
  $('#alq-modal-desc').textContent  = e.descripcion;
  $('#alq-modal-price').textContent = fmt(e.tarifa_diaria) + ' /día';

  const { text, cls } = stockLabel(e.stock);
  const stockEl = $('#alq-modal-stock');
  stockEl.textContent = text;
  stockEl.className   = `alq-modal-stock ${cls}`;
  
  // Mostrar label de días
  const daysLabel = document.getElementById('alq-modal-days-label');
  if (daysLabel) daysLabel.textContent = modalQty + ' día' + (modalQty !== 1 ? 's' : '');
  modalQtyVal.textContent = 1;

  const badgeEl = $('#alq-modal-badge');
  const agotado = e.stock <= 0 || !e.disponible;
  if (e.badge && !agotado) {
    const map = { nuevo:'Nuevo', promocion:'Promoción', destacado:'Destacado' };
    badgeEl.textContent = map[e.badge] || '';
    badgeEl.className   = `alq-modal-badge-tag alq-card-tag ${e.badge}`;
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
  if (modalQty > 1) modalQty--;
  const daysLabel = document.getElementById('alq-modal-days-label');
  if (daysLabel) daysLabel.textContent = modalQty + ' día' + (modalQty !== 1 ? 's' : '');
  modalQtyVal.textContent = modalQty;
});
modalQtyPlus.addEventListener('click', () => {
  if (modalQty < 365) modalQty++;
  const daysLabel = document.getElementById('alq-modal-days-label');
  if (daysLabel) daysLabel.textContent = modalQty + ' día' + (modalQty !== 1 ? 's' : '');
  modalQtyVal.textContent = modalQty;
});
modalAddCart.addEventListener('click', () => {
  if (!modalEquipo) return;
  agregarAlCarrito(modalEquipo.id, modalQty);
  cerrarModal();
  abrirCarrito();
});

/* ══════════════════════════════════════════
   CARRITO
══════════════════════════════════════════ */
function agregarAlCarrito(id, qty = 1) {
  const e = state.equipos.find(x => x.id === id);
  if (!e || e.stock <= 0) return;

  const existe = carrito.find(x => x.id === id && x.kind === 'rental');
  if (existe) {
    existe.qty = Math.min(existe.qty + qty, 365);
  } else {
    carrito.push({ id, kind: 'rental', qty, nombre: e.nombre, tarifa: e.tarifa_diaria, imagen: e.imagen });
  }
  renderCarrito();
}

function renderCarrito() {
  carrito = normalizarCarrito(carrito);
  guardarCarritoCompartido(carrito);

  const subtotalProductos = carrito
    .filter(x => (x.kind || 'rental') === 'producto')
    .reduce((s, x) => s + ((x.precio || 0) * x.qty), 0);
  const subtotalAlquiler = carrito
    .filter(x => (x.kind || 'rental') === 'rental')
    .reduce((s, x) => s + ((x.tarifa || 0) * x.qty), 0);
  const total      = subtotalProductos + subtotalAlquiler;
  const totalItems = carrito.reduce((s, x) => s + x.qty, 0);

  cartCount.textContent = totalItems;
  cartTotal.textContent = fmt(total);

  if (carrito.length === 0) {
    cartItems.innerHTML = '<p class="alq-cart-empty">Tu solicitud está vacía.</p>';
    let subt = document.getElementById('alq-cart-subtotals');
    if (!subt) {
      subt = document.createElement('div');
      subt.id = 'alq-cart-subtotals';
      subt.style.cssText = 'font-size:.78rem;color:var(--text-muted);margin:.35rem 0 .5rem;display:grid;gap:.2rem';
      cartTotal.closest('.alq-cart-total-row')?.insertAdjacentElement('afterend', subt);
    }
    subt.innerHTML = '';
    return;
  }

  cartItems.innerHTML = carrito.map(item => {
    const imagen = item.imagen || 'default.png';
    const rutaImagen = imagen.startsWith('http') || imagen.startsWith('../') 
      ? imagen 
      : `../assets/img/maquinaria/${imagen}`;
    
    return `
    <div class="alq-cart-item" data-id="${item.id}" data-kind="${item.kind || 'rental'}">
      <img
        src="${rutaImagen}"
        alt="${item.nombre}"
        class="alq-cart-item-img"
        onerror="this.src='../assets/img/productos/nombreimagen.webp'"
      />
      <div class="alq-cart-item-info">
        <div style="display:inline-flex;align-items:center;font-size:.66rem;text-transform:uppercase;letter-spacing:.08em;color:#fff;margin-bottom:.25rem;background:${item.kind === 'producto' ? 'rgba(249,115,22,.95)' : 'rgba(88,166,255,.95)'};padding:.12rem .45rem;border-radius:999px;font-weight:700">${item.kind === 'producto' ? 'Producto' : 'Alquiler'}</div>
        <p class="alq-cart-item-name">${item.nombre}</p>
        <span class="alq-cart-item-price">${fmt(item.kind === 'producto' ? item.precio : item.tarifa)}${item.kind === 'producto' ? '' : '/día'}</span>
        ${item.kind === 'rental' ? `<div style="font-size:.75rem;color:var(--text-muted);margin:.25rem 0"><strong>${item.qty}</strong> día${item.qty !== 1 ? 's' : ''}</div>` : ''}
        <div class="alq-cart-qty-mini">
          <button data-action="minus" data-id="${item.id}" title="Menos días">−</button>
          <span>${item.qty}</span>
          <button data-action="plus" data-id="${item.id}" title="Más días">+</button>
        </div>
      </div>
      <div class="alq-cart-item-qty">
        <button class="alq-cart-item-remove" data-id="${item.id}" title="Eliminar">✕</button>
      </div>
    </div>`
  }).join('');

  $$('[data-action]', cartItems).forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = Number(btn.dataset.id);
      const kind = btn.closest('.alq-cart-item')?.dataset.kind || 'rental';
      const item = carrito.find(x => x.id === id && (x.kind || 'rental') === kind);
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
  $$('.alq-cart-item-remove', cartItems).forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const kind = btn.closest('.alq-cart-item')?.dataset.kind || 'rental';
      carrito = carrito.filter(x => !(x.id === id && (x.kind || 'rental') === kind));
      renderCarrito();
    });
  });

  let subt = document.getElementById('alq-cart-subtotals');
  if (!subt) {
    subt = document.createElement('div');
    subt.id = 'alq-cart-subtotals';
    subt.style.cssText = 'font-size:.78rem;color:var(--text-muted);margin:.35rem 0 .5rem;display:grid;gap:.2rem';
    cartTotal.closest('.alq-cart-total-row')?.insertAdjacentElement('afterend', subt);
  }
  subt.innerHTML = `
    <div style="display:flex;justify-content:space-between"><span>Subtotal productos</span><strong>${fmt(subtotalProductos)}</strong></div>
    <div style="display:flex;justify-content:space-between"><span>Subtotal alquileres</span><strong>${fmt(subtotalAlquiler)}</strong></div>
  `;
}

function abrirCarrito() {
  cartPanel.classList.add('open');
  cartOverlay.classList.add('open');
  cartPanel.setAttribute('aria-hidden', 'false');
}
function cerrarCarrito() {
  cartPanel.classList.remove('open');
  cartOverlay.classList.remove('open');
  cartPanel.setAttribute('aria-hidden', 'true');
}

cartFab.addEventListener('click', abrirCarrito);
cartClose.addEventListener('click', cerrarCarrito);
cartOverlay.addEventListener('click', cerrarCarrito);

/* ══════════════════════════════════════════
   SOLICITUD/CONTACTO
══════════════════════════════════════════ */
cartCta.addEventListener('click', () => {
  const usuario = sessionStorage.getItem('jm_nombre');
  if (!usuario) {
    alert('Debes iniciar sesión o registrarte para alquilar.');
    return;
  }
  if (carrito.length === 0) return;
  abrirCheckout();
});

cartQuote?.addEventListener('click', () => {
  if (carrito.length === 0) return;

  const lineas = carrito
    .map(x => {
      const unit = Number(x.kind === 'rental' ? x.tarifa : x.precio) || 0;
      const detalle = x.kind === 'rental'
        ? `${x.qty} día${x.qty !== 1 ? 's' : ''}`
        : `x${x.qty}`;
      return `• ${x.nombre} (${x.kind === 'rental' ? 'Alquiler' : 'Producto'}) ${detalle} = ${fmt(unit * x.qty)}`;
    })
    .join('%0A');

  const total = carrito.reduce((s, x) => {
    const unit = Number(x.kind === 'rental' ? x.tarifa : x.precio) || 0;
    return s + unit * x.qty;
  }, 0);

  const msg = encodeURIComponent(
    `Hola, quiero cotizar estos items del carrito:%0A${lineas}%0A%0ATotal estimado: ${fmt(total)}`
  );
  window.open(`https://wa.me/573017213193?text=${msg}`, '_blank');
});

/* ══════════════════════════════════════════
   CHECKOUT MODAL
══════════════════════════════════════════ */
let checkoutModal = null;

function abrirCheckout() {
  // Crear modal dinámico si no existe
  if (!checkoutModal) {
    checkoutModal = document.createElement('div');
    checkoutModal.id = 'alq-checkout-modal';
    checkoutModal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999;
      background: rgba(0,0,0,.7); display: flex; align-items: center; justify-content: center;
    `;
    checkoutModal.innerHTML = `
      <div style="background: #fff; border-radius: 12px; width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto; padding: 2rem">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem">
          <h2 style="margin: 0; font-size: 1.5rem">Procesar alquiler</h2>
          <button id="alq-checkout-close" style="background: none; border: none; font-size: 1.5rem; cursor: pointer">✕</button>
        </div>
        <div style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #eee">
          <h3 style="margin-top: 0; font-size: 0.9rem; color: #666">Resumen del alquiler</h3>
          <div id="alq-checkout-summary" style="font-size: 0.9rem"></div>
          <div style="display: flex; justify-content: space-between; margin-top: 1rem; font-weight: 700; font-size: 1.1rem">
            <span>Total estimado:</span>
            <span id="alq-checkout-total">$0</span>
          </div>
        </div>
        <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f5f5f5; border-radius: 8px">
          <p style="margin: 0; font-size: 0.85rem; color: #666">📧 Los detalles se enviarán al correo registrado en tu cuenta. Recibirás confirmación y fechas de entrega.</p>
        </div>
        <button id="alq-checkout-submit" style="width: 100%; padding: 0.8rem; background: var(--blue); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 1rem">
          Confirmar solicitud de alquiler
        </button>
      </div>
    `;
    document.body.appendChild(checkoutModal);
    
    document.getElementById('alq-checkout-close').addEventListener('click', cerrarCheckoutAlquiler);
    checkoutModal.addEventListener('click', (e) => { if (e.target === checkoutModal) cerrarCheckoutAlquiler(); });
    document.getElementById('alq-checkout-submit').addEventListener('click', procesarAlquiler);
  }
  
  // Actualizar resumen
  const total = carrito.reduce((s,x) => s + (x.tarifa || x.precio || 0) * x.qty, 0);
  document.getElementById('alq-checkout-total').textContent = fmt(total);
  document.getElementById('alq-checkout-summary').innerHTML = carrito.map(item => `
    <div style="display: flex; justify-content: space-between; margin: 0.5rem 0">
      <span>${item.nombre} ${item.kind === 'rental' ? `<strong>${item.qty} día${item.qty !== 1 ? 's' : ''}</strong>` : `<strong>x${item.qty}</strong>`}</span>
      <strong>${fmt((item.tarifa || item.precio || 0) * item.qty)}</strong>
    </div>
  `).join('');
  
  checkoutModal.style.display = 'flex';
  cerrarCarrito();
}

function cerrarCheckoutAlquiler() {
  if (checkoutModal) checkoutModal.style.display = 'none';
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

async function procesarAlquiler() {
  const usuario = sessionStorage.getItem('jm_nombre');
  const email = sessionStorage.getItem('jm_email');
  const telefono = sessionStorage.getItem('jm_telefono');
  const identificacion = sessionStorage.getItem('jm_identificacion');
  
  if (!usuario || carrito.length === 0) {
    alert('Datos incompletos');
    return;
  }
  
  const submitBtn = document.getElementById('alq-checkout-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Procesando...';
  
  try {
    // Registrar cliente
    const clienteRes = await fetch('../backend/api/clientes.php?accion=registrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: usuario,
        identificacion: identificacion,
        telefono: telefono,
        email: email,
        direccion: 'Alquiler web'
      })
    });
    const clienteData = await clienteRes.json();
    const idCliente = clienteData.id || clienteData.id_cliente;
    
    if (!idCliente) throw new Error('No se pudo registrar cliente');
    
    // Registrar cada alquiler
    const hoyDate = new Date();
    hoyDate.setHours(0, 0, 0, 0);
    const fechaInicio = toISODateLocal(hoyDate);
    const alquileres = carrito.filter(x => x.kind === 'rental');
    
    for (const alq of alquileres) {
      const fechaFin = toISODateLocal(sumarDiasIncluyente(hoyDate, alq.qty));
      await fetch('../backend/api/alquileres.php?accion=registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_cliente: idCliente,
          id_maquinaria: alq.id,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          monto: (alq.tarifa || 0) * alq.qty
        })
      });
    }
    
    // Limpiar carrito
    carrito = [];
    guardarCarritoCompartido(carrito);
    renderCarrito();
    cerrarCheckoutAlquiler();
    
    alert('✓ Solicitud de alquiler enviada. Nos contactaremos pronto.');
  } catch (err) {
    console.error(err);
    alert('Error: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirmar solicitud de alquiler';
  }
}

/* ══════════════════════════════════════════
   FILTROS – EVENTOS
══════════════════════════════════════════ */
const searchInput = $('#alq-search');
searchInput?.addEventListener('input', () => {
  state.busqueda = searchInput.value;
  aplicarFiltros();
});

priceRange?.addEventListener('input', () => {
  state.tarifaMax = Number(priceRange.value);
  priceVal.textContent = fmt(state.tarifaMax);
  aplicarFiltros();
});

inStockCheck?.addEventListener('change', () => {
  state.soloDisponible = inStockCheck.checked;
  aplicarFiltros();
});

sortSel?.addEventListener('change', () => {
  state.orderBy = sortSel.value;
  aplicarFiltros();
});

clearBtn?.addEventListener('click', () => {
  const maxRange = Number(priceRange?.max || 5000000);
  state.tarifaMax       = maxRange;
  state.soloDisponible  = true;
  state.busqueda        = '';
  state.orderBy         = 'default';
  if (priceRange)   { priceRange.value = maxRange; priceVal.textContent = fmt(maxRange); }
  if (inStockCheck)   inStockCheck.checked = true;
  if (searchInput)    searchInput.value = '';
  if (sortSel)        sortSel.value = 'default';
  aplicarFiltros();
});

btnGrid?.addEventListener('click', () => {
  state.viewMode = 'grid';
  btnGrid.classList.add('active');
  btnList.classList.remove('active');
  renderGrid();
});
btnList?.addEventListener('click', () => {
  state.viewMode = 'list';
  btnList.classList.add('active');
  btnGrid.classList.remove('active');
  renderGrid();
});

filterToggle?.addEventListener('click', () => sidebar?.classList.toggle('open'));

prevBtn?.addEventListener('click', () => {
  if (state.currentPage > 1) {
    state.currentPage--;
    renderGrid();
    renderPaginacion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});
nextBtn?.addEventListener('click', () => {
  const total = Math.ceil(state.filtrados.length / state.itemsPerPage);
  if (state.currentPage < total) {
    state.currentPage++;
    renderGrid();
    renderPaginacion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

/* ══════════════════════════════════════════
   CARGAR EQUIPOS DESDE PHP
══════════════════════════════════════════ */
async function cargarEquipos() {
  try {
    const res = await fetch('../backend/api/alquileres.php?accion=equipos');
    if (!res.ok) throw new Error('Error servidor');

    const raw = await res.json();

    const equipos = raw.map(e => ({
      id:             e.id,
      nombre:         e.nombre,
      marca:          'Maquinaria',
      categoria:      'general',
      tarifa_diaria:  parseFloat(e.tarifa_alquiler) || 0,
      descripcion:    e.descripcion || '',
      imagen:         e.img || 'default.png',
      stock:          e.estado === 'disponible' ? 1 : 0,
      disponible:     e.estado === 'disponible',
      estado:         e.estado,
      badge:          null,
    }));

    const maxTarifa = Math.max(...equipos.map(x => Number(x.tarifa_diaria) || 0), 500000);
    if (priceRange) {
      priceRange.max = String(maxTarifa);
      priceRange.value = String(maxTarifa);
    }
    if (priceVal) priceVal.textContent = fmt(maxTarifa);
    state.tarifaMax = maxTarifa;

    state.equipos = equipos;
    state.filtrados = equipos;
    aplicarFiltros();
    renderCarrito();
    console.log('✅ Equipos cargados:', equipos.length);

  } catch (err) {
    console.warn('Error cargando equipos:', err);
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem">Error al cargar equipos</p>';
  }
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
function iniciarAlquileres() {
  if (!grid) return;
  cargarEquipos();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarAlquileres);
} else {
  iniciarAlquileres();
}
