'use strict';

/* ══════════════════════════════════════════
   JM CHECKOUT — Modal compartido
   Usado por productos.js y alquiler.js
   Se inyecta via include.js
══════════════════════════════════════════ */

(function () {

  const fmt = (n) => '$' + (Number(n) || 0).toLocaleString('es-CO');

  /* ── Callback registrado por la página actual ── */
  let _onConfirmar = null;

  /** Registra el callback que procesa la compra/alquiler al confirmar */
  window.JMCheckout = {
    registrar(fn) { _onConfirmar = fn; },
    abrir: abrirCheckout,
    cerrar: cerrarCheckout,
  };

  /* ── Elementos DOM ── */
  function el(id) { return document.getElementById(id); }

  /* ── Abrir modal ── */
  async function abrirCheckout({ modo = 'compra', carrito = [], onConfirmar = null } = {}) {
    const modal   = el('jm-checkout-modal');
    const overlay = el('jm-checkout-overlay');
    if (!modal) return;

    // Guardar callback
    if (typeof onConfirmar === 'function') _onConfirmar = onConfirmar;

    // Detectar composición del carrito
    const tieneProductos = carrito.some(x => x.kind !== 'rental');
    const tieneAlquiler  = carrito.some(x => x.kind === 'rental');
    const esMixto        = tieneProductos && tieneAlquiler;

    // Textos adaptativos según contenido
    let titulo, subtitulo, resumenTitulo, btnTexto, asesorDesc;

    if (esMixto) {
      titulo        = 'Confirmar Pedido';
      subtitulo     = 'Completa tu información para proceder con tu pedido mixto';
      resumenTitulo = '💰 Resumen del Pedido';
      btnTexto      = 'Confirmar Pedido';
      asesorDesc    = 'Una vez registrado tu pedido, un asesor se comunicará contigo para coordinar la entrega de los productos y los detalles del alquiler.';
    } else if (tieneAlquiler) {
      titulo        = 'Confirmar Alquiler';
      subtitulo     = 'Completa tu información para proceder con la solicitud';
      resumenTitulo = '💰 Resumen del Alquiler';
      btnTexto      = 'Confirmar Alquiler';
      asesorDesc    = 'Una vez registrada tu solicitud, un asesor se comunicará contigo para coordinar los detalles de entrega y fechas del alquiler.';
    } else {
      titulo        = 'Finalizar Compra';
      subtitulo     = 'Completa tu información para proceder con el pedido';
      resumenTitulo = '💰 Resumen del Pedido';
      btnTexto      = 'Confirmar Compra';
      asesorDesc    = 'Una vez registrada tu compra, un asesor se comunicará contigo para coordinar la entrega a domicilio o la recogida en tienda.';
    }

    if (el('jm-checkout-title'))    el('jm-checkout-title').textContent    = titulo;
    if (el('jm-checkout-subtitle')) el('jm-checkout-subtitle').textContent = subtitulo;
    if (el('jm-resumen-title'))     el('jm-resumen-title').textContent     = resumenTitulo;
    if (el('jm-submit-text'))       el('jm-submit-text').textContent       = btnTexto;
    if (el('jm-asesor-desc'))       el('jm-asesor-desc').textContent       = asesorDesc;

    // Asegurarse de que los campos estén en blanco para que el usuario los llene manualmente
    const campos = ['jm-co-nombre', 'jm-co-email', 'jm-co-telefono', 'jm-co-identificacion', 'jm-co-notas'];
    campos.forEach(id => {
      const input = el(id);
      if (input) input.value = '';
    });

    // Rellenar resumen
    const total = carrito.reduce((s, x) => s + (x.tarifa || x.precio || 0) * x.qty, 0);
    if (el('jm-checkout-total')) el('jm-checkout-total').textContent = fmt(total);
    if (el('jm-summary-items')) {
      el('jm-summary-items').innerHTML = carrito.map(item => {
        const dias  = item.kind === 'rental'
          ? `${item.qty} día${item.qty !== 1 ? 's' : ''}`
          : `x${item.qty}`;
        const label = item.kind === 'rental' ? '(Alquiler)' : '(Producto)';
        return `
          <div class="jm-summary-item">
            <span>${item.nombre} <small style="opacity:.5">${label}</small>
              <strong> ${dias}</strong>
            </span>
            <strong>${fmt((item.tarifa || item.precio || 0) * item.qty)}</strong>
          </div>`;
      }).join('');
    }

    // Reset estado botón/status
    resetBtnStatus();

    // Mostrar modal
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  /* ── Cerrar modal ── */
  function cerrarCheckout() {
    const modal   = el('jm-checkout-modal');
    const overlay = el('jm-checkout-overlay');
    if (!modal) return;
    if (modal.contains(document.activeElement)) document.activeElement.blur();
    modal.classList.remove('open');
    overlay?.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* ── Reset botón ── */
  function resetBtnStatus(texto = null) {
    const btn     = el('jm-checkout-submit');
    const txt     = el('jm-submit-text');
    const spinner = el('jm-submit-spinner');
    const status  = el('jm-gateway-status');
    if (btn)     { btn.disabled = false; }
    if (txt && texto)  txt.textContent = texto;
    if (spinner) spinner.hidden = true;
    if (status)  { status.style.display = 'none'; status.textContent = ''; status.className = 'jm-gateway-status'; }
  }

  /* ── Actualizar status pasarela ── */
  function setStatus(msg, error = false) {
    const status = el('jm-gateway-status');
    const txt    = el('jm-submit-text');
    if (!status) return;
    status.style.display = 'block';
    status.textContent   = msg;
    status.className     = 'jm-gateway-status' + (error ? ' error' : '');
    if (txt && !error) txt.textContent = msg;
  }

  /* ── Exponer helpers para que los JS de página los usen ── */
  window.JMCheckout.setStatus    = setStatus;
  window.JMCheckout.resetStatus  = resetBtnStatus;

  /* ── Procesamiento Unificado (Sustituye callbacks) ── */
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

  async function procesarPedidoUnificado(formDatos, carritoItems) {
    if (!carritoItems || !carritoItems.length) throw new Error('El carrito está vacío');

    let idCliente = null;
    try {
      const resV = await fetch('../backend/usuarios.php?accion=verificar');
      const dV = await resV.json();
      if (dV.ok) idCliente = dV.id_cliente || null;
    } catch(e){}

    if (!idCliente) {
      try {
        const usuario = sessionStorage.getItem('jm_nombre') || formDatos.nombre || 'Cliente Web';
        const clienteRes = await fetch('../backend/api/clientes.php?accion=registrar', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            nombre: usuario, 
            identificacion: formDatos.identificacion || '000000', 
            telefono: formDatos.telefono || '000000', 
            email: formDatos.email || '', 
            direccion: formDatos.direccion || 'Web' 
          })
        });
        const clienteData = await clienteRes.json();
        idCliente = clienteData.id || clienteData.id_cliente;
      } catch(e) {
        console.warn('Error auto-registrando cliente:', e);
      }
    }

    if (!idCliente) throw new Error('No se pudo identificar ni registrar al cliente.');

    const productos  = carritoItems.filter(x => x.kind !== 'rental');
    const alquileres = carritoItems.filter(x => x.kind === 'rental');

    const promises = [];

    // 1. Productos
    if (productos.length > 0) {
      const items = productos.map(item => ({ id_producto: item.id, cantidad: item.qty, precio_unitario: item.precio || item.tarifa || 0 }));
      const totalVenta = productos.reduce((s,x) => s + (x.precio || x.tarifa || 0) * x.qty, 0);
      promises.push(
        fetch('../backend/api/ventas.php?accion=registrar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_cliente: idCliente,
            items: items,
            total: totalVenta,
            notas: formDatos.notas,
            delivery: formDatos.delivery
          })
        }).then(r => r.json()).then(res => {
          if (!res.ok && !res.id_venta) throw new Error(res.mensaje || res.error || 'Error en venta');
          return res;
        })
      );
    }

    // 2. Alquileres
    if (alquileres.length > 0) {
      const hoyDate = new Date(); hoyDate.setHours(0, 0, 0, 0);
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
              monto: (alq.tarifa || alq.precio || 0) * alq.qty
            })
          }).then(r => r.json()).then(res => {
            if (!res.ok && !res.id_alquiler) throw new Error(res.mensaje || res.error || 'Error en alquiler');
            return res;
          })
        );
      }
    }

    return Promise.all(promises);
  }

  /* ── Modal de Éxito Unificado ── */
  async function mostrarComprobanteUnificado(resultados, carritoSnap) {
    const fmt2 = (n) => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', minimumFractionDigits:0 }).format(n);
    const hoy  = new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' });

    const itemsProducto  = carritoSnap.filter(x => x.kind !== 'rental');
    const itemsAlquiler  = carritoSnap.filter(x => x.kind === 'rental');

    const ventaResult   = resultados.find(r => r.id_venta);
    const alqResultados = resultados.filter(r => r.id_alquiler);

    let ventaAPI = null;
    if (ventaResult?.id_venta) {
      try {
        const r = await fetch('../backend/api/ventas.php?accion=detalle&id=' + ventaResult.id_venta);
        const d = await r.json();
        if (!d.error) ventaAPI = d;
      } catch(_) {}
    }

    const comprobante = ventaAPI?.comprobante 
      || (ventaResult?.id_venta ? `VTA-${String(ventaResult.id_venta).padStart(5,'0')}` : null)
      || (alqResultados[0]?.id_alquiler ? `ALQ-${String(alqResultados[0].id_alquiler).padStart(5,'0')}` : null)
      || 'PED-' + Date.now().toString().slice(-6);

    const clienteNombre = ventaAPI?.cliente || sessionStorage.getItem('jm_nombre') || '—';

    let tablaProductosHTML = '';
    if (itemsProducto.length > 0) {
      const filas = (ventaAPI?.items?.length ? ventaAPI.items : itemsProducto.map(p => ({
        codigo: p.codigo || '—', nombre: p.nombre, cantidad: p.qty, precio_unitario: p.precio || p.tarifa || 0, subtotal: (p.precio || p.tarifa || 0) * p.qty
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
              <thead><tr style="background:rgba(255,107,0,0.12)"><th style="padding:.55rem .75rem;text-align:left;color:#FF6B00">CÓD.</th><th style="padding:.55rem .75rem;text-align:left;color:#FF6B00">PRODUCTO</th><th style="padding:.55rem .75rem;text-align:center;color:#FF6B00">CANT.</th><th style="padding:.55rem .75rem;text-align:right;color:#FF6B00">P.U.</th><th style="padding:.55rem .75rem;text-align:right;color:#FF6B00">SUBTOTAL</th></tr></thead>
              <tbody style="color:#fff">${filas}</tbody>
            </table>
          </div>
        </div>`;
    }

    let tablaAlquilerHTML = '';
    if (itemsAlquiler.length > 0) {
      const hoyDate = new Date(); hoyDate.setHours(0,0,0,0);
      const filas = itemsAlquiler.map((alq, i) => {
        const dias = alq.qty; const tarifa = alq.tarifa || alq.precio || 0; const monto = tarifa * dias;
        const idAlq = alqResultados[i]?.id_alquiler;
        const finDate = new Date(hoyDate); finDate.setDate(hoyDate.getDate() + Math.max(0, dias - 1));
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
              <thead><tr style="background:rgba(88,166,255,0.08)"><th style="padding:.55rem .75rem;text-align:left;color:#58a6ff">ID</th><th style="padding:.55rem .75rem;text-align:left;color:#58a6ff">EQUIPO</th><th style="padding:.55rem .75rem;text-align:center;color:#58a6ff">DURACIÓN</th><th style="padding:.55rem .75rem;text-align:right;color:#58a6ff">TARIFA</th><th style="padding:.55rem .75rem;text-align:right;color:#58a6ff">INICIO</th><th style="padding:.55rem .75rem;text-align:right;color:#58a6ff">FIN EST.</th><th style="padding:.55rem .75rem;text-align:right;color:#58a6ff">MONTO</th></tr></thead>
              <tbody style="color:#fff">${filas}</tbody>
            </table>
          </div>
        </div>`;
    }

    const totalGlobal = carritoSnap.reduce((s, x) => s + (x.tarifa || x.precio || 0) * x.qty, 0);

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Barlow,sans-serif';
    overlay.innerHTML = `
      <div style="background:#181818;border:1px solid rgba(255,255,255,0.12);border-radius:16px;max-width:680px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.7);color:#fff">
        <div style="background:linear-gradient(135deg,#FF6B00,#e55a00);padding:1.4rem 2rem;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:flex-start">
          <div><div style="font-size:.72rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:.85;margin-bottom:.3rem">✓ Pedido Confirmado</div><h2 style="margin:0;font-size:1.4rem;font-weight:900">${comprobante}</h2><p style="margin:.3rem 0 0;font-size:.82rem;opacity:.85">${hoy}</p></div>
          <button id="pp-detalle-close-btn" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>
        </div>
        <div style="padding:.9rem 2rem;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;gap:2rem;flex-wrap:wrap">
          <div><span style="font-size:.72rem;color:#aaa;display:block;margin-bottom:.2rem">CLIENTE</span><strong>${clienteNombre}</strong></div><div><span style="font-size:.72rem;color:#aaa;display:block;margin-bottom:.2rem">FECHA</span><strong>${hoy}</strong></div>
        </div>
        <div style="padding:1.5rem 2rem">
          ${tablaProductosHTML}
          ${tablaAlquilerHTML}
          <div style="padding:1rem 1.25rem;background:rgba(255,107,0,0.08);border:1px solid rgba(255,107,0,0.2);border-radius:8px;display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem">
            <span style="font-weight:600;color:#aaa">Total del Pedido</span><span style="font-size:1.45rem;font-weight:900;color:#FF6B00">${fmt2(totalGlobal)}</span>
          </div>
          <button id="pp-detalle-accept-btn" style="display:block;width:100%;padding:.85rem;background:#FF6B00;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer">Aceptar y cerrar</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    const close = () => { overlay.remove(); window.location.reload(); }; // Refrescar para limpiar estado
    document.getElementById('pp-detalle-close-btn').addEventListener('click', close);
    document.getElementById('pp-detalle-accept-btn').addEventListener('click', close);
  }

  /* ── Inicializar listeners cuando el DOM esté listo ── */
  function init() {
    const modal   = el('jm-checkout-modal');
    const overlay = el('jm-checkout-overlay');
    const closeBtn= el('jm-checkout-close');
    const form    = el('jm-checkout-form');
    if (!modal) return;

    closeBtn?.addEventListener('click', cerrarCheckout);
    overlay?.addEventListener('click', cerrarCheckout);

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btn     = el('jm-checkout-submit');
      const spinner = el('jm-submit-spinner');
      if (btn)     btn.disabled = true;
      if (spinner) spinner.hidden = false;

      const carritoSnap = window.GlobalCart ? window.GlobalCart.leer() : [];
      
      try {
        const formDatos = {
          nombre:         el('jm-co-nombre')?.value         || '',
          email:          el('jm-co-email')?.value          || '',
          telefono:       el('jm-co-telefono')?.value       || '',
          identificacion: el('jm-co-identificacion')?.value || '',
          notas:          el('jm-co-notas')?.value          || '',
          delivery:       'tienda',
          ciudad:         el('jm-co-ciudad')?.value         || '',
          departamento:   el('jm-co-departamento')?.value   || '',
        };

        setStatus('⟳ Validando pedido mixto...');
        await new Promise(r => setTimeout(r, 600));

        // Enviar a backend
        const resultados = await procesarPedidoUnificado(formDatos, carritoSnap);

        setStatus('✓ Aprobado. Registrando...');
        await new Promise(r => setTimeout(r, 400));

        // Éxito: vaciar carrito y cerrar
        if (window.GlobalCart) window.GlobalCart.vaciar();
        cerrarCheckout();

        // Mostrar un solo modal de confirmación
        mostrarComprobanteUnificado(resultados, carritoSnap);

      } catch (err) {
        console.error('[JMCheckout]', err);
        setStatus('❌ ' + err.message, true);
        if (btn) btn.disabled = false;
        if (spinner) spinner.hidden = true;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
