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
  categoriaActiva: 'todos',
  tarifaMax: 500000,
  duracionActiva: 'daily',
  soloDisponible: true,
  badge: null,
  orderBy: 'default',
  viewMode: 'grid',
  currentPage: 1,
  itemsPerPage: 12,
};

let carrito = [];
let modalEquipo = null;
let modalQty = 1;

/* ══════════════════════════════════════════
   HELPERS FORMAT
══════════════════════════════════════════ */
const fmt = (n) => '$' + n.toLocaleString('es-CO');

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

  if (state.categoriaActiva !== 'todos')
    lista = lista.filter(e => e.categoria === state.categoriaActiva);

  lista = lista.filter(e => e.tarifa_diaria <= state.tarifaMax);

  if (state.soloDisponible)
    lista = lista.filter(e => e.disponible && e.stock > 0);

  if (state.badge)
    lista = lista.filter(e => e.badge === state.badge);

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
  modalQtyVal.textContent = modalQty;
});
modalQtyPlus.addEventListener('click', () => {
  if (modalEquipo && modalQty < modalEquipo.stock)
    modalQty++;
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

  const existe = carrito.find(x => x.id === id);
  if (existe) {
    existe.qty = Math.min(existe.qty + qty, e.stock);
  } else {
    carrito.push({ id, qty, nombre: e.nombre, tarifa: e.tarifa_diaria, imagen: e.imagen });
  }
  renderCarrito();
}

function renderCarrito() {
  const total      = carrito.reduce((s, x) => s + x.tarifa * x.qty, 0);
  const totalItems = carrito.reduce((s, x) => s + x.qty, 0);

  cartCount.textContent = totalItems;
  cartTotal.textContent = fmt(total);

  if (carrito.length === 0) {
    cartItems.innerHTML = '<p class="alq-cart-empty">Tu solicitud está vacía.</p>';
    return;
  }

  cartItems.innerHTML = carrito.map(item => {
    const rutaImagen = item.imagen.startsWith('http') || item.imagen.startsWith('../') 
      ? item.imagen 
      : `../assets/img/maquinaria/${item.imagen}`;
    
    return `
    <div class="alq-cart-item" data-id="${item.id}">
      <img
        src="${rutaImagen}"
        alt="${item.nombre}"
        class="alq-cart-item-img"
        onerror="this.src='../assets/img/default-maquinaria.png'"
      />
      <div class="alq-cart-item-info">
        <p class="alq-cart-item-name">${item.nombre}</p>
        <span class="alq-cart-item-price">${fmt(item.tarifa)}/día</span>
        <div class="alq-cart-qty-mini">
          <button data-action="minus" data-id="${item.id}">−</button>
          <span>${item.qty}</span>
          <button data-action="plus" data-id="${item.id}">+</button>
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
      const item = carrito.find(x => x.id === id);
      const prod = state.equipos.find(x => x.id === id);
      if (!item) return;
      if (btn.dataset.action === 'plus')  item.qty = Math.min(item.qty + 1, prod?.stock || 99);
      if (btn.dataset.action === 'minus') item.qty = Math.max(item.qty - 1, 1);
      renderCarrito();
    });
  });
  $$('.alq-cart-item-remove', cartItems).forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      carrito = carrito.filter(x => x.id !== id);
      renderCarrito();
    });
  });
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
  if (carrito.length === 0) return;
  const lineas = carrito
    .map(x => `• ${x.nombre} x${x.qty} = ${fmt(x.tarifa * x.qty)}`)
    .join('%0A');
  const total = carrito.reduce((s,x) => s + x.tarifa * x.qty, 0);
  const msg = encodeURIComponent(
    `Hola, quiero solicitar el alquiler de estos equipos:%0A%0A${lineas}%0A%0ATotal estimado: ${fmt(total)}`
  );
  window.open(`https://wa.me/573000000000?text=${msg}`, '_blank');
});

/* ══════════════════════════════════════════
   FILTROS – EVENTOS
══════════════════════════════════════════ */
$$('.alq-cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.alq-cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.categoriaActiva = btn.dataset.cat;
    aplicarFiltros();
  });
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

$$('.alq-duration-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.alq-duration-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.duracionActiva = btn.dataset.duration;
  });
});

$$('.alq-badge-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const same = btn.classList.contains('active');
    $$('.alq-badge-btn').forEach(b => b.classList.remove('active'));
    state.badge = same ? null : btn.dataset.badge;
    if (!same) btn.classList.add('active');
    aplicarFiltros();
  });
});

clearBtn?.addEventListener('click', () => {
  state.categoriaActiva = 'todos';
  state.tarifaMax       = 500000;
  state.soloDisponible  = true;
  state.badge           = null;
  state.orderBy         = 'default';
  if (priceRange)   { priceRange.value = 500000; priceVal.textContent = fmt(500000); }
  if (inStockCheck)   inStockCheck.checked = true;
  if (sortSel)        sortSel.value = 'default';
  $$('.alq-cat-btn').forEach(b => b.classList.remove('active'));
  $$('.alq-cat-btn[data-cat="todos"]')[0]?.classList.add('active');
  $$('.alq-duration-btn').forEach(b => b.classList.remove('active'));
  $$('.alq-duration-btn[data-duration="daily"]')[0]?.classList.add('active');
  $$('.alq-badge-btn').forEach(b => b.classList.remove('active'));
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
document.addEventListener('DOMContentLoaded', cargarEquipos);
