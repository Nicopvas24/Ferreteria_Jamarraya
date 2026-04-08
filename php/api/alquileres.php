<?php
// ============================================================
//  php/api/alquileres.php
// ============================================================
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../conexion.php';

session_start();

if (!isset($_SESSION['id_usuario'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

$pdo    = conectar();
$accion = $_GET['accion'] ?? $_POST['accion'] ?? 'listar';

switch ($accion) {

    // ----------------------------------------------------------
    //  LISTAR
    // ----------------------------------------------------------
    case 'listar':
        $estado = $_GET['estado'] ?? null;

        $where  = ['1=1'];
        $params = [];

        if ($estado) { $where[] = 'a.estado = ?'; $params[] = $estado; }

        $stmt = $pdo->prepare("
            SELECT a.id, a.fecha_inicio, a.fecha_fin, a.monto, a.estado,
                   c.nombre AS cliente,
                   m.nombre AS maquinaria
            FROM alquileres a
            LEFT JOIN clientes   c ON c.id = a.id_cliente
            LEFT JOIN maquinaria m ON m.id = a.id_maquinaria
            WHERE " . implode(' AND ', $where) . "
            ORDER BY a.fecha_inicio DESC
            LIMIT 200
        ");
        $stmt->execute($params);
        $alq = $stmt->fetchAll();

        foreach ($alq as &$a) {
            $a['monto'] = (float)$a['monto'];
        }

        echo json_encode($alq);
        break;

    // ----------------------------------------------------------
    //  DETALLE
    // ----------------------------------------------------------
    case 'detalle':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID requerido']); exit; }

        $stmt = $pdo->prepare("
            SELECT a.*, c.nombre AS cliente, c.telefono, c.email,
                   m.nombre AS maquinaria, m.tarifa_alquiler
            FROM alquileres a
            LEFT JOIN clientes   c ON c.id = a.id_cliente
            LEFT JOIN maquinaria m ON m.id = a.id_maquinaria
            WHERE a.id = ?
        ");
        $stmt->execute([$id]);
        $alq = $stmt->fetch();

        if (!$alq) { http_response_code(404); echo json_encode(['error' => 'Alquiler no encontrado']); exit; }
        echo json_encode($alq);
        break;

    // ----------------------------------------------------------
    //  REGISTRAR
    // ----------------------------------------------------------
    case 'registrar':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit;
        }

        $input        = json_decode(file_get_contents('php://input'), true);
        $id_cliente   = (int)($input['id_cliente']   ?? 0);
        $id_maquinaria= (int)($input['id_maquinaria']?? 0);
        $fecha_inicio = $input['fecha_inicio'] ?? null;
        $fecha_fin    = $input['fecha_fin']    ?? null;
        $monto        = (float)($input['monto'] ?? 0);

        if (!$id_cliente || !$id_maquinaria || !$fecha_inicio || !$fecha_fin || !$monto) {
            http_response_code(400);
            echo json_encode(['error' => 'Todos los campos son requeridos']);
            exit;
        }

        try {
            $pdo->beginTransaction();

            // Verificar que la maquinaria esté disponible
            $stmt = $pdo->prepare("SELECT estado FROM maquinaria WHERE id = ? FOR UPDATE");
            $stmt->execute([$id_maquinaria]);
            $maq = $stmt->fetch();

            if (!$maq || $maq['estado'] !== 'disponible') {
                $pdo->rollBack();
                echo json_encode(['ok' => false, 'mensaje' => 'Maquinaria no disponible']);
                exit;
            }

            // Insertar alquiler
            $stmt = $pdo->prepare("INSERT INTO alquileres
                                   (id_cliente, id_maquinaria, fecha_inicio, fecha_fin, monto, estado)
                                   VALUES (?, ?, ?, ?, ?, 'activo')");
            $stmt->execute([$id_cliente, $id_maquinaria, $fecha_inicio, $fecha_fin, $monto]);
            $id_alquiler = (int)$pdo->lastInsertId();

            // Cambiar estado de maquinaria
            $pdo->prepare("UPDATE maquinaria SET estado = 'alquilada' WHERE id = ?")
                ->execute([$id_maquinaria]);

            $pdo->commit();
            echo json_encode(['ok' => true, 'id_alquiler' => $id_alquiler]);

        } catch (PDOException $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    // ----------------------------------------------------------
    //  DEVOLVER — cierra el alquiler y libera maquinaria
    // ----------------------------------------------------------
    case 'devolver':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $id    = (int)($input['id'] ?? $_GET['id'] ?? 0);

        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID requerido']); exit; }

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("SELECT id_maquinaria, estado FROM alquileres WHERE id = ? FOR UPDATE");
            $stmt->execute([$id]);
            $alq = $stmt->fetch();

            if (!$alq) {
                $pdo->rollBack();
                echo json_encode(['ok' => false, 'mensaje' => 'Alquiler no encontrado']);
                exit;
            }

            if ($alq['estado'] !== 'activo') {
                $pdo->rollBack();
                echo json_encode(['ok' => false, 'mensaje' => 'El alquiler ya está finalizado']);
                exit;
            }

            $pdo->prepare("UPDATE alquileres SET estado = 'finalizado', fecha_fin = NOW() WHERE id = ?")
                ->execute([$id]);

            $pdo->prepare("UPDATE maquinaria SET estado = 'disponible' WHERE id = ?")
                ->execute([$alq['id_maquinaria']]);

            $pdo->commit();
            echo json_encode(['ok' => true]);

        } catch (PDOException $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Acción no válida']);
}