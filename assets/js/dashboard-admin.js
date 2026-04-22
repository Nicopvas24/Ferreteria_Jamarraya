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
              <button class="btn-sm btn-ghost" onclick="verDetalleVenta(${v.id})">Ver</button>
            </td>
          </tr>`).join('')
      : filaVacia(6, 'No hay ventas en el período seleccionado');
  } catch {
    tbody.innerHTML = filaVacia(6, 'Error cargando ventas');
  }
}

// Ver detalle de venta
function verDetalleVenta(idVenta) {
  console.log('🔍 Ver detalle venta: ' + idVenta);
  
  (async () => {
    try {
      console.log('📡 Cargando desde URL:', API.ventas + '?accion=detalle&id=' + idVenta);
      const r = await fetch(API.ventas + '?accion=detalle&id=' + idVenta);
      const venta = await r.json();
      
      console.log('📦 Venta recibida:', venta);

      if (venta.error) {
        alert('Error: ' + venta.error);
        return;
      }

      mostrarModalDetalleVenta(venta);
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error al cargar detalle: ' + error.message);
    }
  })();
}

// Mostrar modal con detalle de venta
function mostrarModalDetalleVenta(venta) {
  try {
    console.log('✅ Iniciando modal...');
    
    // Calcular subtotal e IVA
    let subtotal = 0;
    if (venta.items && Array.isArray(venta.items)) {
      subtotal = venta.items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
    }
    const iva = subtotal * 0.19;

    // Construir filas de items
    let itemsHTML = '';
    if (venta.items && Array.isArray(venta.items)) {
      itemsHTML = venta.items.map(item => {
        const subtotalItem = item.cantidad * item.precio_unitario;
        return `
          <tr>
            <td>${item.codigo}</td>
            <td>${item.nombre}</td>
            <td style="text-align: center;">${item.cantidad}</td>
            <td style="text-align: right;">$${parseFloat(item.precio_unitario).toLocaleString('es-CO')}</td>
            <td style="text-align: right; color: #4caf50;">$${subtotalItem.toLocaleString('es-CO')}</td>
          </tr>
        `;
      }).join('');
    }

    // Crear overlay
    const overlay = document.createElement('div');
    overlay.id = 'ventaModalOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Arial, sans-serif;
    `;

    // Crear contenedor del modal
    const container = document.createElement('div');
    container.style.cssText = `
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 20px;
      max-width: 700px;
      width: 90%;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 10px 50px rgba(0,0,0,0.9);
      color: #fff;
    `;

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 1.3em;">📋 Detalle de Venta</h2>
        <button onclick="document.getElementById('ventaModalOverlay').remove()" style="
          background: none;
          border: none;
          color: #999;
          font-size: 1.5em;
          cursor: pointer;
          padding: 0;
        ">✕</button>
      </div>

      <div style="background: rgba(0,0,0,0.3); border-radius: 6px; padding: 15px; margin-bottom: 20px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;">
          <div>
            <span style="color: #999; font-size: 0.85em;">Comprobante:</span>
            <div style="font-weight: bold; color: #ff9800;">${venta.comprobante}</div>
          </div>
          <div>
            <span style="color: #999; font-size: 0.85em;">Fecha:</span>
            <div style="font-weight: bold;">${new Date(venta.fecha).toLocaleString('es-CO')}</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <span style="color: #999; font-size: 0.85em;">Cliente:</span>
            <div style="font-weight: bold;">${venta.cliente || 'N/A'}</div>
          </div>
          <div>
            <span style="color: #999; font-size: 0.85em;">Registrado por:</span>
            <div style="font-weight: bold;">${venta.registrado_por || '—'}</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; font-size: 0.95em; text-transform: uppercase; color: #999;">Productos</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
          <thead>
            <tr style="background: rgba(0,0,0,0.5); border-bottom: 2px solid #333;">
              <th style="padding: 10px; text-align: left;">Código</th>
              <th style="padding: 10px; text-align: left;">Nombre</th>
              <th style="padding: 10px; text-align: center;">Cant.</th>
              <th style="padding: 10px; text-align: right;">P.U.</th>
              <th style="padding: 10px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
      </div>

      <div style="background: rgba(76,175,80,0.15); border: 1px solid rgba(76,175,80,0.3); border-radius: 6px; padding: 15px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9em;">
          <span>Subtotal:</span>
          <span>$${subtotal.toLocaleString('es-CO', {maximumFractionDigits: 2})}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9em;">
          <span>IVA (19%):</span>
          <span>$${iva.toLocaleString('es-CO', {maximumFractionDigits: 2})}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 1.1em; font-weight: bold; padding-top: 8px; border-top: 1px solid rgba(76,175,80,0.3);">
          <span>Total:</span>
          <span style="color: #4caf50;">$${parseFloat(venta.total).toLocaleString('es-CO', {maximumFractionDigits: 2})}</span>
        </div>
      </div>

      <button onclick="document.getElementById('ventaModalOverlay').remove()" style="
        width: 100%;
        background: #333;
        border: none;
        border-radius: 6px;
        padding: 10px;
        color: #fff;
        cursor: pointer;
        font-weight: bold;
        font-size: 0.95em;
      ">Cerrar</button>
    `;

    overlay.appendChild(container);
    document.body.appendChild(overlay);
    
    console.log('✅ Modal mostrado exitosamente');
  } catch (error) {
    console.error('❌ Error en mostrarModalDetalleVenta:', error);
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
  el.innerHTML = '<div class="empty">Generando…</div>';
  try {
    const r = await fetch(API.reportes + `?tipo=ventas&periodo=${periodo}`);
    const d = await r.json();
    el.innerHTML = `
      <div style="font-size:.875rem;display:flex;flex-direction:column;gap:1rem">
        <table style="width:100%;border-collapse:collapse;background:#f8f9fa;border:1px solid var(--border)">
          <tr style="border-bottom:2px solid var(--border)">
            <td style="padding:.75rem 1rem;color:var(--text-muted);font-weight:600;width:50%">Concepto</td>
            <td style="padding:.75rem 1rem;color:var(--text-muted);font-weight:600;text-align:right">Valor</td>
          </tr>
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:.75rem 1rem;color:#333">Total de ventas</td>
            <td style="padding:.75rem 1rem;text-align:right;font-weight:600;color:#333">${d.total_ventas ?? '0'}</td>
          </tr>
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:.75rem 1rem;color:#333">Ingresos totales</td>
            <td style="padding:.75rem 1rem;text-align:right;font-weight:600;color:var(--green)">${d.ingresos ? fmt$(d.ingresos) : '$0'}</td>
          </tr>
          <tr>
            <td style="padding:.75rem 1rem;color:#333">Producto con más ventas</td>
            <td style="padding:.75rem 1rem;text-align:right;font-weight:600;color:#333">${d.top_producto ?? 'N/A'}</td>
          </tr>
        </table>
        ${d.top_productos && d.top_productos.length > 0 ? `
          <div style="margin-top:.5rem">
            <h4 style="margin:0 0 .75rem 0;font-size:.9rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Detalle de productos (${d.top_productos.length})</h4>
            <table style="width:100%;border-collapse:collapse;font-size:.8rem;background:#f8f9fa;border:1px solid var(--border)">
              <tr style="background:var(--orange);color:white;border:none">
                <td style="padding:.5rem .75rem;font-weight:600">#</td>
                <td style="padding:.5rem .75rem;font-weight:600">Producto</td>
                <td style="padding:.5rem .75rem;font-weight:600;text-align:right">Unidades</td>
                <td style="padding:.5rem .75rem;font-weight:600;text-align:right">Ingreso</td>
              </tr>
              ${d.top_productos.slice(0, 5).map((p, i) => `
                <tr style="border-bottom:1px solid var(--border)">
                  <td style="padding:.5rem .75rem;color:#333">${i+1}</td>
                  <td style="padding:.5rem .75rem;color:#333">${p.nombre}</td>
                  <td style="padding:.5rem .75rem;text-align:right;color:#333">${p.unidades_vendidas}</td>
                  <td style="padding:.5rem .75rem;text-align:right;font-weight:600;color:#333">${fmt$(p.ingreso_total)}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        ` : ''}
      </div>`;
    window.rpVentasData = d;
  } catch {
    el.innerHTML = '<div class="empty">Error generando reporte</div>';
  }
}

async function generarReporteInventario() {
  const el = document.getElementById('rpInvResult');
  el.innerHTML = '<div class="empty">Generando…</div>';
  try {
    const r = await fetch(API.reportes + '?tipo=inventario');
    const d = await r.json();
    el.innerHTML = `
      <div style="font-size:.875rem;display:flex;flex-direction:column;gap:1rem">
        <table style="width:100%;border-collapse:collapse;background:#f8f9fa;border:1px solid var(--border)">
          <tr style="border-bottom:2px solid var(--border)">
            <td style="padding:.75rem 1rem;color:var(--text-muted);font-weight:600;width:50%">Métrica</td>
            <td style="padding:.75rem 1rem;color:var(--text-muted);font-weight:600;text-align:right">Valor</td>
          </tr>
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:.75rem 1rem;color:#333">Total de productos</td>
            <td style="padding:.75rem 1rem;text-align:right;font-weight:600;color:#333">${d.total_productos ?? '0'}</td>
          </tr>
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:.75rem 1rem;color:#333">Valor total del inventario</td>
            <td style="padding:.75rem 1rem;text-align:right;font-weight:600;color:var(--blue)">${d.valor_total ? fmt$(d.valor_total) : '$0'}</td>
          </tr>
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:.75rem 1rem;color:#333">Productos con bajo stock</td>
            <td style="padding:.75rem 1rem;text-align:right;font-weight:600;color:var(--orange)">${d.bajo_stock ?? '0'}</td>
          </tr>
          <tr>
            <td style="padding:.75rem 1rem;color:#333">Productos sin stock</td>
            <td style="padding:.75rem 1rem;text-align:right;font-weight:600;color:var(--red)">${d.sin_stock ?? '0'}</td>
          </tr>
        </table>
      </div>`;
    window.rpInvData = d;
  } catch {
    el.innerHTML = '<div class="empty">Error generando reporte</div>';
  }
}

async function generarBalance() {
  const mes = document.getElementById('rpBalanceMes').value;
  const el  = document.getElementById('rpBalanceResult');
  if (!mes) { el.innerHTML = '<div class="empty">Selecciona un mes</div>'; return; }
  el.innerHTML = '<div class="empty">Generando…</div>';
  try {
    const r = await fetch(API.reportes + `?tipo=balance&mes=${mes}`);
    const d = await r.json();
    el.innerHTML = `
      <div style="font-size:.875rem;display:flex;flex-direction:column;gap:1rem">
        <table style="width:100%;border-collapse:collapse;background:#f8f9fa;border:1px solid var(--border)">
          <tr style="border-bottom:2px solid var(--border)">
            <td style="padding:.75rem 1rem;color:var(--text-muted);font-weight:600;width:50%">Concepto</td>
            <td style="padding:.75rem 1rem;color:var(--text-muted);font-weight:600;text-align:right">Monto</td>
          </tr>
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:.75rem 1rem;color:#333">Ingresos por ventas</td>
            <td style="padding:.75rem 1rem;text-align:right;font-weight:600;color:#333">${d.ventas ? fmt$(d.ventas) : '$0'}</td>
          </tr>
          <tr style="border-bottom:2px solid var(--border)">
            <td style="padding:.75rem 1rem;color:#333">Ingresos por alquileres</td>
            <td style="padding:.75rem 1rem;text-align:right;font-weight:600;color:#333">${d.alquileres ? fmt$(d.alquileres) : '$0'}</td>
          </tr>
          <tr style="background:var(--green);color:white">
            <td style="padding:.75rem 1rem;font-weight:700">Total</td>
            <td style="padding:.75rem 1rem;text-align:right;font-weight:700;font-size:1.1rem">${d.total ? fmt$(d.total) : '$0'}</td>
          </tr>
          ${d.variacion !== undefined ? `
          <tr>
            <td style="padding:.75rem 1rem;color:var(--text-muted)">Variación vs mes anterior</td>
            <td style="padding:.75rem 1rem;text-align:right;font-weight:600;color:${d.variacion>=0?'var(--green)':'var(--red)'}">${d.variacion>=0?'+':''}${d.variacion}%</td>
          </tr>
          ` : ''}
        </table>
      </div>`;
    window.rpBalanceData = d;
  } catch {
    el.innerHTML = '<div class="empty">Error generando balance</div>';
  }
}

async function generarReporteAlquileres() {
  const desde = document.getElementById('rpAlqDesde').value || new Date(Date.now() - 30*24*3600*1000).toISOString().split('T')[0];
  const hasta = document.getElementById('rpAlqHasta').value || new Date().toISOString().split('T')[0];
  const el = document.getElementById('rpAlqResult');
  
  document.getElementById('rpAlqDesde').value = desde;
  document.getElementById('rpAlqHasta').value = hasta;
  
  el.innerHTML = '<div class="empty">Generando…</div>';
  try {
    const r = await fetch(API.reportes + `?tipo=alquileres&desde=${desde}&hasta=${hasta}`);
    const d = await r.json();
    
    let html = `
      <div style="font-size:.875rem;display:flex;flex-direction:column;gap:1rem">
        <table style="width:100%;border-collapse:collapse;background:#f8f9fa;border:1px solid var(--border)">
          <tr style="border-bottom:2px solid var(--border)">
            <td style="padding:.75rem 1rem;color:var(--text-muted);font-weight:600;width:50%">Concepto</td>
            <td style="padding:.75rem 1rem;color:var(--text-muted);font-weight:600;text-align:right">Valor</td>
          </tr>
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:.75rem 1rem;color:#333">Total de alquileres</td>
            <td style="padding:.75rem 1rem;text-align:right;font-weight:600;color:#333">${d.total ?? '0'}</td>
          </tr>
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:.75rem 1rem;color:#333">Activos</td>
            <td style="padding:.75rem 1rem;text-align:right;font-weight:600;color:var(--green)">${d.activos ?? '0'}</td>
          </tr>
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:.75rem 1rem;color:#333">Finalizados</td>
            <td style="padding:.75rem 1rem;text-align:right;font-weight:600;color:#333">${d.finalizados ?? '0'}</td>
          </tr>
          <tr style="background:var(--orange);color:white">
            <td style="padding:.75rem 1rem;font-weight:700">Ingresos totales</td>
            <td style="padding:.75rem 1rem;text-align:right;font-weight:700;font-size:1.05rem">${d.ingresos_total ? fmt$(d.ingresos_total) : '$0'}</td>
          </tr>
        </table>`;
    
    // Mostrar alquileres activos si existen
    if (d.alquileres_activos && d.alquileres_activos.length > 0) {
      html += `
        <div style="margin-top:1rem">
          <h4 style="margin:0 0 .75rem 0;font-size:.9rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Información del Alquiler Activo (${d.alquileres_activos.length})</h4>
          <table style="width:100%;border-collapse:collapse;font-size:.8rem;background:#f8f9fa;border:1px solid var(--border)">
            <tr style="background:var(--orange);color:white;border:none">
              <td style="padding:.5rem .75rem;font-weight:600">Máquina</td>
              <td style="padding:.5rem .75rem;font-weight:600">Cliente</td>
              <td style="padding:.5rem .75rem;font-weight:600">Teléfono</td>
              <td style="padding:.5rem .75rem;font-weight:600;text-align:center">Período</td>
              <td style="padding:.5rem .75rem;font-weight:600;text-align:center">Días</td>
              <td style="padding:.5rem .75rem;font-weight:600;text-align:right">Monto</td>
            </tr>
            ${d.alquileres_activos.slice(0, 5).map(a => {
              const colorDias = a.dias_restantes <= 7 ? 'color:var(--red)' : 'color:var(--green)';
              return `
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:.5rem .75rem;color:#333"><strong>${a.maquinaria_nombre}</strong></td>
              <td style="padding:.5rem .75rem;color:#333">${a.cliente_nombre}</td>
              <td style="padding:.5rem .75rem;color:#333">${a.cliente_telefono || '—'}</td>
              <td style="padding:.5rem .75rem;text-align:center;font-size:.75rem;color:#333">${a.fecha_inicio} a ${a.fecha_fin}</td>
              <td style="padding:.5rem .75rem;text-align:center;font-weight:600;${colorDias}">${a.dias_restantes}</td>
              <td style="padding:.5rem .75rem;text-align:right;font-weight:600;color:#333">${fmt$(a.monto)}</td>
            </tr>`;
            }).join('')}
          </table>
        </div>`;
    }
    
    html += `</div>`;
    el.innerHTML = html;
    window.rpAlqData = d;
  } catch {
    el.innerHTML = '<div class="empty">Error generando reporte</div>';
  }
}

async function generarReporteBajoStock() {
  const el = document.getElementById('rpBajoStockResult');
  el.innerHTML = '<div class="empty">Generando…</div>';
  try {
    const r = await fetch(API.reportes + '?tipo=inventario');
    const d = await r.json();
    
    if (!d.productos_bajo_stock || d.productos_bajo_stock.length === 0) {
      el.innerHTML = '<div class="empty">Sin problemas de stock</div>';
      return;
    }

    const tabla = `
      <table style="width:100%;font-size:.8rem;border-collapse:collapse;background:#f8f9fa;border:1px solid var(--border)">
        <thead>
          <tr style="background:var(--red);color:white;border:none">
            <th style="text-align:left;padding:.5rem;font-weight:600">Código</th>
            <th style="text-align:left;padding:.5rem;font-weight:600">Producto</th>
            <th style="text-align:center;padding:.5rem;font-weight:600">Stock</th>
            <th style="text-align:center;padding:.5rem;font-weight:600">Mínimo</th>
          </tr>
        </thead>
        <tbody>
          ${d.productos_bajo_stock.slice(0, 10).map(p => `
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:.5rem;color:#333">${p.codigo}</td>
              <td style="padding:.5rem;color:#333">${p.nombre}</td>
              <td style="text-align:center;color:var(--red);font-weight:600">${p.stock_actual}</td>
              <td style="text-align:center;color:#333">${p.stock_minimo}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
    el.innerHTML = tabla;
    window.rpBajoStockData = d;
  } catch {
    el.innerHTML = '<div class="empty">Error generando reporte</div>';
  }
}

async function generarTopProductos() {
  const periodo = document.getElementById('rpTopPeriodo').value;
  const el = document.getElementById('rpTopResult');
  el.innerHTML = '<div class="empty">Generando…</div>';
  try {
    const r = await fetch(API.reportes + `?tipo=ventas&periodo=${periodo}`);
    const d = await r.json();
    
    if (!d.top_productos || d.top_productos.length === 0) {
      el.innerHTML = '<div class="empty">Sin ventas en el período</div>';
      return;
    }

    const tabla = `
      <table style="width:100%;font-size:.8rem;border-collapse:collapse;background:#f8f9fa;border:1px solid var(--border)">
        <thead>
          <tr style="background:var(--green);color:white;border:none">
            <th style="text-align:center;padding:.5rem;font-weight:600;width:15%">Ranking</th>
            <th style="text-align:left;padding:.5rem;font-weight:600">Producto</th>
            <th style="text-align:center;padding:.5rem;font-weight:600">Unidades</th>
            <th style="text-align:right;padding:.5rem;font-weight:600">Ingresos</th>
          </tr>
        </thead>
        <tbody>
          ${d.top_productos.slice(0, 10).map((p, i) => `
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:.5rem;font-weight:700;text-align:center;color:var(--orange)">N°${i+1}</td>
              <td style="padding:.5rem;color:#333">${p.nombre}</td>
              <td style="text-align:center;padding:.5rem;font-weight:600;color:#333">${p.unidades_vendidas}</td>
              <td style="text-align:right;padding:.5rem;color:var(--green);font-weight:600">${fmt$(p.ingreso_total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
    el.innerHTML = tabla;
    window.rpTopData = d;
  } catch {
    el.innerHTML = '<div class="empty">Error generando reporte</div>';
  }
}

// EXPORTACIÓN A CSV/PDF
function exportarReporteVentas(formato = 'csv') {
  if (!window.rpVentasData) { alert('Genera el reporte primero'); return; }
  const d = window.rpVentasData;
  
  if (formato === 'pdf') {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text('REPORTE DE VENTAS', 20, 20);
      
      doc.setFontSize(10);
      doc.text(`Período: ${d.desde} al ${d.hasta}`, 20, 30);
      
      doc.setFontSize(12);
      doc.text('RESUMEN', 20, 45);
      
      doc.setFontSize(10);
      doc.text(`Total de ventas: ${d.total_ventas}`, 20, 55);
      doc.text(`Ingresos: $${d.ingresos?.toLocaleString('es-CO')}`, 20, 62);
      
      if (d.top_productos && d.top_productos.length > 0) {
        doc.setFontSize(12);
        doc.text('TOP 10 PRODUCTOS', 20, 75);
        
        const tableData = d.top_productos.slice(0, 10).map((p, i) => [
          i + 1,
          p.nombre,
          p.unidades_vendidas,
          `$${p.ingreso_total?.toLocaleString('es-CO')}`
        ]);
        
        if (typeof doc.autoTable === 'function') {
          doc.autoTable({
            head: [['#', 'Producto', 'Unidades', 'Ingreso']],
            body: tableData,
            startY: 80,
            margin: 20,
            theme: 'grid',
            styles: { font: 'helvetica', fontSize: 9 }
          });
        } else {
          // Fallback: tabla manual si autoTable no está disponible
          let y = 80;
          doc.setFontSize(8);
          doc.text('#', 20, y);
          doc.text('Producto', 30, y);
          doc.text('Unidades', 120, y);
          doc.text('Ingreso', 160, y);
          y += 5;
          tableData.forEach(row => {
            doc.text(String(row[0]), 20, y);
            doc.text(row[1].substring(0, 40), 30, y);
            doc.text(String(row[2]), 120, y);
            doc.text(row[3], 160, y);
            y += 5;
          });
        }
      }
      
      doc.save(`Reporte-Ventas-${d.desde}.pdf`);
      console.log('✓ PDF descargado');
    } catch (e) {
      console.error('Error al generar PDF:', e);
      alert('Error al generar PDF. Intenta con CSV');
    }
  } else {
    const csv = [
      ['REPORTE DE VENTAS', d.desde, 'al', d.hasta],
      [],
      ['Métrica', 'Valor'],
      ['Total ventas', d.total_ventas],
      ['Ingresos', d.ingresos],
      [],
      ['TOP PRODUCTOS'],
      ['Posición', 'Producto', 'Unidades', 'Ingreso']
    ];
    d.top_productos?.forEach((p, i) => csv.push([i+1, p.nombre, p.unidades_vendidas, p.ingreso_total]));
    descargarCSV(csv, `Reporte-Ventas-${d.desde}.csv`);
  }
}

function exportarReporteInventario(formato = 'csv') {
  if (!window.rpInvData) { alert('Genera el reporte primero'); return; }
  const d = window.rpInvData;
  
  if (formato === 'pdf') {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text('REPORTE DE INVENTARIO', 20, 20);
      
      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 20, 30);
      
      doc.setFontSize(12);
      doc.text('RESUMEN', 20, 45);
      
      doc.setFontSize(10);
      doc.text(`Total productos: ${d.total_productos}`, 20, 55);
      doc.text(`Valor total: $${d.valor_total?.toLocaleString('es-CO')}`, 20, 62);
      doc.text(`Bajo stock: ${d.bajo_stock}`, 20, 69);
      doc.text(`Sin stock: ${d.sin_stock}`, 20, 76);
      
      if (d.productos_bajo_stock && d.productos_bajo_stock.length > 0) {
        doc.setFontSize(12);
        doc.text('PRODUCTOS CON BAJO STOCK', 20, 90);
        
        const tableData = d.productos_bajo_stock.slice(0, 15).map(p => [
          p.codigo,
          p.nombre,
          p.stock_actual,
          p.stock_minimo,
          `$${p.valor_stock?.toLocaleString('es-CO')}`
        ]);
        
        if (typeof doc.autoTable === 'function') {
          doc.autoTable({
            head: [['Código', 'Producto', 'Stock', 'Mín.', 'Valor']],
            body: tableData,
            startY: 95,
            margin: 20,
            theme: 'grid',
            styles: { font: 'helvetica', fontSize: 8 }
          });
        } else {
          let y = 95;
          doc.setFontSize(7);
          doc.text('Código', 20, y);
          doc.text('Producto', 35, y);
          doc.text('Stock', 100, y);
          doc.text('Mín.', 125, y);
          doc.text('Valor', 145, y);
          y += 4;
          tableData.forEach(row => {
            doc.text(row[0], 20, y);
            doc.text(row[1].substring(0, 30), 35, y);
            doc.text(String(row[2]), 100, y);
            doc.text(String(row[3]), 125, y);
            doc.text(row[4], 145, y);
            y += 4;
          });
        }
      }
      
      doc.save(`Reporte-Inventario-${new Date().toISOString().split('T')[0]}.pdf`);
      console.log('✓ PDF descargado');
    } catch (e) {
      console.error('Error al generar PDF:', e);
      alert('Error al generar PDF. Intenta con CSV');
    }
  } else {
    const csv = [
      ['REPORTE DE INVENTARIO', new Date().toLocaleDateString()],
      [],
      ['Métrica', 'Valor'],
      ['Total productos', d.total_productos],
      ['Valor total', d.valor_total],
      ['Bajo stock', d.bajo_stock],
      ['Sin stock', d.sin_stock],
      [],
      ['PRODUCTOS CON BAJO STOCK'],
      ['Código', 'Producto', 'Stock', 'Mínimo', 'Valor']
    ];
    d.productos_bajo_stock?.forEach(p => csv.push([p.codigo, p.nombre, p.stock_actual, p.stock_minimo, p.valor_stock]));
    descargarCSV(csv, `Reporte-Inventario-${new Date().toISOString().split('T')[0]}.csv`);
  }
}

function exportarBalance(formato = 'csv') {
  if (!window.rpBalanceData) { alert('Genera el reporte primero'); return; }
  const d = window.rpBalanceData;
  
  if (formato === 'pdf') {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text('BALANCE GENERAL', 20, 20);
      
      doc.setFontSize(10);
      doc.text(`Período: ${d.mes}`, 20, 30);
      
      doc.setFontSize(12);
      doc.text('INGRESOS', 20, 45);
      
      doc.setFontSize(10);
      doc.text(`Ventas: $${d.ventas?.toLocaleString('es-CO')}`, 20, 55);
      doc.text(`Alquileres: $${d.alquileres?.toLocaleString('es-CO')}`, 20, 62);
      
      doc.setFontSize(14);
      doc.setTextColor(76, 175, 80);
      doc.text(`TOTAL: $${d.total?.toLocaleString('es-CO')}`, 20, 75);
      doc.setTextColor(0, 0, 0);
      
      if (d.variacion !== undefined) {
        doc.setFontSize(10);
        const color = d.variacion >= 0 ? [76, 175, 80] : [244, 67, 54];
        doc.setTextColor(...color);
        doc.text(`Variación vs mes anterior: ${d.variacion >= 0 ? '+' : ''}${d.variacion}%`, 20, 85);
        doc.setTextColor(0, 0, 0);
      }
      
      doc.save(`Balance-${d.mes}.pdf`);
      console.log('✓ PDF descargado');
    } catch (e) {
      console.error('Error al generar PDF:', e);
      alert('Error al generar PDF. Intenta con CSV');
    }
  } else {
    const csv = [
      ['BALANCE GENERAL', d.mes],
      [],
      ['Concepto', 'Monto'],
      ['Ventas', d.ventas],
      ['Alquileres', d.alquileres],
      ['TOTAL', d.total],
      [],
      d.variacion !== undefined ? ['Variación vs mes anterior', d.variacion + '%'] : []
    ];
    descargarCSV(csv, `Balance-${d.mes}.csv`);
  }
}

function exportarReporteAlquileres(formato = 'csv') {
  if (!window.rpAlqData) { alert('Genera el reporte primero'); return; }
  const d = window.rpAlqData;
  
  if (formato === 'pdf') {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text('REPORTE DE ALQUILERES', 20, 20);
      
      doc.setFontSize(10);
      doc.text(`Período: ${d.desde} al ${d.hasta}`, 20, 30);
      
      let yPos = 40;
      
      // RESUMEN
      doc.setFontSize(12);
      doc.text('RESUMEN GENERAL', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.text(`Total alquileres: ${d.total}`, 20, yPos);
      doc.text(`Activos: ${d.activos}`, 100, yPos);
      yPos += 6;
      
      doc.text(`Finalizados: ${d.finalizados}`, 20, yPos);
      doc.text(`Ingresos totales: $${d.ingresos_total?.toLocaleString('es-CO')}`, 100, yPos);
      yPos += 12;
      
      // INFORMACIÓN DEL ALQUILER ACTIVO
      if (d.alquileres_activos && d.alquileres_activos.length > 0) {
        doc.setFontSize(12);
        doc.text('INFORMACIÓN DEL ALQUILER ACTIVO', 20, yPos);
        yPos += 8;
        
        // Tabla de alquileres activos
        const tableData = d.alquileres_activos.slice(0, 10).map(a => [
          a.maquinaria_nombre,
          a.cliente_nombre,
          a.cliente_id || '—',
          a.cliente_telefono || '—',
          a.fecha_inicio + ' a ' + a.fecha_fin,
          a.dias_restantes.toString() + 'd',
          `$${a.monto?.toLocaleString('es-CO')}`
        ]);
        
        if (typeof doc.autoTable === 'function') {
          doc.autoTable({
            head: [['Máquina', 'Cliente', 'ID', 'Teléfono', 'Período', 'Días', 'Monto']],
            body: tableData,
            startY: yPos,
            margin: 20,
            theme: 'grid',
            styles: { font: 'helvetica', fontSize: 8 }
          });
        }
      }
      
      doc.save(`Reporte-Alquileres-${d.desde}.pdf`);
      console.log('✓ PDF descargado');
    } catch (e) {
      console.error('Error al generar PDF:', e);
      alert('Error al generar PDF. Intenta con CSV');
    }
  } else {
    const csv = [
      ['REPORTE DE ALQUILERES', d.desde, 'al', d.hasta],
      [],
      ['RESUMEN GENERAL'],
      ['Métrica', 'Valor'],
      ['Total alquileres', d.total],
      ['Activos', d.activos],
      ['Finalizados', d.finalizados],
      ['Ingresos totales', d.ingresos_total],
      []
    ];
    
    // Agregar detalle de alquileres activos
    if (d.alquileres_activos && d.alquileres_activos.length > 0) {
      csv.push(['INFORMACIÓN DEL ALQUILER ACTIVO']);
      csv.push(['Máquina', 'Cliente', 'Identificación', 'Teléfono', 'Email', 'Dirección', 'Inicio', 'Fin', 'Días Restantes', 'Monto']);
      d.alquileres_activos.forEach(a => csv.push([
        a.maquinaria_nombre,
        a.cliente_nombre,
        a.cliente_id || '—',
        a.cliente_telefono || '—',
        a.cliente_email || '—',
        a.cliente_direccion || '—',
        a.fecha_inicio,
        a.fecha_fin,
        a.dias_restantes,
        a.monto
      ]));
    }
    
    descargarCSV(csv, `Reporte-Alquileres-${d.desde}.csv`);
  }
}

function exportarReporteBajoStock(formato = 'csv') {
  if (!window.rpBajoStockData) { alert('Genera el reporte primero'); return; }
  const d = window.rpBajoStockData;
  
  if (formato === 'pdf') {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text('PRODUCTOS CON BAJO STOCK', 20, 20);
      
      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 20, 30);
      
      if (d.productos_bajo_stock && d.productos_bajo_stock.length > 0) {
        const tableData = d.productos_bajo_stock.slice(0, 20).map(p => [
          p.codigo,
          p.nombre,
          p.stock_actual,
          p.stock_minimo,
          `$${p.valor_stock?.toLocaleString('es-CO')}`
        ]);
        
        if (typeof doc.autoTable === 'function') {
          doc.autoTable({
            head: [['Código', 'Producto', 'Stock', 'Mín.', 'Valor']],
            body: tableData,
            startY: 40,
            margin: 20,
            theme: 'grid',
            styles: { font: 'helvetica', fontSize: 8 }
          });
        } else {
          let y = 40;
          doc.setFontSize(7);
          doc.text('Código', 20, y);
          doc.text('Producto', 35, y);
          doc.text('Stock', 100, y);
          doc.text('Mín.', 125, y);
          doc.text('Valor', 145, y);
          y += 4;
          tableData.forEach(row => {
            doc.text(row[0], 20, y);
            doc.text(row[1].substring(0, 30), 35, y);
            doc.text(String(row[2]), 100, y);
            doc.text(String(row[3]), 125, y);
            doc.text(row[4], 145, y);
            y += 4;
          });
        }
      }
      
      doc.save(`Reporte-BajoStock-${new Date().toISOString().split('T')[0]}.pdf`);
      console.log('✓ PDF descargado');
    } catch (e) {
      console.error('Error al generar PDF:', e);
      alert('Error al generar PDF. Intenta con CSV');
    }
  } else {
    const csv = [
      ['REPORTE DE PRODUCTOS CON BAJO STOCK', new Date().toLocaleDateString()],
      [],
      ['Código', 'Producto', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Valor']
    ];
    d.productos_bajo_stock?.forEach(p => csv.push([p.codigo, p.nombre, p.categoria, p.stock_actual, p.stock_minimo, p.valor_stock]));
    descargarCSV(csv, `Reporte-BajoStock-${new Date().toISOString().split('T')[0]}.csv`);
  }
}

function descargarCSV(datos, nombreArchivo) {
  const csv = datos.map(fila => fila.map(celda => `"${celda}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nombreArchivo;
  link.click();
  console.log('✓ Exportado:', nombreArchivo);
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

// Cuando se crea una venta, recargar tabla
window.onVentaCreada = (data) => {
  cargarVentas();
  alert('✓ Venta registrada exitosamente');
};

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
(async function init() {
  await verificarAcceso();
  await cargarDashboard();
  await cargarInventario();  // pre-carga para alertas de stock
})();


