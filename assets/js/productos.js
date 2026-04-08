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
const cartBuy       = $('#pp-cart-buy');
const cartItems     = $('#pp-cart-items');
const cartTotal     = $('#pp-cart-total');
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
  carrito: [],
  modalProducto: null,
  modalCantidad: 1,
};

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const fmt = (n) => '$' + n.toLocaleString('es-CO');

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
          onerror="this.src='../assets/img/productos/nombreimagen.png'"
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
  $('#pp-modal-img').onerror = () => { $('#pp-modal-img').src = '../assets/img/productos/nombreimagen.png'; };
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

  const existe = state.carrito.find(x => x.id === id);
  if (existe) {
    existe.qty = Math.min(existe.qty + qty, p.stock);
  } else {
    state.carrito.push({ id, qty, nombre: p.nombre, precio: p.precio, imagen: p.imagen });
  }
  renderCarrito();
}

function renderCarrito() {
  const total      = state.carrito.reduce((s, x) => s + x.precio * x.qty, 0);
  const totalItems = state.carrito.reduce((s, x) => s + x.qty, 0);

  cartCount.textContent = totalItems;
  cartTotal.textContent = fmt(total);

  if (state.carrito.length === 0) {
    cartItems.innerHTML = '<p class="pp-cart-empty">Tu carrito está vacío.</p>';
    return;
  }

  cartItems.innerHTML = state.carrito.map(item => `
    <div class="pp-cart-item" data-id="${item.id}">
      <img
        src="../assets/img/productos/${item.imagen}"
        alt="${item.nombre}"
        class="pp-cart-item-img"
        onerror="this.src='../assets/img/productos/nombreimagen.png'"
      />
      <div class="pp-cart-item-info">
        <p class="pp-cart-item-name">${item.nombre}</p>
        <span class="pp-cart-item-price">${fmt(item.precio)}</span>
        <div class="pp-cart-qty-mini">
          <button data-action="minus" data-id="${item.id}">−</button>
          <span>${item.qty}</span>
          <button data-action="plus" data-id="${item.id}">+</button>
        </div>
      </div>
      <div class="pp-cart-item-qty">
        <button class="pp-cart-item-remove" data-id="${item.id}" title="Eliminar">✕</button>
      </div>
    </div>`).join('');

  cartItems.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = Number(btn.dataset.id);
      const item = state.carrito.find(x => x.id === id);
      const prod = state.productos.find(x => x.id === id);
      if (!item) return;
      if (btn.dataset.action === 'plus')  item.qty = Math.min(item.qty + 1, prod?.stock || 99);
      if (btn.dataset.action === 'minus') item.qty = Math.max(item.qty - 1, 1);
      renderCarrito();
    });
  });
  cartItems.querySelectorAll('.pp-cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      state.carrito = state.carrito.filter(x => x.id !== id);
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
}

cartFab.addEventListener('click', abrirCarrito);
cartClose.addEventListener('click', cerrarCarrito);
cartOverlay.addEventListener('click', cerrarCarrito);

/* ══════════════════════════════════════════
   COTIZACIÓN
══════════════════════════════════════════ */
$('#pp-cart-cta').addEventListener('click', () => {
  if (state.carrito.length === 0) return;
  const lineas = state.carrito
    .map(x => `• ${x.nombre} x${x.qty} = ${fmt(x.precio * x.qty)}`)
    .join('\n');
  const total = state.carrito.reduce((s,x) => s + x.precio * x.qty, 0);
  const msg = encodeURIComponent(
    `Hola, quiero cotizar estos productos:\n\n${lineas}\n\nTotal estimado: ${fmt(total)}`
  );
  window.open(`https://wa.me/573000000000?text=${msg}`, '_blank');
});

/* ══════════════════════════════════════════
   COMPRAR
   [ CONECTAR PAGO ] — cambia la URL cuando
   tengas lista la página de pago
══════════════════════════════════════════ */
cartBuy?.addEventListener('click', () => {
  if (state.carrito.length === 0) return;
  window.location.href = '../pages/pago.html';
});

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
      imagen:      p.img           ?? 'nombreimagen.png',
      stock:       p.stock_actual,
      badge:       p.badge         ?? '',
      envioGratis: p.envio_gratis == 1
    }));

    state.productos = productos;
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