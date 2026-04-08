<?php
// ============================================================
//  php/api/maquinaria.php
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

    case 'listar':
        $estado = $_GET['estado'] ?? null;
        $where  = ['1=1'];
        $params = [];

        if ($estado) { $where[] = 'estado = ?'; $params[] = $estado; }

        $stmt = $pdo->prepare("
            SELECT id, nombre, descripcion, estado, tarifa_alquiler
            FROM maquinaria
            WHERE " . implode(' AND ', $where) . "
            ORDER BY nombre ASC
        ");
        $stmt->execute($params);
        $maq = $stmt->fetchAll();

        foreach ($maq as &$m) {
            $m['tarifa_alquiler'] = (float)$m['tarifa_alquiler'];
        }

        echo json_encode($maq);
        break;

    case 'detalle':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID requerido']); exit; }

        $stmt = $pdo->prepare("SELECT * FROM maquinaria WHERE id = ?");
        $stmt->execute([$id]);
        $m = $stmt->fetch();

        if (!$m) { http_response_code(404); echo json_encode(['error' => 'No encontrada']); exit; }

        // Historial de alquileres de esta máquina
        $stmt2 = $pdo->prepare("SELECT a.id, a.fecha_inicio, a.fecha_fin, a.monto, a.estado,
                                        c.nombre AS cliente
                                 FROM alquileres a
                                 JOIN clientes c ON c.id = a.id_cliente
                                 WHERE a.id_maquinaria = ?
                                 ORDER BY a.fecha_inicio DESC LIMIT 20");
        $stmt2->execute([$id]);
        $m['historial'] = $stmt2->fetchAll();

        echo json_encode($m);
        break;

    case 'registrar':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit;
        }

        // Solo admin
        if ($_SESSION['rol'] !== 'admin') {
            http_response_code(403); echo json_encode(['error' => 'Sin permisos']); exit;
        }

        $input          = json_decode(file_get_contents('php://input'), true);
        $nombre         = trim($input['nombre']         ?? '');
        $descripcion    = trim($input['descripcion']    ?? '');
        $tarifa_alquiler= (float)($input['tarifa_alquiler'] ?? 0);

        if (!$nombre || !$tarifa_alquiler) {
            http_response_code(400);
            echo json_encode(['error' => 'Nombre y tarifa son requeridos']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO maquinaria (nombre, descripcion, estado, tarifa_alquiler)
                               VALUES (?, ?, 'disponible', ?)");
        $stmt->execute([$nombre, $descripcion, $tarifa_alquiler]);

        echo json_encode(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
        break;

    case 'editar':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit;
        }

        if ($_SESSION['rol'] !== 'admin') {
            http_response_code(403); echo json_encode(['error' => 'Sin permisos']); exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $id    = (int)($input['id'] ?? 0);

        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID requerido']); exit; }

        $stmt = $pdo->prepare("UPDATE maquinaria
                               SET nombre=?, descripcion=?, tarifa_alquiler=?, estado=?
                               WHERE id=?");
        $stmt->execute([
            trim($input['nombre']      ?? ''),
            trim($input['descripcion'] ?? ''),
            (float)($input['tarifa_alquiler'] ?? 0),
            $input['estado'] ?? 'disponible',
            $id
        ]);

        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Acción no válida']);
}