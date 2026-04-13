/* ============================================================
   dashboard-admin.js
   ============================================================ */

const API = {
  dashboard:  'http://localhost/Ferreteria_Jamarraya/backend/dashboard.php',
  usuarios:   'http://localhost/Ferreteria_Jamarraya/backend/usuarios.php',
  productos:  'http://localhost/Ferreteria_Jamarraya/backend/api/productos.php',
  ventas:     'http://localhost/Ferreteria_Jamarraya/backend/api/ventas.php',
  alquileres: 'http://localhost/Ferreteria_Jamarraya/backend/api/alquileres.php',
  clientes:   'http://localhost/Ferreteria_Jamarraya/backend/api/clientes.php',
  maquinaria: 'http://localhost/Ferreteria_Jamarraya/backend/api/maquinaria.php',
  reportes:   'http://localhost/Ferreteria_Jamarraya/backend/api/reportes.php',
};

/* ── Verificar sesión y rol ── */
async function verificarAcceso() {
  try {
    // Verificar primero en sessionStorage
    const nombre = sessionStorage.getItem('jm_nombre');
    const rol    = sessionStorage.getItem('jm_rol');
    
    if (!nombre || rol !== 'admin') {
      // Si no está en sessionStorage, verificar en servidor
      const r = await fetch(API.usuarios + '?accion=verificar');
      const d = await r.json();
      
      if (!d.ok || d.rol !== 'admin') {
        window.location.href = './index.html';
        return;
      }
      
      // Actualizar sessionStorage desde servidor
      sessionStorage.setItem('jm_nombre', d.nombre);
      sessionStorage.setItem('jm_rol', d.rol);
      document.getElementById('adminNombre').textContent = d.nombre;
      document.getElementById('adminAvatar').textContent = d.nombre.charAt(0).toUpperCase();
    } else {
      // Usar datos de sessionStorage
      document.getElementById('adminNombre').textContent = nombre;
      document.getElementById('adminAvatar').textContent = nombre.charAt(0).toUpperCase();
    }
  } catch (e) {
    console.error('Error verificando acceso:', e);
    window.location.href = './index.html';
  }
}

/* ── Navegación por secciones ── */
const TITULOS = {
  inicio:     'Inicio — Panel General',
  ventas:     'Gestión de Ventas',
  alquileres: 'Gestión de Alquileres',
  inventario: 'Inventario de Productos',
  maquinaria: 'Maquinaria para Alquiler',
  clientes:   'Gestión de Clientes',
  usuarios:   'Usuarios del Sistema',
  alertas:    'Centro de Alertas',
  reportes:   'Reportes y Estadísticas',
};

function irSeccion(id) {
  // Nav items
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-section="${id}"]`)?.classList.add('active');

  // Secciones
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(`sec-${id}`)?.classList.add('active');

  document.getElementById('topbarTitle').textContent = TITULOS[id] || id;

  // Cerrar sidebar en mobile
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('open');

  // Cargar datos de la sección
  const cargadores = {
    inicio:     cargarDashboard,
    ventas:     cargarVentas,
    alquileres: cargarAlquileres,
    inventario: cargarInventario,
    maquinaria: cargarMaquinaria,
    clientes:   cargarClientes,
    usuarios:   cargarUsuarios,
    alertas:    () => {}, // ya cargado en dashboard
  };
  cargadores[id]?.();
}

/* ── Helpers ── */
const fmt$ = n => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', minimumFractionDigits:0 }).format(n);
const fmtFecha = s => new Date(s).toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' });

function estadoBadge(estado) {
  const map = {
    activo:'green', disponible:'green', finalizado:'blue',
    alquilada:'orange', mantenimiento:'yellow', inactivo:'red',
  };
  return `<span class="badge badge-${map[estado]||'blue'}">${estado}</span>`;
}

function filaVacia(cols, msg) {
  return `<tr><td colspan="${cols}"><div class="empty"><span>📭</span>${msg}</div></td></tr>`;
}

/* ══════════════════════════════════════════
   CARGAR DASHBOARD (inicio + alertas)
══════════════════════════════════════════ */
async function cargarDashboard() {
  try {
    const r = await fetch(API.dashboard);
    if (r.status === 401) { window.location.href='./index.html'; return; }
    const d = await r.json();

    // KPIs
    document.getElementById('kpiVentasHoy').textContent  = d.ventas_hoy;
    document.getElementById('kpiIngresosHoy').textContent = fmt$(d.ingresos_hoy);
    document.getElementById('kpiAlquileres').textContent  = d.alquileres_activos;
    document.getElementById('kpiStock').textContent       = d.stock_critico;
    document.getElementById('kpiAlertas').textContent     = d.alertas.length;

    // Badge sidebar
    document.getElementById('badgeAlertas').textContent = d.alertas.length;

    // Ventas recientes
    const tv = document.getElementById('tablaVentasRecientes');
    tv.innerHTML = d.ventas_recientes.length
      ? d.ventas_recientes.map(v => `
          <tr>
            <td><code style="color:var(--orange);font-size:.8rem">${v.comprobante}</code></td>
            <td>${v.cliente}</td>
            <td>${fmt$(v.total)}</td>
            <td style="color:var(--text-muted);font-size:.8rem">${v.fecha}</td>
          </tr>`).join('')
      : filaVacia(4, 'Sin ventas hoy');

    // Alertas resumen (máx 5)
    renderAlertas(d.alertas.slice(0,5), 'alertasResumen');

    // Alertas completas
    renderAlertas(d.alertas, 'alertasTodas');

    // KPIs alertas section
    const stock   = d.alertas.filter(a=>a.etiqueta==='Stock bajo').length;
    const pVencer = d.alertas.filter(a=>a.etiqueta==='Por vencer').length;
    const vencido = d.alertas.filter(a=>a.etiqueta==='Vencido').length;
    document.getElementById('alertKpiStock').textContent     = stock;
    document.getElementById('alertKpiPorVencer').textContent = pVencer;
    document.getElementById('alertKpiVencidos').textContent  = vencido;

    // Quitar clase loading
    document.querySelectorAll('.kpi__value.loading')
      .forEach(el => el.classList.remove('loading'));

  } catch (e) {
    console.error('Error dashboard:', e);
  }
}

function renderAlertas(alertas, contenedorId) {
  const el = document.getElementById(contenedorId);
  if (!el) return;
  el.innerHTML = alertas.length
    ? alertas.map(a => `
        <div class="alert-item ${a.tipo}">
          <div class="alert-dot"></div>
          <div class="alert-info">
            <div class="alert-nombre">${a.nombre}</div>
            <div class="alert-detalle">${a.detalle}</div>
          </div>
          <span class="alert-tag">${a.etiqueta}</span>
        </div>`).join('')
    : '<div class="empty"><span>✅</span>Sin alertas activas</div>';
}

/* ══════════════════════════════════════════
   VENTAS
══════════════════════════════════════════ */
async function cargarVentas() {
  const desde = document.getElementById('ventaDesde')?.value || '';
  const hasta = document.getElementById('ventaHasta')?.value || '';
  let url = API.ventas + '?accion=listar';
  if (desde) url += `&desde=${desde}`;
  if (hasta) url += `&hasta=${hasta}`;

  const tbody = document.getElementById('tablaVentas');
  tbody.innerHTML = `<tr><td colspan="6"><div class="empty"><span>⏳</span>Cargando…</div></td></tr>`;

  try {
    const r = await fetch(url);
    const ventas = await r.json();
    tbody.innerHTML = ventas.length
      ? ventas.map(v => `
          <tr>
            <td><code style="color:var(--orange);font-size:.8rem">${v.comprobante||v.id}</code></td>
            <td style="font-size:.82rem;color:var(--text-muted)">${fmtFecha(v.fecha)}</td>
            <td>${v.cliente||'—'}</td>
            <td style="font-size:.82rem">${v.num_productos||'—'} item(s)</td>
            <td style="font-weight:600">${fmt$(v.total)}</td>
            <td>
              <button class="btn-sm btn-ghost" onclick="alert('Ver detalle venta ${v.id}')">Ver</button>
            </td>
          </tr>`).join('')
      : filaVacia(6, 'No hay ventas en el período seleccionado');
  } catch {
    tbody.innerHTML = filaVacia(6, 'Error cargando ventas');
  }
}

/* ══════════════════════════════════════════
   ALQUILERES
══════════════════════════════════════════ */
async function cargarAlquileres() {
  const estado = document.getElementById('filtroEstadoAlquiler')?.value || '';
  let url = API.alquileres + '?accion=listar';
  if (estado) url += `&estado=${estado}`;

  const tbody = document.getElementById('tablaAlquileres');
  tbody.innerHTML = `<tr><td colspan="8"><div class="empty"><span>⏳</span>Cargando…</div></td></tr>`;

  try {
    const r = await fetch(url);
    const alq = await r.json();
    tbody.innerHTML = alq.length
      ? alq.map(a => `
          <tr>
            <td style="color:var(--text-muted);font-size:.8rem">#${a.id}</td>
            <td>${a.cliente||'—'}</td>
            <td>${a.maquinaria||'—'}</td>
            <td style="font-size:.8rem">${fmtFecha(a.fecha_inicio)}</td>
            <td style="font-size:.8rem">${fmtFecha(a.fecha_fin)}</td>
            <td style="font-weight:600">${fmt$(a.monto)}</td>
            <td>${estadoBadge(a.estado)}</td>
            <td>
              <button class="btn-sm btn-ghost" onclick="verDetalleAlquiler(${a.id})">Ver</button>
              ${a.estado==='activo' ? `<button class="btn-sm btn-orange" style="margin-left:.3rem" onclick="abrirModalDevolver(${a.id})">Devolver</button>` : ''}
            </td>
          </tr>`).join('')
      : filaVacia(8, 'Sin alquileres');
  } catch {
    tbody.innerHTML = filaVacia(8, 'Error cargando alquileres');
  }
}

/* ══════════════════════════════════════════
   VER DETALLES DEL ALQUILER
══════════════════════════════════════════ */
function verDetalleAlquiler(id) {
  if (typeof VerAlquilerModal !== 'undefined' && VerAlquilerModal.abrir) {
    VerAlquilerModal.abrir(id);
  } else {
    alert('Modal no disponible');
  }
}

/* ══════════════════════════════════════════
   ABRIR MODAL PARA DEVOLVER
══════════════════════════════════════════ */
function abrirModalDevolver(id) {
  if (typeof DevolverAlquilerModal !== 'undefined' && DevolverAlquilerModal.abrir) {
    DevolverAlquilerModal.abrir(id);
  } else {
    alert('Modal no disponible');
  }
}

/* ══════════════════════════════════════════
   INVENTARIO
══════════════════════════════════════════ */
async function cargarInventario() {
  const cat   = document.getElementById('filtroCategoria')?.value || '';
  const solo  = document.getElementById('soloBajoStock')?.checked;
  let url = API.productos + '?accion=listar' + (cat ? `&categoria=${encodeURIComponent(cat)}` : '');

  const tbody = document.getElementById('tablaInventario');
  tbody.innerHTML = `<tr><td colspan="8"><div class="empty"><span>⏳</span>Cargando…</div></td></tr>`;

  try {
    const r = await fetch(url);
    let prods = await r.json();
    if (solo) prods = prods.filter(p => p.stock_actual < (p.stock_minimo||0));

    tbody.innerHTML = prods.length
      ? prods.map(p => {
          const bajo = p.stock_actual < (p.stock_minimo||0);
          const inactivo = !p.activo || p.activo === 0 || p.activo === '0';  // Soporta boolean false, 0, o '0'
          const estiloFila = inactivo ? 'opacity:0.6;background:rgba(0,0,0,0.1)' : (bajo ? 'background:rgba(248,81,73,.04)' : '');
          return `
          <tr style="${estiloFila}">
            <td><code style="font-size:.78rem;color:var(--text-muted)">${p.codigo||'—'}${inactivo ? ' ❌' : ''}</code></td>
            <td style="font-weight:500">${p.nombre}</td>
            <td style="font-size:.8rem;color:var(--text-muted)">${p.categoria||'—'}</td>
            <td>${fmt$(p.precio)}</td>
            <td style="font-weight:700;color:${bajo?'var(--red)':'var(--green)'}">${p.stock_actual}</td>
            <td style="color:var(--text-muted)">${p.stock_minimo||0}</td>
            <td>${inactivo ? '<span class="badge" style="background:rgba(248,81,73,.2);color:var(--red)">Desactivado</span>' : (bajo ? '<span class="badge badge-red">Bajo stock</span>' : '<span class="badge badge-green">OK</span>')}</td>
            <td>
              <button class="btn-sm btn-ghost" onclick="editarProducto(${p.id})">Editar</button>
            </td>
          </tr>`;}).join('')
      : filaVacia(8, 'Sin productos');
  } catch {
    tbody.innerHTML = filaVacia(8, 'Error cargando inventario');
  }
}

function exportarProductosCSV() {
  const url = API.productos + '?accion=exportar_csv';
  const link = document.createElement('a');
  link.href = url;
  link.download = 'productos_' + new Date().toISOString().split('T')[0] + '.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function editarProducto(id) {
  if (typeof window.EditarProductoModal === 'undefined') {
    if (typeof window.reinicializarEditarProductoModal === 'function') {
      window.reinicializarEditarProductoModal();
      setTimeout(() => {
        if (window.EditarProductoModal) {
          window.EditarProductoModal.abrirConId(id);
        } else {
          alert('Por favor, espera a que se carguen todos los módulos');
        }
      }, 200);
    } else {
      alert('Por favor, espera a que se carguen todos los módulos');
    }
    return;
  }
  
  if (window.EditarProductoModal && typeof window.EditarProductoModal.abrirConId === 'function') {
    window.EditarProductoModal.abrirConId(id);
  } else {
    alert('Error al cargar la funcionalidad de edición');
  }
}

function crearAlquiler() {
  if (typeof window.CrearAlquilerModal === 'undefined') {
    alert('Por favor, espera a que se carguen todos los módulos');
    return;
  }
  
  if (window.CrearAlquilerModal && typeof window.CrearAlquilerModal.abrir === 'function') {
    window.CrearAlquilerModal.abrir();
  } else {
    alert('Error al cargar la funcionalidad de alquiler');
  }
}

function crearMaquinaria() {
  if (typeof window.CrearMaquinariaModal === 'undefined') {
    alert('Por favor, espera a que se carguen todos los módulos');
    return;
  }
  
  if (window.CrearMaquinariaModal && typeof window.CrearMaquinariaModal.abrir === 'function') {
    window.CrearMaquinariaModal.abrir();
  } else {
    alert('Error al cargar la funcionalidad de maquinaria');
  }
}

/* ══════════════════════════════════════════
   MAQUINARIA
══════════════════════════════════════════ */
async function cargarMaquinaria() {
  const tbody = document.getElementById('tablaMaquinaria');
  tbody.innerHTML = `<tr><td colspan="6"><div class="empty"><span>⏳</span>Cargando…</div></td></tr>`;
  try {
    const r = await fetch(API.maquinaria + '?accion=listar');
    const maq = await r.json();
    tbody.innerHTML = maq.length
      ? maq.map(m => {
          const desactivada = !m.activo;  // activo es boolean ahora
          const estiloFila = desactivada ? 'opacity:0.6;background:rgba(0,0,0,0.1)' : '';
          return `
          <tr style="${estiloFila}">
            <td style="color:var(--text-muted)">${m.id}${desactivada ? ' ❌' : ''}</td>
            <td style="font-weight:500">${m.nombre}</td>
            <td style="font-size:.82rem;color:var(--text-muted)">${m.descripcion||'—'}</td>
            <td>${fmt$(m.tarifa_alquiler)}/día</td>
            <td>${estadoBadge(m.estado)}${desactivada ? '<span style="margin-left:.5rem;background:rgba(248,81,73,.2);color:var(--red);padding:.25rem .5rem;border-radius:3px;font-size:.75rem">Desactivada</span>' : ''}</td>
            <td>
              <button class="btn-sm btn-ghost" onclick="editarMaquinaria(${m.id})">Editar</button>
            </td>
          </tr>`;
        }).join('')
      : filaVacia(6, 'Sin maquinaria registrada');
  } catch {
    tbody.innerHTML = filaVacia(6, 'Error cargando maquinaria');
  }
}

/* ══════════════════════════════════════════
   CLIENTES
══════════════════════════════════════════ */
async function cargarClientes() {
  const busq = document.getElementById('buscarCliente')?.value || '';
  const url = API.clientes + `?accion=listar${busq ? '&buscar='+encodeURIComponent(busq) : ''}`;

  const tbody = document.getElementById('tablaClientes');
  tbody.innerHTML = `<tr><td colspan="7"><div class="empty"><span>⏳</span>Cargando…</div></td></tr>`;
  try {
    const r = await fetch(url);
    const clientes = await r.json();
    tbody.innerHTML = clientes.length
      ? clientes.map(c => `
          <tr>
            <td style="color:var(--text-muted)">${c.id}</td>
            <td style="font-weight:500">${c.nombre}</td>
            <td style="font-size:.82rem">${c.identificacion||'—'}</td>
            <td>${c.telefono||'—'}</td>
            <td style="font-size:.82rem;color:var(--text-muted)">${c.email||'—'}</td>
            <td>${c.total_compras||0}</td>
            <td>
              <button class="btn-sm btn-ghost" onclick="ClienteVerModal.abrir(${c.id})">Ver</button>
              <button class="btn-sm btn-ghost" style="margin-left:.3rem" onclick="ClienteEditModal.abrir(${c.id})">Editar</button>
            </td>
          </tr>`).join('')
      : filaVacia(7, 'Sin clientes registrados');
  } catch {
    tbody.innerHTML = filaVacia(7, 'Error cargando clientes');
  }
}

/* ══════════════════════════════════════════
   USUARIOS
══════════════════════════════════════════ */
async function cargarUsuarios() {
  const tbody = document.getElementById('tablaUsuarios');
  tbody.innerHTML = `<tr><td colspan="7"><div class="empty"><span>⏳</span>Cargando…</div></td></tr>`;
  try {
    const r = await fetch(API.usuarios + '?accion=listar');
    const users = await r.json();
    
    // Guardar usuarios globalmente para acceso desde modales
    window.usuariosData = {};
    users.forEach(u => {
      window.usuariosData[u.id] = u;
    });
    
    tbody.innerHTML = users.length
      ? users.map(u => `
          <tr>
            <td style="color:var(--text-muted)">${u.id}</td>
            <td style="font-weight:500">${u.nombre}</td>
            <td style="font-size:.82rem;color:var(--text-muted)">${u.email}</td>
            <td>${estadoBadge(u.rol)}</td>
            <td style="font-size:.8rem">${u.fecha_creacion ? fmtFecha(u.fecha_creacion) : '—'}</td>
            <td>${u.activo ? '<span class="badge badge-green">Activo</span>' : '<span class="badge badge-red">Inactivo</span>'}</td>
            <td>
              <button class="btn-sm btn-ghost" onclick="UsuarioEditModal.abrir(${u.id})">Editar</button>
            </td>
          </tr>`).join('')
      : filaVacia(7, 'Sin usuarios');
  } catch {
    tbody.innerHTML = filaVacia(7, 'Error cargando usuarios');
  }
}

/* ══════════════════════════════════════════
   REPORTES
══════════════════════════════════════════ */
async function generarReporteVentas() {
  const periodo = document.getElementById('rpVentasPeriodo').value;
  const el = document.getElementById('rpVentasResult');
  el.innerHTML = '<div class="empty"><span>⏳</span>Generando…</div>';
  try {
    const r = await fetch(API.reportes + `?tipo=ventas&periodo=${periodo}`);
    const d = await r.json();
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:.6rem;font-size:.875rem">
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-muted)">Total ventas</span>
          <strong>${d.total_ventas ?? '—'}</strong>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-muted)">Ingresos</span>
          <strong style="color:var(--green)">${d.ingresos ? fmt$(d.ingresos) : '—'}</strong>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-muted)">Top producto</span>
          <strong>${d.top_producto ?? '—'}</strong>
        </div>
      </div>`;
  } catch {
    el.innerHTML = '<div class="empty"><span>❌</span>Error generando reporte</div>';
  }
}

async function generarReporteInventario() {
  const el = document.getElementById('rpInvResult');
  el.innerHTML = '<div class="empty"><span>⏳</span>Generando…</div>';
  try {
    const r = await fetch(API.reportes + '?tipo=inventario');
    const d = await r.json();
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:.6rem;font-size:.875rem">
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-muted)">Total productos</span>
          <strong>${d.total_productos ?? '—'}</strong>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-muted)">Valor total</span>
          <strong style="color:var(--blue)">${d.valor_total ? fmt$(d.valor_total) : '—'}</strong>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-muted)">Bajo stock</span>
          <strong style="color:var(--red)">${d.bajo_stock ?? '—'}</strong>
        </div>
      </div>`;
  } catch {
    el.innerHTML = '<div class="empty"><span>❌</span>Error generando reporte</div>';
  }
}

async function generarBalance() {
  const mes = document.getElementById('rpBalanceMes').value;
  const el  = document.getElementById('rpBalanceResult');
  if (!mes) { el.innerHTML = '<div class="empty"><span>⚠️</span>Selecciona un mes</div>'; return; }
  el.innerHTML = '<div class="empty"><span>⏳</span>Generando…</div>';
  try {
    const r = await fetch(API.reportes + `?tipo=balance&mes=${mes}`);
    const d = await r.json();
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:.6rem;font-size:.875rem">
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-muted)">Ventas</span>
          <strong>${d.ventas ? fmt$(d.ventas) : '—'}</strong>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-muted)">Alquileres</span>
          <strong>${d.alquileres ? fmt$(d.alquileres) : '—'}</strong>
        </div>
        <hr style="border-color:var(--border)"/>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-muted)">Total</span>
          <strong style="color:var(--green);font-size:1.1rem">${d.total ? fmt$(d.total) : '—'}</strong>
        </div>
        ${d.variacion !== undefined ? `
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-muted)">vs mes anterior</span>
          <strong style="color:${d.variacion>=0?'var(--green)':'var(--red)'}">${d.variacion>=0?'+':''}${d.variacion}%</strong>
        </div>` : ''}
      </div>`;
  } catch {
    el.innerHTML = '<div class="empty"><span>❌</span>Error generando balance</div>';
  }
}

/* ══════════════════════════════════════════
   LOGOUT
══════════════════════════════════════════ */
document.getElementById('btnLogout').addEventListener('click', async () => {
  await fetch(API.usuarios + '?accion=logout').catch(()=>{});
  sessionStorage.clear();
  window.location.href = './index.html';
});

/* ══════════════════════════════════════════
   NAV CLICK
══════════════════════════════════════════ */
document.querySelectorAll('.nav-item[data-section]').forEach(item => {
  item.addEventListener('click', () => irSeccion(item.dataset.section));
});

/* ══════════════════════════════════════════
   MOBILE SIDEBAR
══════════════════════════════════════════ */
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarBackdrop').classList.toggle('open');
});
document.getElementById('sidebarBackdrop').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('open');
});

/* ══════════════════════════════════════════
   FECHA EN TOPBAR
══════════════════════════════════════════ */
document.getElementById('topbarDate').textContent =
  new Date().toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

/* ══════════════════════════════════════════
   CALLBACKS DE MÓDULOS
══════════════════════════════════════════ */
// Cuando se crea un usuario, recargar tabla
window.onUsuarioCreado = () => {
  cargarUsuarios();
  alert('✓ Usuario creado exitosamente');
};

// Cuando se edita un usuario, recargar tabla
window.onUsuarioEditado = () => {
  cargarUsuarios();
  alert('✓ Usuario actualizado correctamente');
};

// Cuando se crea un cliente, recargar tabla
window.onClienteCreado = (data) => {
  cargarClientes();
  alert('✓ Cliente registrado exitosamente');
};

// Cuando se actualiza un cliente, recargar tabla
window.onClienteActualizado = (data) => {
  cargarClientes();
  alert('✓ Cliente actualizado correctamente');
};

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
(async function init() {
  await verificarAcceso();
  await cargarDashboard();
  await cargarInventario();  // pre-carga para alertas de stock
})();


