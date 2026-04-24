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
  function abrirCheckout({ modo = 'compra', carrito = [], onConfirmar = null } = {}) {
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
      asesorDesc    = 'Una vez registrado tu pedido, un asesor se comunicará contigo para coordinar la entrega de los productos (envío o recogida en tienda) y los detalles del alquiler de los equipos.';
    } else if (tieneAlquiler) {
      titulo        = 'Confirmar Alquiler';
      subtitulo     = 'Completa tu información para proceder con la solicitud';
      resumenTitulo = '💰 Resumen del Alquiler';
      btnTexto      = 'Confirmar Alquiler';
      asesorDesc    = 'Una vez registrada tu solicitud, un asesor se comunicará contigo para coordinar los detalles de entrega, fechas y condiciones del alquiler del equipo.';
    } else {
      titulo        = 'Finalizar Compra';
      subtitulo     = 'Completa tu información para proceder con el pedido';
      resumenTitulo = '💰 Resumen del Pedido';
      btnTexto      = 'Confirmar Compra';
      asesorDesc    = 'Una vez registrada tu compra, un asesor se comunicará contigo para coordinar la entrega a domicilio o la recogida en nuestra tienda (Calle 10-19, Apía, Risaralda).';
    }

    if (el('jm-checkout-title'))    el('jm-checkout-title').textContent    = titulo;
    if (el('jm-checkout-subtitle')) el('jm-checkout-subtitle').textContent = subtitulo;
    if (el('jm-resumen-title'))     el('jm-resumen-title').textContent     = resumenTitulo;
    if (el('jm-submit-text'))       el('jm-submit-text').textContent       = btnTexto;
    if (el('jm-asesor-desc'))       el('jm-asesor-desc').textContent       = asesorDesc;

    // Pre-rellenar datos de sesión
    const campos = {
      'jm-co-nombre':         sessionStorage.getItem('jm_nombre')         || '',
      'jm-co-email':          sessionStorage.getItem('jm_email')          || '',
      'jm-co-telefono':       sessionStorage.getItem('jm_telefono')       || '',
      'jm-co-identificacion': sessionStorage.getItem('jm_identificacion') || '',
    };
    Object.entries(campos).forEach(([id, val]) => {
      const input = el(id);
      if (input && !input.value) input.value = val;
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
      if (typeof _onConfirmar !== 'function') return;

      const btn     = el('jm-checkout-submit');
      const spinner = el('jm-submit-spinner');
      if (btn)     btn.disabled = true;
      if (spinner) spinner.hidden = false;

      try {
        await _onConfirmar({
          nombre:         el('jm-co-nombre')?.value         || '',
          email:          el('jm-co-email')?.value          || '',
          telefono:       el('jm-co-telefono')?.value       || '',
          identificacion: el('jm-co-identificacion')?.value || '',
          notas:          el('jm-co-notas')?.value          || '',
          delivery:       document.querySelector('[name="delivery"]:checked')?.value || 'tienda',
          direccion:      el('jm-co-direccion')?.value      || '',
          ciudad:         el('jm-co-ciudad')?.value         || '',
          departamento:   el('jm-co-departamento')?.value   || '',
        });
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
