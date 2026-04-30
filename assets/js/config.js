/**
 * config.js
 * Configuración global de URLs del API
 * 
 * IMPORTANTE: Cambiar esto cuando subas a producción
 */

// Detectar el entorno automáticamente
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Base URL del API
// - En localhost: usa URLs locales
// - En GitHub Pages (o cualquier producción): usa InfinityFree
const API_BASE_URL = isDevelopment 
  ? 'http://localhost/Ferreteria_Jamarraya/backend'
  : 'https://ferreteriajamarraya.rf.gd/backend';  // HTTPS ✅

// URLs de los endpoints
const API_URLS = {
  // Auth
  login: `${API_BASE_URL}/api/auth.php?accion=login`,
  logout: `${API_BASE_URL}/api/auth.php?accion=logout`,
  register: `${API_BASE_URL}/api/auth.php?accion=registrar`,
  verificar: `${API_BASE_URL}/usuarios.php?accion=verificar`,

  // Clientes
  clientes: `${API_BASE_URL}/api/clientes.php`,
  clientesListar: `${API_BASE_URL}/api/clientes.php?accion=listar`,
  clientesRegistrar: `${API_BASE_URL}/api/clientes.php?accion=registrar`,

  // Maquinaria
  maquinaria: `${API_BASE_URL}/api/alquileres.php?accion=equipos`,
  maquinariaListar: `${API_BASE_URL}/api/maquinaria.php?accion=listar`,
  maquinariaRegistrar: `${API_BASE_URL}/api/maquinaria.php?accion=registrar`,

  // Alquileres
  alquileres: `${API_BASE_URL}/api/alquileres.php`,
  alquileresRegistrar: `${API_BASE_URL}/api/alquileres.php?accion=registrar`,
  alquileresListar: `${API_BASE_URL}/api/alquileres.php?accion=listar`,

  // Ventas
  ventas: `${API_BASE_URL}/api/ventas.php`,
  ventasRegistrar: `${API_BASE_URL}/api/ventas.php?accion=registrar`,
  ventasListar: `${API_BASE_URL}/api/ventas.php?accion=listar`,

  // Productos
  productos: `${API_BASE_URL}/api/productos.php`,
  productosListar: `${API_BASE_URL}/api/productos.php?accion=listar`,
  productosRegistrar: `${API_BASE_URL}/api/productos.php?accion=registrar`,

  // Reportes
  reportes: `${API_BASE_URL}/api/reportes.php`,

  // Recuperar contraseña
  recuperarContrasena: `${API_BASE_URL}/api/recuperar-contrasena.php`,

  // Usuarios (para login, logout, verificar)
  usuarios: `${API_BASE_URL}/usuarios.php`,
};

// Log del entorno actual (solo en desarrollo)
if (isDevelopment) {
  console.log('🔧 Modo DESARROLLO - URLs locales');
} else {
  console.log('🚀 Modo PRODUCCIÓN - URLs remotas');
  console.log('📡 API Base:', API_BASE_URL);
}
