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

    renderizarMisCompras(data.compras || []);
  } catch (err) {
    console.error('Error cargando compras:', err);
    // No mostrar error al usuario, solo en consola
  }
}

/* ══════════════════════════════════════════
   RENDERIZAR MIS COMPRAS
══════════════════════════════════════════ */
function renderizarMisCompras(compras) {
  const container = document.getElementById('pf-compras-container');
  
  if (!container) return;

  if (compras.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <p>📋 No tienes compras registradas aún.</p>
      </div>
    `;
    return;
  }

  const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  let html = `
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: rgba(255,107,0,.08); border-bottom: 2px solid var(--border);">
            <th style="padding: .75rem; text-align: left; font-weight: 700; color: var(--text);">Comprobante</th>
            <th style="padding: .75rem; text-align: center; font-weight: 700; color: var(--text);">Productos</th>
            <th style="padding: .75rem; text-align: right; font-weight: 700; color: var(--text);">Total</th>
            <th style="padding: .75rem; text-align: left; font-weight: 700; color: var(--text);">Fecha</th>
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
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

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
   INIT
══════════════════════════════════════════ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cargarPerfil);
} else {
  cargarPerfil();
}