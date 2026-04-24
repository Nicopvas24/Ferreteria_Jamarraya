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
  soloDisponible: false,
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

  if (window.GlobalCart) {
    window.GlobalCart.agregar({
      id,
      kind:   'rental',
      qty,
      nombre: e.nombre,
      tarifa: e.tarifa_diaria,
      imagen: e.imagen,
    });
    // Sincroniza el contador del FAB local si existe
    syncFabCount();
    return;
  }

  // Fallback sin GlobalCart
  const existe = carrito.find(x => x.id === id && x.kind === 'rental');
  if (existe) {
    existe.qty = Math.min(existe.qty + qty, 365);
  } else {
    carrito.push({ id, kind: 'rental', qty, nombre: e.nombre, tarifa: e.tarifa_diaria, imagen: e.imagen });
  }
  renderCarrito();
}

function syncFabCount() {
  // Mantiene el FAB local sincronizado con el carrito global
  const items = window.GlobalCart ? window.GlobalCart.leer() : carrito;
  const total = items.reduce((s, x) => s + x.qty, 0);
  if (cartCount) cartCount.textContent = total;
}

function renderCarrito() {
  if (window.GlobalCart) {
    // Delegar render al carrito global; solo sincronizar FAB local
    carrito = window.GlobalCart.leer();
    syncFabCount();
    const total = carrito.reduce((s,x) => s + (x.tarifa || x.precio || 0) * x.qty, 0);
    if (cartTotal) cartTotal.textContent = '$' + total.toLocaleString('es-CO');
    return;
  }

  // Fallback: render local
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

  if (cartCount) cartCount.textContent = totalItems;
  if (cartTotal) cartTotal.textContent = fmt(total);

  if (carrito.length === 0) {
    if (cartItems) cartItems.innerHTML = '<p class="alq-cart-empty">Tu solicitud está vacía.</p>';
    return;
  }

  if (cartItems) {
    cartItems.innerHTML = carrito.map(item => {
      const imagen = item.imagen || 'default.png';
      const rutaImagen = imagen.startsWith('http') || imagen.startsWith('../')
        ? imagen
        : `../assets/img/maquinaria/${imagen}`;
      return `
      <div class="alq-cart-item" data-id="${item.id}" data-kind="${item.kind || 'rental'}">
        <img src="${rutaImagen}" alt="${item.nombre}" class="alq-cart-item-img"
             onerror="this.src='../assets/img/productos/nombreimagen.webp'"/>
        <div class="alq-cart-item-info">
          <p class="alq-cart-item-name">${item.nombre}</p>
          <span class="alq-cart-item-price">${fmt(item.tarifa || item.precio)}/día</span>
          <div class="alq-cart-qty-mini">
            <button data-action="minus" data-id="${item.id}">−</button>
            <span>${item.qty}</span>
            <button data-action="plus" data-id="${item.id}">+</button>
          </div>
        </div>
        <button class="alq-cart-item-remove" data-id="${item.id}">✕</button>
      </div>`;
    }).join('');
  }
}


function abrirCarrito() {
  if (window.GlobalCart) { window.GlobalCart.abrir(); return; }
  cartPanel?.classList.add('open');
  cartOverlay?.classList.add('open');
  cartPanel?.setAttribute('aria-hidden', 'false');
}

function cerrarCarrito() {
  if (window.GlobalCart) { window.GlobalCart.cerrar(); return; }
  cartPanel?.classList.remove('open');
  cartOverlay?.classList.remove('open');
  cartPanel?.setAttribute('aria-hidden', 'true');
}

// Conectar FABs y panels solo si aún existen en el DOM
if (cartFab)     cartFab.addEventListener('click', abrirCarrito);
if (cartClose)   cartClose.addEventListener('click', cerrarCarrito);
if (cartOverlay) cartOverlay.addEventListener('click', cerrarCarrito);

/* ══════════════════════════════════════════
   SOLICITUD/CONTACTO (fallback sin GlobalCart)
══════════════════════════════════════════ */
if (cartCta) {
  cartCta.addEventListener('click', () => {
    const usuario = sessionStorage.getItem('jm_nombre');
    if (!usuario) { alert('Debes iniciar sesión o registrarte para alquilar.'); return; }
    if (carrito.length === 0) return;
    abrirCheckout();
  });
}

cartQuote?.addEventListener('click', () => {
  if (carrito.length === 0) return;
  const lineas = carrito.map(x => {
    const unit   = Number(x.kind === 'rental' ? x.tarifa : x.precio) || 0;
    const detalle = x.kind === 'rental' ? `${x.qty} día${x.qty!==1?'s':''}` : `x${x.qty}`;
    return `• ${x.nombre} (${x.kind === 'rental' ? 'Alquiler' : 'Producto'}) ${detalle} = $${(unit*x.qty).toLocaleString('es-CO')}`;
  }).join('%0A');
  const total = carrito.reduce((s,x) => s + (Number(x.kind==='rental'?x.tarifa:x.precio)||0)*x.qty, 0);
  const msg = encodeURIComponent(`Hola, quiero cotizar:%0A${lineas}%0A%0ATotal estimado: $${total.toLocaleString('es-CO')}`);
  window.open(`https://wa.me/573017213193?text=${msg}`, '_blank');
});

/* ══════════════════════════════════════════
   CHECKOUT MODAL (usa JMCheckout compartido)
══════════════════════════════════════════ */

function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

function abrirCheckout() {
  const usuario = sessionStorage.getItem('jm_nombre');
  if (!usuario) { alert('Debes iniciar sesión para continuar.'); return; }
  if (!carrito.length) return;

  function abrirConJMCheckout() {
    window.JMCheckout.abrir({
      modo: 'alquiler',
      carrito,
      onConfirmar: procesarAlquiler,
    });
  }

  if (window.JMCheckout) {
    abrirConJMCheckout();
  } else {
    const t = setInterval(() => {
      if (window.JMCheckout) { clearInterval(t); abrirConJMCheckout(); }
    }, 50);
    setTimeout(() => clearInterval(t), 3000);
  }
}

function cerrarCheckoutAlquiler() {
  window.JMCheckout?.cerrar();
}

async function procesarAlquiler() {
  const usuario = sessionStorage.getItem('jm_nombre');
  if (!usuario || !carrito.length) throw new Error('Datos incompletos');

  const carritoSnapshot = [...carrito];
  const total = carritoSnapshot.reduce((s,x) => s + (x.tarifa || 0) * x.qty, 0);

  // Simular pasarela
  const pasos = ['Validando datos del alquiler...', 'Autorizando solicitud...', `Confirmando alquiler por ${fmt(total)}...`];
  for (const paso of pasos) {
    window.JMCheckout?.setStatus('⟳ ' + paso);
    await esperar(650);
  }
  window.JMCheckout?.setStatus('✓ Aprobado. Registrando alquiler...');

  // Obtener id_cliente
  let idCliente = null;
  const resV = await fetch('../backend/usuarios.php?accion=verificar');
  const dV   = await resV.json();
  if (dV.ok) idCliente = dV.id_cliente;

  if (!idCliente) {
    const email          = sessionStorage.getItem('jm_email') || '';
    const telefono       = sessionStorage.getItem('jm_telefono') || '';
    const identificacion = sessionStorage.getItem('jm_identificacion') || '';
    const clienteRes  = await fetch('../backend/api/clientes.php?accion=registrar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: usuario, identificacion, telefono, email, direccion: 'Alquiler web' })
    });
    const clienteData = await clienteRes.json();
    idCliente = clienteData.id || clienteData.id_cliente;
  }
  if (!idCliente) throw new Error('No se pudo identificar el cliente');

  // Registrar alquileres
  const hoyDate = new Date(); hoyDate.setHours(0,0,0,0);
  const fechaInicio = toISODateLocal(hoyDate);
  const alquileres  = carritoSnapshot.filter(x => x.kind === 'rental');

  for (const alq of alquileres) {
    const fechaFin = toISODateLocal(sumarDiasIncluyente(hoyDate, alq.qty));
    await fetch('../backend/api/alquileres.php?accion=registrar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_cliente: idCliente, id_maquinaria: alq.id, fecha_inicio: fechaInicio, fecha_fin: fechaFin, monto: (alq.tarifa || 0) * alq.qty })
    });
  }

  // Limpiar carrito
  carrito = [];
  guardarCarritoCompartido([]);
  if (window.GlobalCart) window.GlobalCart.vaciar(); else renderCarrito();
  window.JMCheckout?.cerrar();

  // Modal de éxito
  mostrarExitoAlquiler(alquileres, total, fechaInicio);
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

function mostrarExitoAlquiler(alquileres, total, fechaInicio) {
  document.getElementById('alq-detalle-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'alq-detalle-modal';
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);' +
    'backdrop-filter:blur(6px);display:flex;align-items:center;' +
    'justify-content:center;padding:20px;font-family:Barlow,sans-serif;';

  const itemsHTML = alquileres.map(alq => {
    const fechaFin = toISODateLocal(sumarDiasIncluyente(new Date(fechaInicio + 'T00:00:00'), alq.qty));
    return `
      <tr>
        <td style="padding:.6rem .75rem;color:rgba(255,255,255,.7);font-size:.82rem">🔧 Maquinaria</td>
        <td style="padding:.6rem .75rem;font-weight:600">${alq.nombre}</td>
        <td style="padding:.6rem .75rem;text-align:center;color:rgba(255,255,255,.8)">${alq.qty} día${alq.qty!==1?'s':''}<br><small style="color:rgba(255,255,255,.4);font-size:.75rem">${fechaInicio} → ${fechaFin}</small></td>
        <td style="padding:.6rem .75rem;text-align:right;color:#F97316;font-weight:700">${fmt((alq.tarifa||0)*alq.qty)}</td>
      </tr>`;
  }).join('');

  overlay.innerHTML = `
    <div style="
      background:#181818;border:1px solid rgba(255,255,255,.1);
      border-radius:16px;padding:0;max-width:580px;width:100%;
      max-height:90vh;overflow-y:auto;
      box-shadow:0 24px 80px rgba(0,0,0,.7);color:#fff;
    ">
      <div style="
        background:linear-gradient(135deg,#F97316,#C2540A);
        padding:1.5rem 2rem;border-radius:16px 16px 0 0;
        display:flex;justify-content:space-between;align-items:flex-start;
      ">
        <div>
          <div style="font-size:.72rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:.85;margin-bottom:.4rem">✓ Alquiler Confirmado</div>
          <h2 style="margin:0;font-size:1.4rem;font-weight:900;font-family:'Barlow Condensed',sans-serif;">Solicitud Registrada</h2>
          <p style="margin:.3rem 0 0;font-size:.85rem;opacity:.85;">Inicio: ${fechaInicio}</p>
        </div>
        <button id="alq-detalle-close" style="
          background:rgba(255,255,255,.2);border:none;color:#fff;
          width:34px;height:34px;border-radius:50%;font-size:1.1rem;
          cursor:pointer;display:flex;align-items:center;justify-content:center;
        ">✕</button>
      </div>

      <div style="padding:1.5rem 2rem;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid rgba(255,255,255,.1);">
              <th style="padding:.5rem .75rem;text-align:left;font-size:.72rem;color:rgba(255,255,255,.4);font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Tipo</th>
              <th style="padding:.5rem .75rem;text-align:left;font-size:.72rem;color:rgba(255,255,255,.4);font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Equipo</th>
              <th style="padding:.5rem .75rem;text-align:center;font-size:.72rem;color:rgba(255,255,255,.4);font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Días / Fechas</th>
              <th style="padding:.5rem .75rem;text-align:right;font-size:.72rem;color:rgba(255,255,255,.4);font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>

        <div style="display:flex;justify-content:space-between;align-items:center;
          border-top:1px solid rgba(255,255,255,.1);margin-top:1rem;padding-top:1rem;">
          <span style="color:rgba(255,255,255,.5);font-size:.9rem;">Total</span>
          <strong style="font-family:'Barlow Condensed',sans-serif;font-size:1.6rem;color:#F97316;">${fmt(total)}</strong>
        </div>

        <div style="background:rgba(249,115,22,.08);border:1px solid rgba(249,115,22,.2);
          border-radius:8px;padding:.85rem 1rem;margin-top:1.25rem;">
          <p style="margin:0;font-size:.82rem;color:rgba(255,255,255,.6);line-height:1.5;">
            📧 Recibirás un correo de confirmación con los detalles de tu alquiler y las fechas de entrega.
          </p>
        </div>

        <button id="alq-detalle-ok" style="
          width:100%;margin-top:1.25rem;padding:.85rem;border:none;border-radius:8px;cursor:pointer;
          background:linear-gradient(135deg,#F97316,#C2540A);color:#fff;
          font-family:'Barlow Condensed',sans-serif;font-size:1.05rem;font-weight:700;
          letter-spacing:.04em;text-transform:uppercase;
        ">Cerrar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('alq-detalle-close').addEventListener('click', () => overlay.remove());
  document.getElementById('alq-detalle-ok').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
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

/* ════════════════════════════════════════════
   INTEGRACIÓN CON CARRITO GLOBAL
════════════════════════════════════════════ */
(function initGlobalCartIntegration() {
  function registrar() {
    if (!window.GlobalCart) return;
    // Sincronizar carrito local con GlobalCart
    window.GlobalCart.onCambio((items) => { carrito = items; });
    carrito = window.GlobalCart.leer();
  }

  if (window.GlobalCart) {
    registrar();
  } else {
    const t = setInterval(() => {
      if (window.GlobalCart) { clearInterval(t); registrar(); }
    }, 80);
    setTimeout(() => clearInterval(t), 5000);
  }
})();

/* ════════════════════════════════════════════
   ARRANQUE
════════════════════════════════════════════ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarAlquileres);
} else {
  iniciarAlquileres();
}
