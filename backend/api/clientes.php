<?php
// ============================================================
//  php/api/clientes.php
// ============================================================
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../conexion.php';

session_start();

$pdo    = conectar();

// Extraer acción y datos desde GET, POST o JSON body
$input  = null;
$accion = $_GET['accion'] ?? $_POST['accion'] ?? null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $input = $decoded;
    }
}

if (!$accion && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $accion = $input['accion'] ?? 'listar';
} else if (!$accion) {
    $accion = 'listar';
}

switch ($accion) {

    // ----------------------------------------------------------
    //  LISTAR con búsqueda opcional
    // ----------------------------------------------------------
    case 'listar':
        $buscar = $_GET['buscar'] ?? null;

        $where  = ['1=1'];
        $params = [];

        if ($buscar) {
            $where[]  = '(c.nombre LIKE ? OR c.identificacion LIKE ? OR c.email LIKE ?)';
            $like     = "%$buscar%";
            $params[] = $like; $params[] = $like; $params[] = $like;
        }

        $stmt = $pdo->prepare("
            SELECT c.id, c.nombre, c.identificacion, c.telefono, c.email, c.direccion,
                   COUNT(DISTINCT v.id) AS total_compras,
                   COUNT(DISTINCT a.id) AS total_alquileres
            FROM clientes c
            LEFT JOIN ventas      v ON v.id_cliente = c.id
            LEFT JOIN alquileres  a ON a.id_cliente = c.id
            WHERE " . implode(' AND ', $where) . "
            GROUP BY c.id
            ORDER BY c.nombre ASC
            LIMIT 200
        ");
        $stmt->execute($params);
        $clientes = $stmt->fetchAll();

        foreach ($clientes as &$cl) {
            $cl['total_compras']    = (int)$cl['total_compras'];
            $cl['total_alquileres'] = (int)$cl['total_alquileres'];
        }

        echo json_encode($clientes);
        break;

    // ----------------------------------------------------------
    //  DETALLE de un cliente con historial
    // ----------------------------------------------------------
    case 'detalle':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID requerido']); exit; }

        $stmt = $pdo->prepare("SELECT * FROM clientes WHERE id = ?");
        $stmt->execute([$id]);
        $cliente = $stmt->fetch();
        if (!$cliente) { http_response_code(404); echo json_encode(['error' => 'No encontrado']); exit; }

        // Últimas 10 ventas
        $stmt2 = $pdo->prepare("SELECT id, comprobante, fecha, total
                                 FROM ventas WHERE id_cliente = ?
                                 ORDER BY fecha DESC LIMIT 10");
        $stmt2->execute([$id]);
        $cliente['ventas'] = $stmt2->fetchAll();

        // Últimos 10 alquileres
        $stmt3 = $pdo->prepare("SELECT a.id, a.fecha_inicio, a.fecha_fin, a.monto, a.estado,
                                        m.nombre AS maquinaria
                                 FROM alquileres a
                                 LEFT JOIN maquinaria m ON m.id = a.id_maquinaria
                                 WHERE a.id_cliente = ?
                                 ORDER BY a.fecha_inicio DESC LIMIT 10");
        $stmt3->execute([$id]);
        $cliente['alquileres'] = $stmt3->fetchAll();

        echo json_encode($cliente);
        break;

    // ----------------------------------------------------------
    //  REGISTRAR nuevo cliente
    // ----------------------------------------------------------
    case 'registrar':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit;
        }

        try {
            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'JSON inválido en el request']);
                exit;
            }

            $nombre        = trim($input['nombre']        ?? '');
            $identificacion= trim($input['identificacion']?? '');
            $telefono      = trim($input['telefono']      ?? '') ?: null;
            $email         = trim($input['email']         ?? '') ?: null;
            $direccion     = trim($input['direccion']     ?? '') ?: null;

            if (!$nombre || !$identificacion) {
                http_response_code(400);
                echo json_encode(['error' => 'Nombre e identificación son requeridos']);
                exit;
            }

            // Comprobar si el usuario está logueado
            $id_usuario = isset($_SESSION['id_usuario']) ? $_SESSION['id_usuario'] : null;

            if ($id_usuario) {
                // Buscar si ya tiene un perfil de cliente
                $checkUser = $pdo->prepare("SELECT id FROM clientes WHERE id_usuario = ? LIMIT 1");
                $checkUser->execute([$id_usuario]);
                if ($rowUser = $checkUser->fetch()) {
                    // Actualizar datos del cliente existente
                    $update = $pdo->prepare("UPDATE clientes SET nombre=?, identificacion=?, telefono=?, email=?, direccion=? WHERE id=?");
                    $update->execute([$nombre, $identificacion, $telefono, $email, $direccion, $rowUser['id']]);
                    echo json_encode(['ok' => true, 'id_cliente' => (int)$rowUser['id'], 'id' => (int)$rowUser['id']]);
                    exit;
                }
            }

            // Verificar identificación única
            $check = $pdo->prepare("SELECT id, id_usuario FROM clientes WHERE identificacion = ?");
            $check->execute([$identificacion]);
            $row = $check->fetch();
            if ($row) {
                // Si la identificación existe, asociar al usuario si no tiene
                if ($id_usuario && empty($row['id_usuario'])) {
                    $update = $pdo->prepare("UPDATE clientes SET id_usuario = ? WHERE id = ?");
                    $update->execute([$id_usuario, $row['id']]);
                }
                echo json_encode(['ok' => true, 'id_cliente' => (int)$row['id'], 'id' => (int)$row['id']]);
                exit;
            }

            // Insertar cliente
            $stmt = $pdo->prepare("INSERT INTO clientes (id_usuario, nombre, identificacion, telefono, email, direccion)
                                   VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$id_usuario, $nombre, $identificacion, $telefono, $email, $direccion]);

            echo json_encode(['ok' => true, 'id_cliente' => (int)$pdo->lastInsertId(), 'id' => (int)$pdo->lastInsertId()]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error en base de datos: ' . $e->getMessage()]);
        }
        break;

    // ----------------------------------------------------------
    //  EDITAR cliente
    // ----------------------------------------------------------
    case 'editar':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit;
        }

        try {
            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'JSON inválido en el request']);
                exit;
            }

            $id    = (int)($input['id'] ?? 0);
            $nombre        = trim($input['nombre']         ?? '');
            $identificacion= trim($input['identificacion'] ?? '');
            $telefono      = trim($input['telefono']       ?? '') ?: null;
            $email         = trim($input['email']          ?? '') ?: null;
            $direccion     = trim($input['direccion']      ?? '') ?: null;

            if (!$id) { 
                http_response_code(400); 
                echo json_encode(['error' => 'ID requerido']); 
                exit; 
            }

            if (!$nombre || !$identificacion) {
                http_response_code(400);
                echo json_encode(['error' => 'Nombre e identificación son requeridos']);
                exit;
            }

            // Verificar que identificación sea única (excepto para el mismo cliente)
            $check = $pdo->prepare("SELECT id FROM clientes WHERE identificacion = ? AND id != ?");
            $check->execute([$identificacion, $id]);
            if ($check->fetch()) {
                echo json_encode(['ok' => false, 'mensaje' => 'Ya existe otro cliente con esa identificación']);
                exit;
            }

            $stmt = $pdo->prepare("UPDATE clientes
                                   SET nombre=?, identificacion=?, telefono=?, email=?, direccion=?
                                   WHERE id=?");
            $stmt->execute([
                $nombre,
                $identificacion,
                $telefono,
                $email,
                $direccion,
                $id
            ]);

            echo json_encode(['ok' => true]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error en base de datos: ' . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Acción no válida']);
}