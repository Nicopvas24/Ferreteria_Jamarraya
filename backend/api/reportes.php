<?php
// ============================================================
//  php/api/reportes.php
// ============================================================
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../conexion.php';

session_start();

// Solo admin y empleado pueden ver reportes
if (!isset($_SESSION['id_usuario'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

$pdo  = conectar();
$tipo = $_GET['tipo'] ?? '';

switch ($tipo) {

    // ----------------------------------------------------------
    //  REPORTE DE VENTAS
    //  ?tipo=ventas&periodo=dia|semana|mes
    //  ?tipo=ventas&desde=YYYY-MM-DD&hasta=YYYY-MM-DD
    // ----------------------------------------------------------
    case 'ventas':
        $periodo = $_GET['periodo'] ?? 'mes';
        $desde   = $_GET['desde']   ?? null;
        $hasta   = $_GET['hasta']   ?? null;

        // Calcular rango si no viene explícito
        if (!$desde || !$hasta) {
            switch ($periodo) {
                case 'dia':
                    $desde = date('Y-m-d');
                    $hasta = date('Y-m-d');
                    break;
                case 'semana':
                    $desde = date('Y-m-d', strtotime('monday this week'));
                    $hasta = date('Y-m-d');
                    break;
                default: // mes
                    $desde = date('Y-m-01');
                    $hasta = date('Y-m-d');
            }
        }

        // Totales
        $stmt = $pdo->prepare("
            SELECT COUNT(*) AS total_ventas,
                   COALESCE(SUM(total), 0) AS ingresos
            FROM ventas
            WHERE DATE(fecha) BETWEEN ? AND ?
        ");
        $stmt->execute([$desde, $hasta]);
        $totales = $stmt->fetch();

        // Top 10 productos más vendidos
        $stmt2 = $pdo->prepare("
            SELECT p.nombre,
                   SUM(dv.cantidad) AS unidades_vendidas,
                   SUM(dv.cantidad * dv.precio_unitario) AS ingreso_total
            FROM detalle_venta dv
            JOIN ventas    v ON v.id = dv.id_venta
            JOIN productos p ON p.id = dv.id_producto
            WHERE DATE(v.fecha) BETWEEN ? AND ?
            GROUP BY p.id
            ORDER BY unidades_vendidas DESC
            LIMIT 10
        ");
        $stmt2->execute([$desde, $hasta]);
        $top_productos = $stmt2->fetchAll();

        // Ventas por categoría
        $stmt3 = $pdo->prepare("
            SELECT p.categoria,
                   SUM(dv.cantidad) AS unidades,
                   SUM(dv.cantidad * dv.precio_unitario) AS total
            FROM detalle_venta dv
            JOIN ventas    v ON v.id = dv.id_venta
            JOIN productos p ON p.id = dv.id_producto
            WHERE DATE(v.fecha) BETWEEN ? AND ?
            GROUP BY p.categoria
            ORDER BY total DESC
        ");
        $stmt3->execute([$desde, $hasta]);
        $por_categoria = $stmt3->fetchAll();

        echo json_encode([
            'periodo'       => $periodo,
            'desde'         => $desde,
            'hasta'         => $hasta,
            'total_ventas'  => (int)$totales['total_ventas'],
            'ingresos'      => (float)$totales['ingresos'],
            'top_producto'  => !empty($top_productos) ? $top_productos[0]['nombre'] : 'N/A',
            'top_productos' => $top_productos,
            'por_categoria' => $por_categoria,
        ]);
        break;

    // ----------------------------------------------------------
    //  REPORTE DE INVENTARIO
    // ----------------------------------------------------------
    case 'inventario':
        // Resumen general
        $stmt = $pdo->query("
            SELECT COUNT(*) AS total_productos,
                   SUM(stock_actual * precio) AS valor_total,
                   SUM(CASE WHEN stock_actual < stock_minimo THEN 1 ELSE 0 END) AS bajo_stock,
                   SUM(CASE WHEN stock_actual = 0 THEN 1 ELSE 0 END) AS sin_stock
            FROM productos
            WHERE activo = 1
        ");
        $resumen = $stmt->fetch();

        // Productos con bajo stock
        $stmt2 = $pdo->query("
            SELECT codigo, nombre, categoria, stock_actual, stock_minimo, precio,
                   stock_actual * precio AS valor_stock
            FROM productos
            WHERE stock_actual < stock_minimo AND activo = 1
            ORDER BY stock_actual ASC
        ");
        $bajo_stock = $stmt2->fetchAll();

        // Productos sin movimiento en 30 días
        $stmt3 = $pdo->query("
            SELECT p.nombre, p.stock_actual
            FROM productos p
            WHERE p.activo = 1
              AND p.id NOT IN (
                  SELECT DISTINCT dv.id_producto
                  FROM detalle_venta dv
                  JOIN ventas v ON v.id = dv.id_venta
                  WHERE v.fecha >= DATE_SUB(NOW(), INTERVAL 30 DAY)
              )
            ORDER BY p.nombre
            LIMIT 20
        ");
        $sin_movimiento = $stmt3->fetchAll();

        echo json_encode([
            'total_productos' => (int)$resumen['total_productos'],
            'valor_total'     => (float)$resumen['valor_total'],
            'bajo_stock'      => (int)$resumen['bajo_stock'],
            'sin_stock'       => (int)$resumen['sin_stock'],
            'productos_bajo_stock' => $bajo_stock,
            'sin_movimiento'  => $sin_movimiento,
        ]);
        break;

    // ----------------------------------------------------------
    //  REPORTE DE ALQUILERES
    // ----------------------------------------------------------
    case 'alquileres':
        $desde = $_GET['desde'] ?? date('Y-m-01');
        $hasta = $_GET['hasta'] ?? date('Y-m-d');

        $stmt = $pdo->prepare("
            SELECT COUNT(*) AS total,
                   SUM(CASE WHEN estado='activo' THEN 1 ELSE 0 END) AS activos,
                   SUM(CASE WHEN estado='finalizado' THEN 1 ELSE 0 END) AS finalizados,
                   COALESCE(SUM(monto), 0) AS ingresos_total
            FROM alquileres
            WHERE DATE(fecha_inicio) BETWEEN ? AND ?
        ");
        $stmt->execute([$desde, $hasta]);
        $totales = $stmt->fetch();

        // Maquinaria más alquilada
        $stmt2 = $pdo->prepare("
            SELECT m.nombre, COUNT(a.id) AS veces_alquilada,
                   SUM(a.monto) AS ingreso_generado
            FROM alquileres a
            JOIN maquinaria m ON m.id = a.id_maquinaria
            WHERE DATE(a.fecha_inicio) BETWEEN ? AND ?
            GROUP BY m.id
            ORDER BY veces_alquilada DESC
            LIMIT 10
        ");
        $stmt2->execute([$desde, $hasta]);
        $top_maquinaria = $stmt2->fetchAll();

        echo json_encode([
            'desde'           => $desde,
            'hasta'           => $hasta,
            'total'           => (int)$totales['total'],
            'activos'         => (int)$totales['activos'],
            'finalizados'     => (int)$totales['finalizados'],
            'ingresos_total'  => (float)$totales['ingresos_total'],
            'top_maquinaria'  => $top_maquinaria,
        ]);
        break;

    // ----------------------------------------------------------
    //  BALANCE GENERAL mensual
    //  ?tipo=balance&mes=YYYY-MM
    // ----------------------------------------------------------
    case 'balance':
        $mes = $_GET['mes'] ?? date('Y-m');

        // Ventas del mes
        $stmt = $pdo->prepare("
            SELECT COALESCE(SUM(total), 0) AS total_ventas
            FROM ventas
            WHERE DATE_FORMAT(fecha, '%Y-%m') = ?
        ");
        $stmt->execute([$mes]);
        $ventas = (float)$stmt->fetchColumn();

        // Alquileres del mes
        $stmt2 = $pdo->prepare("
            SELECT COALESCE(SUM(monto), 0) AS total_alquileres
            FROM alquileres
            WHERE DATE_FORMAT(fecha_inicio, '%Y-%m') = ?
        ");
        $stmt2->execute([$mes]);
        $alquileres = (float)$stmt2->fetchColumn();

        // Mes anterior para comparación
        $mesAnterior = date('Y-m', strtotime("$mes-01 -1 month"));

        $stmt3 = $pdo->prepare("
            SELECT COALESCE(SUM(total), 0) + (
                SELECT COALESCE(SUM(monto), 0) FROM alquileres
                WHERE DATE_FORMAT(fecha_inicio, '%Y-%m') = ?
            ) AS total_anterior
            FROM ventas
            WHERE DATE_FORMAT(fecha, '%Y-%m') = ?
        ");
        $stmt3->execute([$mesAnterior, $mesAnterior]);
        $totalAnterior = (float)$stmt3->fetchColumn();

        $total      = $ventas + $alquileres;
        $variacion  = $totalAnterior > 0
            ? round((($total - $totalAnterior) / $totalAnterior) * 100, 1)
            : null;

        echo json_encode([
            'mes'        => $mes,
            'ventas'     => $ventas,
            'alquileres' => $alquileres,
            'total'      => $total,
            'variacion'  => $variacion,
        ]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Tipo de reporte no válido. Usa: ventas, inventario, alquileres, balance']);
}