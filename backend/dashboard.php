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
$stmt = $pdo->query("SELECT l.accion,
                            l.id_registro,
                            p.nombre AS producto,
                            p.stock_actual,
                            p.stock_minimo,
                            c.nombre AS cliente,
                            m.nombre AS maquinaria,
                            a.fecha_fin
                     FROM logs l
                     LEFT JOIN productos p ON l.accion = 'ALERTA_STOCK_BAJO' AND p.id = l.id_registro
                     LEFT JOIN alquileres a ON l.accion IN ('ALERTA_ALQUILER_POR_VENCER', 'ALERTA_ALQUILER_VENCIDO') AND a.id = l.id_registro
                     LEFT JOIN clientes c ON a.id_cliente = c.id
                     LEFT JOIN maquinaria m ON a.id_maquinaria = m.id
                     WHERE l.accion IN ('ALERTA_STOCK_BAJO', 'ALERTA_ALQUILER_POR_VENCER', 'ALERTA_ALQUILER_VENCIDO')
                       AND l.id = (
                            SELECT MAX(l2.id)
                            FROM logs l2
                            WHERE l2.accion = l.accion
                              AND l2.id_registro = l.id_registro
                       )
                       AND (
                            (l.accion = 'ALERTA_STOCK_BAJO' AND p.id IS NOT NULL AND p.activo = 1 AND p.stock_actual < p.stock_minimo)
                            OR
                            (l.accion = 'ALERTA_ALQUILER_POR_VENCER' AND a.id IS NOT NULL AND a.estado = 'activo' AND DATEDIFF(a.fecha_fin, CURDATE()) BETWEEN 0 AND 2)
                            OR
                            (l.accion = 'ALERTA_ALQUILER_VENCIDO' AND a.id IS NOT NULL AND a.estado = 'vencido')
                       )
                     ORDER BY l.fecha DESC
                     LIMIT 100");

foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    if ($row['accion'] === 'ALERTA_STOCK_BAJO') {
        $alertas[] = [
            'nombre'   => $row['producto'] ?? 'Producto',
            'detalle'  => 'Stock: ' . (int)($row['stock_actual'] ?? 0) . ' (mínimo: ' . (int)($row['stock_minimo'] ?? 0) . '). Reabastecer producto',
            'etiqueta' => 'Stock bajo',
            'tipo'     => 'rojo',
        ];
        continue;
    }

    if ($row['accion'] === 'ALERTA_ALQUILER_POR_VENCER') {
        $fechaFin = !empty($row['fecha_fin']) ? date('d/m/Y', strtotime((string)$row['fecha_fin'])) : '';
        $alertas[] = [
            'nombre'   => trim(($row['cliente'] ?? 'Cliente') . ' — ' . ($row['maquinaria'] ?? 'Maquinaria')),
            'detalle'  => 'Vence el ' . $fechaFin . '. Contactar cliente para devolución',
            'etiqueta' => 'Por vencer',
            'tipo'     => 'amarillo',
        ];
        continue;
    }

    if ($row['accion'] === 'ALERTA_ALQUILER_VENCIDO') {
        $fechaFin = !empty($row['fecha_fin']) ? date('d/m/Y', strtotime((string)$row['fecha_fin'])) : '';
        $alertas[] = [
            'nombre'   => trim(($row['cliente'] ?? 'Cliente') . ' — ' . ($row['maquinaria'] ?? 'Maquinaria')),
            'detalle'  => 'Venció el ' . $fechaFin . '. Alquiler vencido - Contactar urgente',
            'etiqueta' => 'Vencido',
            'tipo'     => 'rojo',
        ];
    }
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
