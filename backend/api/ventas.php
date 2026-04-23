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
        $cliente = trim($_GET['cliente'] ?? '');
        $producto = trim($_GET['producto'] ?? '');

        $where  = ['1=1'];
        $params = [];

        if ($desde) { $where[] = 'DATE(v.fecha) >= ?'; $params[] = $desde; }
        if ($hasta) { $where[] = 'DATE(v.fecha) <= ?'; $params[] = $hasta; }
        if ($cliente !== '') {
            $where[] = '(c.nombre LIKE ? OR c.identificacion LIKE ?)';
            $likeCliente = "%{$cliente}%";
            $params[] = $likeCliente;
            $params[] = $likeCliente;
        }
        if ($producto !== '') {
            $where[] = "EXISTS (
                SELECT 1
                FROM detalle_venta dvf
                JOIN productos pf ON pf.id = dvf.id_producto
                WHERE dvf.id_venta = v.id
                  AND pf.nombre LIKE ?
            )";
            $params[] = "%{$producto}%";
        }

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

    // ----------------------------------------------------------
    //  MIS COMPRAS — obtener historial del cliente logueado
    // ----------------------------------------------------------
    case 'mis_compras':
        $id_cliente = (int)($_GET['id_cliente'] ?? $_POST['id_cliente'] ?? 0);

        if (!$id_cliente) {
            http_response_code(400);
            echo json_encode(['error' => 'ID cliente requerido']);
            exit;
        }

        // Recolectar TODOS los id_cliente vinculados a este usuario
        // (puede existir más de un registro de cliente para el mismo usuario)
        $ids_cliente = [$id_cliente];

        // Buscar si el cliente tiene id_usuario y obtener otros registros del mismo usuario
        $stmtUser = $pdo->prepare("SELECT id_usuario FROM clientes WHERE id = ? LIMIT 1");
        $stmtUser->execute([$id_cliente]);
        $rowUser = $stmtUser->fetch(PDO::FETCH_ASSOC);
        if ($rowUser && $rowUser['id_usuario']) {
            $id_usuario = (int)$rowUser['id_usuario'];
            $stmtOtros = $pdo->prepare("SELECT id FROM clientes WHERE id_usuario = ?");
            $stmtOtros->execute([$id_usuario]);
            foreach ($stmtOtros->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $ids_cliente[] = (int)$r['id'];
            }
        }
        // También buscar por id_usuario en sesión como fallback adicional
        if (isset($_SESSION['id_usuario'])) {
            $stmtSess = $pdo->prepare("SELECT id FROM clientes WHERE id_usuario = ?");
            $stmtSess->execute([$_SESSION['id_usuario']]);
            foreach ($stmtSess->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $ids_cliente[] = (int)$r['id'];
            }
        }
        $ids_cliente = array_values(array_unique($ids_cliente));
        $placeholders = implode(',', array_fill(0, count($ids_cliente), '?'));

        $sql = "SELECT v.id, v.comprobante, v.fecha, v.total,
                       COUNT(dv.id_producto) AS num_productos
                FROM ventas v
                LEFT JOIN detalle_venta dv ON dv.id_venta = v.id
                WHERE v.id_cliente IN ($placeholders)
                GROUP BY v.id
                ORDER BY v.fecha DESC
                LIMIT 50";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($ids_cliente);
        $ventas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($ventas as &$v) {
            $v['id'] = (int)$v['id'];
            $v['total'] = (float)$v['total'];
            $v['num_productos'] = (int)$v['num_productos'];
            $v['fecha_formateada'] = (new DateTime($v['fecha']))->format('d/m/Y H:i');
        }

        // Fetch alquileres
        $sqlAlq = "SELECT a.id, a.fecha_inicio, a.fecha_fin, a.monto, a.estado, a.fecha_registro,
                          m.nombre AS maquinaria
                   FROM alquileres a
                   LEFT JOIN maquinaria m ON m.id = a.id_maquinaria
                   WHERE a.id_cliente IN ($placeholders)
                   ORDER BY a.fecha_registro DESC
                   LIMIT 50";
        $stmtAlq = $pdo->prepare($sqlAlq);
        $stmtAlq->execute($ids_cliente);
        $alquileres = $stmtAlq->fetchAll(PDO::FETCH_ASSOC);

        foreach ($alquileres as &$a) {
            $a['id'] = (int)$a['id'];
            $a['monto'] = (float)$a['monto'];
            $a['fecha_formateada'] = (new DateTime($a['fecha_registro']))->format('d/m/Y H:i');
        }

        echo json_encode(['ok' => true, 'compras' => $ventas, 'alquileres' => $alquileres]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Acción no válida']);
}