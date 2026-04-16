<?php
// ============================================================
//  php/api/ventas.php
// ============================================================
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../conexion.php';

session_start();

$pdo    = conectar();
$accion = $_GET['accion'] ?? $_POST['accion'] ?? 'listar';

switch ($accion) {

    // ----------------------------------------------------------
    //  LISTAR ventas con filtro opcional de fechas
    // ----------------------------------------------------------
    case 'listar':
        $desde = $_GET['desde'] ?? null;
        $hasta = $_GET['hasta'] ?? null;

        $where  = ['1=1'];
        $params = [];

        if ($desde) { $where[] = 'DATE(v.fecha) >= ?'; $params[] = $desde; }
        if ($hasta) { $where[] = 'DATE(v.fecha) <= ?'; $params[] = $hasta; }

        $sql = "SELECT v.id, v.comprobante, v.fecha, v.total,
                       c.nombre AS cliente,
                       COUNT(dv.id_producto) AS num_productos
                FROM ventas v
                LEFT JOIN clientes c ON c.id = v.id_cliente
                LEFT JOIN detalle_venta dv ON dv.id_venta = v.id
                WHERE " . implode(' AND ', $where) . "
                GROUP BY v.id
                ORDER BY v.fecha DESC
                LIMIT 200";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $ventas = $stmt->fetchAll();

        foreach ($ventas as &$v) {
            $v['total']         = (float)$v['total'];
            $v['num_productos'] = (int)$v['num_productos'];
        }

        echo json_encode($ventas);
        break;

    // ----------------------------------------------------------
    //  DETALLE de una venta
    // ----------------------------------------------------------
    case 'detalle':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID requerido']); exit; }

        $stmt = $pdo->prepare("SELECT v.*, c.nombre AS cliente, c.email, c.telefono,
                                      u.nombre AS registrado_por
                               FROM ventas v
                               LEFT JOIN clientes c ON c.id = v.id_cliente
                               LEFT JOIN usuarios u ON u.id = v.id_usuario
                               WHERE v.id = ?");
        $stmt->execute([$id]);
        $venta = $stmt->fetch();

        if (!$venta) { http_response_code(404); echo json_encode(['error' => 'Venta no encontrada']); exit; }

        // Items del detalle
        $stmt2 = $pdo->prepare("SELECT dv.cantidad, dv.precio_unitario,
                                       dv.cantidad * dv.precio_unitario AS subtotal,
                                       p.nombre, p.codigo
                                FROM detalle_venta dv
                                JOIN productos p ON p.id = dv.id_producto
                                WHERE dv.id_venta = ?");
        $stmt2->execute([$id]);
        $venta['items'] = $stmt2->fetchAll();

        echo json_encode($venta);
        break;

    // ----------------------------------------------------------
    //  REGISTRAR nueva venta
    // ----------------------------------------------------------
    case 'registrar':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit;
        }

        $input     = json_decode(file_get_contents('php://input'), true);
        $id_cliente = (int)($input['id_cliente'] ?? 0);
        $items      = $input['items'] ?? [];   // [{id_producto, cantidad, precio_unitario}]

        if (!$id_cliente || empty($items)) {
            http_response_code(400);
            echo json_encode(['error' => 'Cliente e items son requeridos']);
            exit;
        }

        try {
            // PRIMERO: Validar stocks ANTES de crear la venta
            $stmtCheckStock = $pdo->prepare("SELECT id, nombre, stock_actual FROM productos WHERE id = ?");
            
            foreach ($items as $item) {
                $idP = (int)$item['id_producto'];
                $qty = (int)$item['cantidad'];
                
                $stmtCheckStock->execute([$idP]);
                $prod = $stmtCheckStock->fetch();
                
                if (!$prod) {
                    http_response_code(400);
                    echo json_encode(['ok' => false, 'mensaje' => "Producto ID $idP no encontrado"]);
                    exit;
                }
                
                if ((int)$prod['stock_actual'] < $qty) {
                    http_response_code(400);
                    echo json_encode(['ok' => false, 'mensaje' => "Stock insuficiente para '{$prod['nombre']}'. Disponible: {$prod['stock_actual']}, Solicitado: $qty"]);
                    exit;
                }
            }

            // SEGUNDA FASE: Crear la venta con transacción y locks
            $pdo->beginTransaction();

            $total = 0;
            foreach ($items as $item) {
                $total += (float)$item['precio_unitario'] * (int)$item['cantidad'];
            }

            // Comprobante único
            $comprobante = 'VTA-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5));

            // Insertar cabecera
            $id_usuario = isset($_SESSION['id_usuario']) ? (int)$_SESSION['id_usuario'] : null;
            $stmt = $pdo->prepare("INSERT INTO ventas (comprobante, fecha, id_cliente, id_usuario, total)
                                   VALUES (?, NOW(), ?, ?, ?)");
            $stmt->execute([$comprobante, $id_cliente, $id_usuario, $total]);
            $id_venta = (int)$pdo->lastInsertId();

            // Procesar cada item CON LOCKS
            // NOTA: El trigger trg_descontar_stock automáticamente resta el stock cuando se inserta en detalle_venta
            $stmtDet  = $pdo->prepare("INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario)
                                       VALUES (?, ?, ?, ?)");
            $stmtLock = $pdo->prepare("SELECT stock_actual FROM productos WHERE id = ? FOR UPDATE");

            foreach ($items as $item) {
                $idP = (int)$item['id_producto'];
                $qty = (int)$item['cantidad'];
                $pu  = (float)$item['precio_unitario'];

                // LOCK la fila
                $stmtLock->execute([$idP]);
                $lockResult = $stmtLock->fetch();
                $stockLocked = (int)$lockResult['stock_actual'];
                
                error_log("VENTA: ID=$idP, Stock LOCKED=$stockLocked, Solicitado=$qty");

                // RE-validar con fila lockeada
                if ($stockLocked < $qty) {
                    $pdo->rollBack();
                    http_response_code(400);
                    echo json_encode(['ok' => false, 'mensaje' => "Stock insuficiente (otra compra intervino). Intenta de nuevo."]);
                    exit;
                }

                // Insertar detalle (el trigger automáticamente restará el stock)
                $stmtDet->execute([$id_venta, $idP, $qty, $pu]);
            }

            $pdo->commit();
            echo json_encode(['ok' => true, 'id_venta' => $id_venta, 'comprobante' => $comprobante, 'total' => $total]);

        } catch (PDOException $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => 'Error al registrar venta: ' . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Acción no válida']);
}