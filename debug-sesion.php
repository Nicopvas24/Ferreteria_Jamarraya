<?php
// ============================================================
//  debug-sesion.php — Pegar en la raíz del proyecto
//  Abrir en el navegador DESPUÉS de hacer login
//  para ver si la sesión PHP persiste entre páginas
// ============================================================
session_start();
header('Content-Type: application/json');
 
echo json_encode([
    'session_id'    => session_id(),
    'session_data'  => $_SESSION ?? [],
    'cookie_sent'   => isset($_COOKIE[session_name()]),
    'php_version'   => PHP_VERSION,
]);
 