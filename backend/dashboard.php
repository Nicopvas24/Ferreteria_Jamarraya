<?php
// ============================================================
//  dashboard.php — Datos para el panel principal
// ============================================================

require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/logger.php';

session_start();

if (!isset($_SESSION['id_usuario'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

header('Content-Type: application/json');

$pdo = conectar();
audit_log_request($pdo, 'backend/dashboard.php', 'resumen');

// ---- Ventas de hoy ----
$stmt = $pdo->query("SELECT COUNT(*) AS total, COALESCE(SUM(total), 0) AS ingresos
                     FROM ventas
                     WHERE DATE(fecha) = CURDATE()");
$hoy = $stmt->fetch();

// ---- Alquileres activos ----
$stmt = $pdo->query("SELECT COUNT(*) AS total FROM alquileres WHERE estado = 'activo'");
$alquileres = $stmt->fetch();

// ---- Productos con stock bajo ----
$stmt = $pdo->query("SELECT COUNT(*) AS total FROM productos
                     WHERE stock_actual < stock_minimo AND activo = 1");
$stockBajo = $stmt->fetch();

// ---- Alertas ----
$alertas = [];

// Productos con stock crítico
$stmt = $pdo->query("SELECT nombre, stock_actual, stock_minimo
                     FROM productos
                     WHERE stock_actual < stock_minimo AND activo = 1
                     ORDER BY stock_actual ASC
                     LIMIT 5");
foreach ($stmt->fetchAll() as $p) {
    $alertas[] = [
        'nombre'  => $p['nombre'],
        'detalle' => "Stock: {$p['stock_actual']} (mínimo: {$p['stock_minimo']})",
        'etiqueta'=> 'Stock bajo',
        'tipo'    => 'rojo',
    ];
}

// Alquileres próximos a vencer (2 días)
$stmt = $pdo->query("SELECT a.id, c.nombre AS cliente, m.nombre AS maquina, a.fecha_fin
                     FROM alquileres a
                     JOIN clientes c   ON c.id = a.id_cliente
                     JOIN maquinaria m ON m.id = a.id_maquinaria
                     WHERE a.estado = 'activo'
                       AND a.fecha_fin BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 2 DAY)");
foreach ($stmt->fetchAll() as $al) {
    $alertas[] = [
        'nombre'  => $al['cliente'] . ' — ' . $al['maquina'],
        'detalle' => 'Vence el ' . date('d/m/Y', strtotime($al['fecha_fin'])),
        'etiqueta'=> 'Por vencer',
        'tipo'    => 'amarillo',
    ];
}

// Alquileres vencidos
$stmt = $pdo->query("SELECT a.id, c.nombre AS cliente, m.nombre AS maquina, a.fecha_fin
                     FROM alquileres a
                     JOIN clientes c   ON c.id = a.id_cliente
                     JOIN maquinaria m ON m.id = a.id_maquinaria
                     WHERE a.estado = 'activo'
                       AND a.fecha_fin < CURDATE()");
foreach ($stmt->fetchAll() as $al) {
    $alertas[] = [
        'nombre'  => $al['cliente'] . ' — ' . $al['maquina'],
        'detalle' => 'Venció el ' . date('d/m/Y', strtotime($al['fecha_fin'])),
        'etiqueta'=> 'Vencido',
        'tipo'    => 'rojo',
    ];
}

// ---- Últimas 5 ventas ----
$stmt = $pdo->query("SELECT v.comprobante, v.total, v.fecha, c.nombre AS cliente
                     FROM ventas v
                     JOIN clientes c ON c.id = v.id_cliente
                     ORDER BY v.fecha DESC
                     LIMIT 5");
$ventasRecientes = [];
foreach ($stmt->fetchAll() as $v) {
    $ventasRecientes[] = [
        'comprobante' => $v['comprobante'],
        'cliente'     => $v['cliente'],
        'total'       => $v['total'],
        'fecha'       => date('d/m/Y H:i', strtotime($v['fecha'])),
    ];
}

// ---- Respuesta ----
echo json_encode([
    'ventas_hoy'          => (int)$hoy['total'],
    'ingresos_hoy'        => (float)$hoy['ingresos'],
    'alquileres_activos'  => (int)$alquileres['total'],
    'stock_critico'       => (int)$stockBajo['total'],
    'alertas'             => $alertas,
    'ventas_recientes'    => $ventasRecientes,
]);

audit_log($pdo, 'DASHBOARD_CONSULTA', 'dashboard', null, [
    'ventas_hoy' => (int)$hoy['total'],
    'alquileres_activos' => (int)$alquileres['total'],
    'stock_critico' => (int)$stockBajo['total']
], (int)$_SESSION['id_usuario']);
