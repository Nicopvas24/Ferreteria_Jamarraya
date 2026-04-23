/* ═══════════════════════════════════════════════════════════════
   cart.js — Carrito compartido global (Navbar)
   Funciona en cualquier página: productos, alquiler, etc.
   Lee/escribe en localStorage bajo la clave 'jm_shared_cart'
═══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  const CART_KEY = 'jm_shared_cart';

  /* ─── Helpers ─── */
  const fmt = (n) => '$' + (Number(n) || 0).toLocaleString('es-CO');

  function normalizarItem(item) {
    return {
      ...item,
      kind:   item.kind  || (item.tarifa > 0 ? 'rental' : 'producto'),
      qty:    Number(item.qty)    || 1,
      tarifa: Number(item.tarifa) || 0,
      precio: Number(item.precio) || 0,
    };
  }

  /* ─── Lectura / escritura ─── */
  function leer() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return (raw ? JSON.parse(raw) : []).map(normalizarItem);
    } catch { return []; }
  }

  function guardar(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items.map(normalizarItem)));
  }

  /* ─── Inyectar HTML del panel en el body ─── */
  function inyectarPanel() {
    if (document.getElementById('global-cart-panel')) return;

    const html = `
    <div id="global-cart-overlay" style="
      display:none; position:fixed; inset:0; background:rgba(0,0,0,.5);
      z-index:9998; backdrop-filter:blur(2px);
    "></div>

    <div id="global-cart-panel" aria-hidden="true" style="
      position:fixed; top:0; right:0; height:100vh; width:360px; max-width:95vw;
      background:#161b22; border-left:1px solid rgba(255,255,255,.08);
      z-index:9999; display:flex; flex-direction:column;
      transform:translateX(100%); transition:transform .3s cubic-bezier(.4,0,.2,1);
      font-family:'Barlow',sans-serif; color:#e6edf3;
    ">
      <!-- Header -->
      <div style="
        display:flex; align-items:center; justify-content:space-between;
        padding:1.1rem 1.25rem; border-bottom:1px solid rgba(255,255,255,.08);
        background:#1f2937; flex-shrink:0;
      ">
        <div style="display:flex;align-items:center;gap:.6rem;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span style="font-family:'Barlow Condensed',sans-serif;font-size:1.15rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">
            Mi Carrito
          </span>
          <span id="gc-badge" style="
            background:#F97316;color:#fff;border-radius:999px;
            font-size:.7rem;font-weight:700;padding:.15rem .5rem;min-width:20px;text-align:center;
          ">0</span>
        </div>
        <button id="gc-close" style="
          background:none;border:none;color:rgba(255,255,255,.5);
          font-size:1.5rem;cursor:pointer;line-height:1;padding:.2rem;
          transition:color .2s;
        " title="Cerrar">✕</button>
      </div>

      <!-- Items -->
      <div id="gc-items" style="flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.75rem;">
        <p style="text-align:center;color:rgba(255,255,255,.35);padding:2rem 0;">Tu carrito está vacío.</p>
      </div>

      <!-- Footer -->
      <div style="
        padding:1rem 1.25rem; border-top:1px solid rgba(255,255,255,.08);
        background:#1f2937; flex-shrink:0;
      ">
        <!-- Subtotales -->
        <div id="gc-subtotals" style="font-size:.8rem;color:rgba(255,255,255,.45);display:grid;gap:.2rem;margin-bottom:.75rem;"></div>
        <!-- Total -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <span style="font-size:.85rem;color:rgba(255,255,255,.6);">Total estimado</span>
          <strong id="gc-total" style="font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;color:#F97316;">$0</strong>
        </div>
        <!-- Botones -->
        <div style="display:grid;gap:.6rem;">
          <button id="gc-btn-comprar" style="
            background:linear-gradient(135deg,#F97316,#C2540A);color:#fff;border:none;
            border-radius:8px;padding:.8rem;font-family:'Barlow Condensed',sans-serif;
            font-size:1rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
            cursor:pointer;transition:opacity .2s;
          ">🛒 Confirmar compra</button>
          <button id="gc-btn-cotizar" style="
            background:rgba(255,255,255,.06);color:rgba(255,255,255,.75);
            border:1px solid rgba(255,255,255,.12);
            border-radius:8px;padding:.75rem;font-family:'Barlow Condensed',sans-serif;
            font-size:.95rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
            cursor:pointer;transition:all .2s;
          ">💬 Solicitar cotización</button>
        </div>
      </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('gc-close').addEventListener('click', cerrar);
    document.getElementById('global-cart-overlay').addEventListener('click', cerrar);
    document.getElementById('gc-btn-comprar').addEventListener('click', onComprar);
    document.getElementById('gc-btn-cotizar').addEventListener('click', onCotizar);
  }

  /* ─── Abrir / cerrar ─── */
  function abrir() {
    inyectarPanel();
    renderPanel();
    document.getElementById('global-cart-panel').style.transform = 'translateX(0)';
    document.getElementById('global-cart-panel').setAttribute('aria-hidden', 'false');
    document.getElementById('global-cart-overlay').style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function cerrar() {
    const panel = document.getElementById('global-cart-panel');
    if (!panel) return;
    panel.style.transform = 'translateX(100%)';
    panel.setAttribute('aria-hidden', 'true');
    document.getElementById('global-cart-overlay').style.display = 'none';
    document.body.style.overflow = '';
  }

  /* ─── Render del panel ─── */
  function renderPanel() {
    inyectarPanel();
    const items = leer();

    /* contador en navbar */
    const totalItems = items.reduce((s, x) => s + x.qty, 0);
    const badge = document.getElementById('gc-badge');
    const navBtn = document.getElementById('headerCartBtn');
    const navCount = document.getElementById('headerCartCount');
    if (badge)    badge.textContent = totalItems;
    if (navCount) navCount.textContent = totalItems;
    if (navBtn)   navBtn.style.display = totalItems > 0 ? 'flex' : '';

    /* subtotales */
    const subProd = items.filter(x => x.kind === 'producto').reduce((s,x) => s + x.precio * x.qty, 0);
    const subAlq  = items.filter(x => x.kind === 'rental').reduce((s,x) => s + x.tarifa * x.qty, 0);
    const total   = subProd + subAlq;

    const elTotal = document.getElementById('gc-total');
    if (elTotal) elTotal.textContent = fmt(total);

    const elSubt = document.getElementById('gc-subtotals');
    if (elSubt) {
      elSubt.innerHTML = items.length === 0 ? '' : `
        <div style="display:flex;justify-content:space-between"><span>Productos</span><strong>${fmt(subProd)}</strong></div>
        <div style="display:flex;justify-content:space-between"><span>Alquileres</span><strong>${fmt(subAlq)}</strong></div>
      `;
    }

    /* lista de items */
    const elItems = document.getElementById('gc-items');
    if (!elItems) return;
    if (items.length === 0) {
      elItems.innerHTML = `<p style="text-align:center;color:rgba(255,255,255,.35);padding:2rem 0;">Tu carrito está vacío.</p>`;
      return;
    }

    elItems.innerHTML = items.map(item => {
      const esAlq = item.kind === 'rental';
      const imgBase = esAlq ? '../assets/img/maquinaria/' : '../assets/img/productos/';
      const img = (item.imagen || '').startsWith('http') || (item.imagen || '').startsWith('../')
        ? (item.imagen || '')
        : imgBase + (item.imagen || 'nombreimagen.webp');
      const precioUnit = esAlq ? item.tarifa : item.precio;
      const chipColor  = esAlq ? 'rgba(88,166,255,.9)' : 'rgba(249,115,22,.9)';
      const chipLabel  = esAlq ? 'Alquiler' : 'Producto';

      return `
      <div class="gc-item" data-id="${item.id}" data-kind="${item.kind}" style="
        display:flex;gap:.75rem;align-items:flex-start;
        background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);
        border-radius:10px;padding:.75rem;
      ">
        <img src="${img}" alt="${item.nombre}" style="
          width:52px;height:52px;object-fit:cover;border-radius:7px;flex-shrink:0;
          background:#0d1117;
        " onerror="this.src='../assets/img/productos/nombreimagen.webp'"/>
        <div style="flex:1;min-width:0;">
          <div style="
            display:inline-flex;align-items:center;font-size:.62rem;text-transform:uppercase;
            letter-spacing:.08em;color:#fff;background:${chipColor};
            padding:.1rem .4rem;border-radius:999px;font-weight:700;margin-bottom:.2rem;
          ">${chipLabel}</div>
          <p style="margin:0 0 .15rem;font-size:.87rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.nombre}</p>
          <span style="font-size:.8rem;color:#F97316;font-weight:700;">${fmt(precioUnit)}${esAlq ? '/día' : ''}</span>
          ${esAlq ? `<div style="font-size:.75rem;color:rgba(255,255,255,.4);margin:.2rem 0"><strong style="color:rgba(255,255,255,.7)">${item.qty}</strong> día${item.qty !== 1 ? 's' : ''}</div>` : ''}
          <!-- controles qty -->
          <div style="display:flex;align-items:center;gap:.3rem;margin-top:.4rem;">
            <button data-action="minus" data-id="${item.id}" data-kind="${item.kind}" style="
              width:24px;height:24px;border-radius:6px;border:1px solid rgba(255,255,255,.15);
              background:rgba(255,255,255,.06);color:#fff;cursor:pointer;font-size:.9rem;
              display:flex;align-items:center;justify-content:center;
            ">−</button>
            <span style="font-size:.85rem;min-width:18px;text-align:center;">${item.qty}</span>
            <button data-action="plus" data-id="${item.id}" data-kind="${item.kind}" style="
              width:24px;height:24px;border-radius:6px;border:1px solid rgba(255,255,255,.15);
              background:rgba(255,255,255,.06);color:#fff;cursor:pointer;font-size:.9rem;
              display:flex;align-items:center;justify-content:center;
            ">+</button>
          </div>
        </div>
        <button data-remove data-id="${item.id}" data-kind="${item.kind}" style="
          background:none;border:none;color:rgba(255,255,255,.3);cursor:pointer;
          font-size:1rem;padding:.2rem;flex-shrink:0;transition:color .2s;
          line-height:1;
        " title="Eliminar">✕</button>
      </div>`;
    }).join('');

    /* eventos qty / remove */
    elItems.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id   = Number(btn.dataset.id);
        const kind = btn.dataset.kind;
        const arr  = leer();
        const idx  = arr.findIndex(x => x.id === id && x.kind === kind);
        if (idx === -1) return;
        if (btn.dataset.action === 'plus')  arr[idx].qty = Math.min(arr[idx].qty + 1, kind === 'rental' ? 365 : 99);
        if (btn.dataset.action === 'minus') arr[idx].qty = Math.max(arr[idx].qty - 1, 1);
        guardar(arr);
        renderPanel();
        if (window.GlobalCart?._onChangeHook) window.GlobalCart._onChangeHook(arr);
      });
    });
    elItems.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id   = Number(btn.dataset.id);
        const kind = btn.dataset.kind;
        const arr  = leer().filter(x => !(x.id === id && x.kind === kind));
        guardar(arr);
        renderPanel();
        if (window.GlobalCart?._onChangeHook) window.GlobalCart._onChangeHook(arr);
      });
    });
  }

  /* ─── Acciones de compra / cotización ─── */
  function onComprar() {
    const usuario = sessionStorage.getItem('jm_nombre');
    if (!usuario) { alert('Debes iniciar sesión para comprar.'); return; }
    const items = leer();
    if (!items.length) return;
    cerrar();
    // Delegar al checkout de la página actual si existe
    if (typeof window._gcAbrirCheckout === 'function') {
      window._gcAbrirCheckout();
    } else {
      // Si no hay checkout local, redirigir a productos con el carrito ya cargado
      window.location.href = '../pages/productos.html';
    }
  }

  function onCotizar() {
    const items = leer();
    if (!items.length) return;
    const lineas = items.map(x => {
      const unit = x.kind === 'rental' ? x.tarifa : x.precio;
      const det  = x.kind === 'rental' ? `${x.qty} día${x.qty !== 1 ? 's' : ''}` : `x${x.qty}`;
      return `• ${x.nombre} (${x.kind === 'rental' ? 'Alquiler' : 'Producto'}) ${det} = ${fmt(unit * x.qty)}`;
    }).join('%0A');
    const total = items.reduce((s,x) => s + (x.kind === 'rental' ? x.tarifa : x.precio) * x.qty, 0);
    const msg = encodeURIComponent(`Hola, quiero cotizar:%0A${lineas}%0A%0ATotal estimado: ${fmt(total)}`);
    window.open(`https://wa.me/573017213193?text=${msg}`, '_blank');
  }

  /* ─── API Pública ─── */
  window.GlobalCart = {
    abrir,
    cerrar,
    renderizar: renderPanel,
    leer,
    guardar,

    agregar(item) {
      const arr = leer();
      const norm = normalizarItem(item);
      const idx  = arr.findIndex(x => x.id === norm.id && x.kind === norm.kind);
      if (idx !== -1) {
        arr[idx].qty = Math.min(
          arr[idx].qty + norm.qty,
          norm.kind === 'rental' ? 365 : (norm.maxStock || 99)
        );
      } else {
        arr.push(norm);
      }
      guardar(arr);
      renderPanel();
      if (this._onChangeHook) this._onChangeHook(arr);
    },

    vaciar() {
      guardar([]);
      renderPanel();
    },

    registrarCheckout(fn) {
      window._gcAbrirCheckout = fn;
    },

    _onChangeHook: null,
    onCambio(fn) { this._onChangeHook = fn; },
  };

  /* ─── Init: conectar botón del navbar ─── */
  function conectarNavbar() {
    inyectarPanel();
    renderPanel(); // actualiza el contador al cargar
    const btn = document.getElementById('headerCartBtn');
    if (btn && !btn._gcBound) {
      btn._gcBound = true;
      btn.style.display = 'flex';
      btn.addEventListener('click', abrir);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', conectarNavbar);
  } else {
    conectarNavbar();
  }

  // También reconectar cuando el navbar se inyecte dinámicamente
  const _observer = new MutationObserver(() => {
    const btn = document.getElementById('headerCartBtn');
    if (btn && !btn._gcBound) conectarNavbar();
  });
  _observer.observe(document.body, { childList: true, subtree: true });

})();
