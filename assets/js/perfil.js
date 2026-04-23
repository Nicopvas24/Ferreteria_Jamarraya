'use strict';

/* ══════════════════════════════════════════
   FERRETERÍA JAMARRAYA – perfil.js
   Rutas API:
   - Verificar sesión: /backend/usuarios.php?accion=verificar
   - Clientes:        /backend/api/clientes.php
   - Ventas:          /backend/api/ventas.php
══════════════════════════════════════════ */

const API_USUARIOS = '../backend/usuarios.php';
const API_CLIENTES = '../backend/api/clientes.php';
const API_VENTAS = '../backend/api/ventas.php';
const API_ALQUILERES = '../backend/api/alquileres.php';

/* ── DOM ── */
const form          = document.getElementById('pf-form');
const submitBtn     = document.getElementById('pf-submit');
const alertError    = document.getElementById('pf-alert-error');
const alertSuccess  = document.getElementById('pf-alert-success');
const sidebarNombre = document.getElementById('pf-sidebar-nombre');
const avatarLetra   = document.getElementById('pf-avatar-letra');
const rolBadge      = document.getElementById('pf-rol-badge');
const logoutBtn     = document.getElementById('pf-logout');

/* ── ESTADO ── */
let clienteId = null;

/* ══════════════════════════════════════════
   ALERTAS
══════════════════════════════════════════ */
function mostrarError(msg) {
  alertError.textContent = msg;
  alertError.classList.add('show');
  alertSuccess.classList.remove('show');
  setTimeout(() => alertError.classList.remove('show'), 5000);
}

function mostrarExito(msg) {
  alertSuccess.textContent = msg;
  alertSuccess.classList.add('show');
  alertError.classList.remove('show');
  setTimeout(() => alertSuccess.classList.remove('show'), 5000);
}

/* ══════════════════════════════════════════
   CARGAR PERFIL Y COMPRAS
══════════════════════════════════════════ */
async function cargarPerfil() {
  try {
    // 1. Verificar sesión
    const resVerify = await fetch(`${API_USUARIOS}?accion=verificar`);
    const dataVerify = await resVerify.json();

    if (!dataVerify.ok) {
      alert('Debes iniciar sesión primero');
      window.location.href = './index.html';
      return;
    }

    const { rol, nombre } = dataVerify;

    // 2. Actualizar sidebar
    sidebarNombre.textContent  = nombre || 'Usuario';
    avatarLetra.textContent    = (nombre || 'U').charAt(0).toUpperCase();
    rolBadge.textContent       = rol === 'empleado' ? 'Empleado' : 'Cliente';
    document.getElementById('per_rol').value = rol === 'empleado' ? 'Empleado' : 'Cliente';

    // 3. Si es cliente cargar sus datos
    if (rol === 'cliente') {
      const nombreGuardado = sessionStorage.getItem('jm_nombre') || nombre;
      const resClientes = await fetch(
        `${API_CLIENTES}?accion=listar&buscar=${encodeURIComponent(nombreGuardado)}`
      );
      const clientes = await resClientes.json();

      if (clientes.length > 0) {
        const c = clientes[0];
        clienteId = c.id;
        document.getElementById('per_nombre').value         = c.nombre         || '';
        document.getElementById('per_email').value          = c.email          || '';
        document.getElementById('per_identificacion').value = c.identificacion  || '';
        document.getElementById('per_telefono').value       = c.telefono        || '';
        document.getElementById('per_ciudad').value         = c.ciudad          || '';
        document.getElementById('per_direccion').value      = c.direccion       || '';

        // Cargar compras después de obtener el ID del cliente
        await cargarMisCompras(clienteId);
      } else {
        mostrarError('No se encontró tu perfil de cliente.');
      }
    }

    // 4. Si es empleado, solo mostrar nombre y deshabilitar edición
    if (rol === 'empleado') {
      document.getElementById('per_nombre').value = nombre || '';
      submitBtn.disabled = true;
      submitBtn.title    = 'Los empleados no pueden editar el perfil desde aquí';
    }

  } catch (err) {
    console.error('Error cargando perfil:', err);
    mostrarError('Error de conexión al cargar el perfil.');
  }
}

/* ══════════════════════════════════════════
   CARGAR MIS COMPRAS
══════════════════════════════════════════ */
async function cargarMisCompras(idCliente) {
  try {
    const res = await fetch(`${API_VENTAS}?accion=mis_compras&id_cliente=${idCliente}`);
    const data = await res.json();

    if (!data.ok) {
      mostrarError(data.error || 'Error al cargar compras');
      return;
    }

    renderizarMisCompras(data.compras || [], data.alquileres || []);
  } catch (err) {
    console.error('Error cargando compras:', err);
    // No mostrar error al usuario, solo en consola
  }
}

/* ══════════════════════════════════════════
   RENDERIZAR MIS COMPRAS Y ALQUILERES
══════════════════════════════════════════ */
function renderizarMisCompras(compras, alquileres) {
  const container = document.getElementById('pf-compras-container');
  
  if (!container) return;

  const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  let html = '';

  // ── SECCIÓN COMPRAS DE PRODUCTOS ──
  html += `<h3 style="margin-bottom: 1rem; color: var(--text); font-size: 1.2rem;">Productos Comprados</h3>`;
  if (compras.length === 0) {
    html += `
      <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); background: var(--bg-surface); border-radius: 8px; margin-bottom: 2rem;">
        <p>📋 No tienes compras de productos registradas aún.</p>
      </div>
    `;
  } else {
    html += `
      <div style="overflow-x: auto; margin-bottom: 2rem;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: rgba(255,107,0,.08); border-bottom: 2px solid var(--border);">
              <th style="padding: .75rem; text-align: left; font-weight: 700; color: var(--text);">Comprobante</th>
              <th style="padding: .75rem; text-align: center; font-weight: 700; color: var(--text);">Productos</th>
              <th style="padding: .75rem; text-align: right; font-weight: 700; color: var(--text);">Total</th>
              <th style="padding: .75rem; text-align: left; font-weight: 700; color: var(--text);">Fecha</th>
              <th style="padding: .75rem; text-align: center; font-weight: 700; color: var(--text);">Acción</th>
            </tr>
          </thead>
          <tbody>
    `;

    compras.forEach(compra => {
      html += `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: .75rem;"><strong>${compra.comprobante}</strong></td>
          <td style="padding: .75rem; text-align: center;">${compra.num_productos}</td>
          <td style="padding: .75rem; text-align: right; color: #FF6B00; font-weight: 600;">${fmt(compra.total)}</td>
          <td style="padding: .75rem; font-size: .85rem; color: var(--text-muted);">${compra.fecha_formateada}</td>
          <td style="padding: .75rem; text-align: center;">
            <button type="button" class="pf-btn-ghost" style="padding: 6px 12px; font-size: 0.8rem;" onclick="verDetalleCompra(${compra.id})">Ver Detalle</button>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  // ── SECCIÓN ALQUILERES REALIZADOS ──
  html += `<h3 style="margin-bottom: 1rem; color: var(--text); font-size: 1.2rem;">Alquileres Realizados</h3>`;
  if (alquileres.length === 0) {
    html += `
      <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); background: var(--bg-surface); border-radius: 8px;">
        <p>🚜 No tienes alquileres de maquinaria registrados aún.</p>
      </div>
    `;
  } else {
    html += `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: rgba(255,107,0,.08); border-bottom: 2px solid var(--border);">
              <th style="padding: .75rem; text-align: left; font-weight: 700; color: var(--text);">Maquinaria</th>
              <th style="padding: .75rem; text-align: center; font-weight: 700; color: var(--text);">Estado</th>
              <th style="padding: .75rem; text-align: right; font-weight: 700; color: var(--text);">Monto</th>
              <th style="padding: .75rem; text-align: left; font-weight: 700; color: var(--text);">Fechas (Desde - Hasta)</th>
              <th style="padding: .75rem; text-align: center; font-weight: 700; color: var(--text);">Acción</th>
            </tr>
          </thead>
          <tbody>
    `;

    alquileres.forEach(alq => {
      let badgeColor = alq.estado === 'activo' ? '#4CAF50' : '#9e9e9e';
      html += `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: .75rem;"><strong>${alq.maquinaria || 'Desconocida'}</strong></td>
          <td style="padding: .75rem; text-align: center;">
            <span style="background: ${badgeColor}20; color: ${badgeColor}; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; text-transform: capitalize;">${alq.estado}</span>
          </td>
          <td style="padding: .75rem; text-align: right; color: #FF6B00; font-weight: 600;">${fmt(alq.monto)}</td>
          <td style="padding: .75rem; font-size: .85rem; color: var(--text-muted);">${alq.fecha_inicio} a ${alq.fecha_fin}</td>
          <td style="padding: .75rem; text-align: center;">
            <button type="button" class="pf-btn-ghost" style="padding: 6px 12px; font-size: 0.8rem;" onclick="verDetalleAlquiler(${alq.id})">Ver Detalle</button>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  container.innerHTML = html;
}

/* ══════════════════════════════════════════
   NAVEGACIÓN DE SECCIONES
══════════════════════════════════════════ */
document.querySelectorAll('.pf-nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (href === '#' || href?.startsWith('javascript')) {
      return;
    }

    if (href && href !== '#pf-logout') {
      e.preventDefault();
      
      // Remover actividad de todos
      document.querySelectorAll('.pf-nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Ocultar todos los cards
      document.querySelectorAll('.pf-card').forEach(card => {
        card.style.display = 'none';
      });

      // Mostrar el card seleccionado
      const sectionId = href.substring(1);
      const section = document.getElementById(sectionId);
      if (section) {
        section.style.display = 'block';
      }

      // Ocultar acciones si estamos en Mis Compras
      const actionsContainer = document.getElementById('pf-actions-container');
      if (actionsContainer) {
        if (sectionId === 'mis-compras') {
          actionsContainer.style.display = 'none';
        } else {
          actionsContainer.style.display = 'flex';
        }
      }
    }
  });
});

/* ══════════════════════════════════════════
   GUARDAR CAMBIOS
══════════════════════════════════════════ */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!clienteId) {
    mostrarError('No se encontró tu perfil de cliente.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Guardando...';

  try {
    const res = await fetch(API_CLIENTES, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion:         'editar',
        id:             clienteId,
        nombre:         document.getElementById('per_nombre').value,
        identificacion: document.getElementById('per_identificacion').value,
        email:          document.getElementById('per_email').value,
        telefono:       document.getElementById('per_telefono').value  || null,
        ciudad:         document.getElementById('per_ciudad').value    || null,
        direccion:      document.getElementById('per_direccion').value || null,
      })
    });

    const data = await res.json();

    if (data.ok) {
      mostrarExito('✓ Perfil actualizado correctamente.');
    } else {
      mostrarError(data.error || data.mensaje || 'Error al actualizar.');
    }

  } catch (err) {
    console.error('Error guardando perfil:', err);
    mostrarError('Error de conexión al guardar.');
  } finally {
    submitBtn.disabled    = false;
    submitBtn.innerHTML   = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      Guardar cambios`;
  }
});

/* ══════════════════════════════════════════
   CERRAR SESIÓN
══════════════════════════════════════════ */
logoutBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    await fetch(`${API_USUARIOS}?accion=logout`);
  } catch (_) {}
  sessionStorage.clear();
  window.location.href = './index.html';
});

/* ══════════════════════════════════════════
   VER DETALLE COMPRA (MODAL)
══════════════════════════════════════════ */
async function verDetalleCompra(idVenta) {
  try {
    const res = await fetch(`${API_VENTAS}?accion=detalle&id=${idVenta}`);
    const data = await res.json();

    if (data.error) {
      mostrarError(data.error);
      return;
    }

    const modal = document.getElementById('pf-modal-detalle');
    const body = document.getElementById('pf-modal-body');
    const title = document.getElementById('pf-modal-title');

    title.textContent = `Comprobante: ${data.comprobante}`;

    const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

    let html = `
      <div style="margin-bottom: 15px; font-size: 0.9rem; color: rgba(255,255,255,0.7);">
        <p><strong>Fecha:</strong> ${data.fecha}</p>
        <p><strong>Registrado por:</strong> ${data.registrado_por || 'Sistema Web'}</p>
      </div>
      <table class="pf-modal-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Producto</th>
            <th style="text-align: center;">Cant.</th>
            <th style="text-align: right;">Precio Uni.</th>
            <th style="text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
    `;

    if (data.items && data.items.length > 0) {
      data.items.forEach(item => {
        html += `
          <tr>
            <td style="color: rgba(255,255,255,0.6); font-size: 0.85rem;">${item.codigo || '-'}</td>
            <td>${item.nombre}</td>
            <td style="text-align: center;">${item.cantidad}</td>
            <td style="text-align: right;">${fmt(item.precio_unitario)}</td>
            <td style="text-align: right; font-weight: 600;">${fmt(item.subtotal)}</td>
          </tr>
        `;
      });
    } else {
      html += `<tr><td colspan="5" style="text-align:center;">No hay items</td></tr>`;
    }

    html += `
        </tbody>
      </table>
      <div class="pf-modal-summary">
        Total: ${fmt(data.total)}
      </div>
    `;

    body.innerHTML = html;
    modal.classList.add('show');

  } catch (err) {
    console.error('Error cargando detalle:', err);
    mostrarError('Error al cargar los detalles de la compra.');
  }
}

/* ══════════════════════════════════════════
   VER DETALLE ALQUILER (MODAL)
══════════════════════════════════════════ */
async function verDetalleAlquiler(idAlquiler) {
  try {
    const res = await fetch(`${API_ALQUILERES}?accion=detalle&id=${idAlquiler}`);
    const data = await res.json();

    if (data.error) {
      mostrarError(data.error);
      return;
    }

    const modal = document.getElementById('pf-modal-detalle');
    const body = document.getElementById('pf-modal-body');
    const title = document.getElementById('pf-modal-title');

    title.textContent = `Detalle de Alquiler #${data.id}`;

    const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

    let html = `
      <div style="margin-bottom: 15px; font-size: 0.9rem; color: rgba(255,255,255,0.7);">
        <p><strong>Fecha Registro:</strong> ${data.fecha_registro}</p>
        <p><strong>Estado:</strong> <span style="text-transform: capitalize;">${data.estado}</span></p>
        <p><strong>Registrado por:</strong> ${data.registrado_por || 'Sistema Web'}</p>
      </div>
      <table class="pf-modal-table">
        <thead>
          <tr>
            <th>Maquinaria</th>
            <th style="text-align: center;">Desde</th>
            <th style="text-align: center;">Hasta</th>
            <th style="text-align: right;">Tarifa</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${data.maquinaria}</td>
            <td style="text-align: center;">${data.fecha_inicio}</td>
            <td style="text-align: center;">${data.fecha_fin}</td>
            <td style="text-align: right;">${fmt(data.tarifa_alquiler)}/día</td>
          </tr>
        </tbody>
      </table>
      <div class="pf-modal-summary">
        Total Alquiler: ${fmt(data.monto)}
      </div>
    `;

    body.innerHTML = html;
    modal.classList.add('show');

  } catch (err) {
    console.error('Error cargando detalle de alquiler:', err);
    mostrarError('Error al cargar los detalles del alquiler.');
  }
}

if (document.getElementById('pf-modal-close')) {
  document.getElementById('pf-modal-close').addEventListener('click', () => {
    document.getElementById('pf-modal-detalle').classList.remove('show');
  });
}

// Cerrar al hacer clic fuera
window.addEventListener('click', (e) => {
  const modal = document.getElementById('pf-modal-detalle');
  if (e.target === modal) {
    modal.classList.remove('show');
  }
});

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cargarPerfil);
} else {
  cargarPerfil();
}