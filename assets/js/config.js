/**
 * config.js
 * Configuración global de URLs del API
 * 
 * IMPORTANTE: Cambiar esto cuando subas a producción
 */

// Detectar el entorno automáticamente
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Base URLs del API
const API_BASE_LOCALHOST = 'http://localhost/Ferreteria_Jamarraya/backend';
const API_BASE_PRODUCTION = 'https://ferreteria-jamarraya.vercel.app';

// Función para construir URLs según el entorno
function buildApiUrl(endpoint) {
  if (isDevelopment) {
    // En localhost: /backend/api/auth.php
    return `${API_BASE_LOCALHOST}/api/${endpoint}.php`;
  } else {
    // En producción: /api/auth (sin .php, proxy Node.js lo maneja)
    return `${API_BASE_PRODUCTION}/api/${endpoint}`;
  }
}

// URLs de los endpoints
const API_URLS = {
  // Auth
  login: buildApiUrl('auth') + '?accion=login',
  logout: buildApiUrl('auth') + '?accion=logout',
  register: buildApiUrl('auth') + '?accion=registrar',
  verificar: isDevelopment 
    ? `${API_BASE_LOCALHOST}/usuarios.php?accion=verificar`
    : `${API_BASE_PRODUCTION}/api/usuarios?accion=verificar`,

  // Clientes
  clientes: buildApiUrl('clientes'),
  clientesListar: buildApiUrl('clientes') + '?accion=listar',
  clientesRegistrar: buildApiUrl('clientes') + '?accion=registrar',

  // Maquinaria
  maquinaria: buildApiUrl('alquileres') + '?accion=equipos',
  maquinariaListar: buildApiUrl('maquinaria') + '?accion=listar',
  maquinariaRegistrar: buildApiUrl('maquinaria') + '?accion=registrar',

  // Alquileres
  alquileres: buildApiUrl('alquileres'),
  alquileresRegistrar: buildApiUrl('alquileres') + '?accion=registrar',
  alquileresListar: buildApiUrl('alquileres') + '?accion=listar',

  // Ventas
  ventas: buildApiUrl('ventas'),
  ventasRegistrar: buildApiUrl('ventas') + '?accion=registrar',
  ventasListar: buildApiUrl('ventas') + '?accion=listar',

  // Productos
  productos: buildApiUrl('productos'),
  productosListar: buildApiUrl('productos') + '?accion=listar',
  productosRegistrar: buildApiUrl('productos') + '?accion=registrar',

  // Reportes
  reportes: buildApiUrl('reportes'),

  // Recuperar contraseña
  recuperarContrasena: buildApiUrl('recuperar-contrasena'),

  // Usuarios (para login, logout, verificar)
  usuarios: isDevelopment 
    ? `${API_BASE_LOCALHOST}/usuarios.php`
    : `${API_BASE_PRODUCTION}/api/usuarios`,
};

// Log del entorno actual (solo en desarrollo)
if (isDevelopment) {
  console.log('🔧 Modo DESARROLLO - URLs locales');
} else {
  console.log('🚀 Modo PRODUCCIÓN - URLs remotas con proxy Node.js');
  console.log('📡 API Base:', API_BASE_PRODUCTION);
}
