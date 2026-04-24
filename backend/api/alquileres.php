<?php
// ============================================================
//  php/api/alquileres.php
// ============================================================
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../conexion.php';
require_once __DIR__ . '/../logger.php';

session_start();

$pdo    = conectar();
$accion = $_GET['accion'] ?? $_POST['accion'] ?? 'equipos';

audit_log_request($pdo, 'api/alquileres.php', $accion);

// Auto-actualizar estado de alquileres vencidos en la BD
$pdo->exec("UPDATE alquileres SET estado = 'vencido' WHERE estado = 'activo' AND fecha_fin < CURDATE()");

switch ($accion) {

    // ----------------------------------------------------------
    //  LISTAR EQUIPOS DISPONIBLES (DEFAULT)
    // ----------------------------------------------------------
    case 'equipos':
        $cat = $_GET['categoria'] ?? null;

        try {
            // Traer equipos ACTIVOS Y DISPONIBLES para alquilar
            // activo = 1 → máquina no fue dada de baja del sistema
            // estado = 'disponible' → máquina está disponible para alquilar
            // Usar LOWER() para evitar problemas de mayúsculas/minúsculas
            $stmt = $pdo->query("
                SELECT id, nombre, descripcion, estado,
                       tarifa_alquiler, img
                FROM maquinaria
                WHERE activo = 1 AND LOWER(estado) = 'disponible'
                ORDER BY nombre ASC
            ");

            $equipos = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($equipos as &$e) {
                $e['id']              = (int)$e['id'];
                $e['tarifa_alquiler'] = (float)$e['tarifa_alquiler'];
                $e['img']             = $e['img'] ?? 'default.png';
                $e['estado']          = strtolower($e['estado']); // Normalizar a minúsculas
            }

            echo json_encode($equipos);
            // audit_log($pdo, 'ALQUILER_EQUIPOS_DISPONIBLES', 'maquinaria', null, ['total' => count($equipos)], $_SESSION['id_usuario'] ?? null);

        } catch (PDOException $e) {
            http_response_code(500);
            audit_log($pdo, 'ALQUILER_EQUIPOS_ERROR', 'maquinaria', null, ['error' => $e->getMessage()], $_SESSION['id_usuario'] ?? null);
            echo json_encode(['error' => 'Error al consultar equipos']);
        }
        break;

    // ----------------------------------------------------------
    //  LISTAR ALQUILERES REALIZADOS
    // ----------------------------------------------------------
    case 'listar':
        $estado = $_GET['estado'] ?? null;

        $where  = ['1=1'];
        $params = [];

        if ($estado) {
            $where[] = 'a.estado = ?';
            $params[] = $estado;
        }

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
        // audit_log($pdo, 'ALQUILER_LISTAR', 'alquileres', null, ['total' => count($alq), 'estado' => $estado], $_SESSION['id_usuario'] ?? null);
        break;

    // ----------------------------------------------------------
    //  DETALLE
    // ----------------------------------------------------------
    case 'detalle':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) { http_response_code(400); audit_log($pdo, 'ALQUILER_DETALLE_FALLIDO', 'alquileres', null, ['motivo' => 'id_requerido'], $_SESSION['id_usuario'] ?? null); echo json_encode(['error' => 'ID requerido']); exit; }

        $stmt = $pdo->prepare("
            SELECT a.id, a.fecha_inicio, a.fecha_fin, a.monto, a.estado, a.fecha_registro,
                   c.nombre AS cliente, c.identificacion, c.telefono, c.email,
                   m.nombre AS maquinaria, m.tarifa_alquiler,
                   u.nombre AS registrado_por
            FROM alquileres a
            LEFT JOIN clientes   c ON c.id = a.id_cliente
            LEFT JOIN maquinaria m ON m.id = a.id_maquinaria
            LEFT JOIN usuarios   u ON u.id = a.id_usuario
            WHERE a.id = ?
        ");
        $stmt->execute([$id]);
        $alq = $stmt->fetch();

        if (!$alq) { http_response_code(404); audit_log($pdo, 'ALQUILER_DETALLE_FALLIDO', 'alquileres', $id, ['motivo' => 'no_encontrado'], $_SESSION['id_usuario'] ?? null); echo json_encode(['error' => 'Alquiler no encontrado']); exit; }
        echo json_encode($alq);
        // audit_log($pdo, 'ALQUILER_DETALLE', 'alquileres', $id, null, $_SESSION['id_usuario'] ?? null);
        break;

    // ----------------------------------------------------------
    //  REGISTRAR
    // ----------------------------------------------------------
    case 'registrar':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit;
        }

        $input        = json_decode(file_get_contents('php://input'), true);
        $id_usuario   = isset($_SESSION['id_usuario']) ? (int)$_SESSION['id_usuario'] : null;
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
                                   (id_usuario, id_cliente, id_maquinaria, fecha_inicio, fecha_fin, monto, estado)
                                   VALUES (?, ?, ?, ?, ?, ?, 'activo')");
            $stmt->execute([$id_usuario, $id_cliente, $id_maquinaria, $fecha_inicio, $fecha_fin, $monto]);
            $id_alquiler = (int)$pdo->lastInsertId();

            // Cambiar estado de maquinaria
            $pdo->prepare("UPDATE maquinaria SET estado = 'alquilada' WHERE id = ?")
                ->execute([$id_maquinaria]);

            $pdo->commit();
            audit_log($pdo, 'ALQUILER_REGISTRADO', 'alquileres', $id_alquiler, ['id_cliente' => $id_cliente, 'id_maquinaria' => $id_maquinaria, 'monto' => $monto], $id_usuario);
            echo json_encode(['ok' => true, 'id_alquiler' => $id_alquiler]);

        } catch (PDOException $e) {
            $pdo->rollBack();
            http_response_code(500);
            audit_log($pdo, 'ALQUILER_REGISTRAR_ERROR', 'alquileres', null, ['error' => $e->getMessage(), 'id_cliente' => $id_cliente, 'id_maquinaria' => $id_maquinaria], $id_usuario);
            echo json_encode(['ok' => false, 'error' => 'Error al crear alquiler: ' . $e->getMessage()]);
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

            if ($alq['estado'] !== 'activo' && $alq['estado'] !== 'vencido') {
                $pdo->rollBack();
                echo json_encode(['ok' => false, 'mensaje' => 'El alquiler ya está finalizado o no es válido para devolución']);
                exit;
            }

            $pdo->prepare("UPDATE alquileres SET estado = 'finalizado', fecha_fin = NOW() WHERE id = ?")
                ->execute([$id]);

            $pdo->prepare("UPDATE maquinaria SET estado = 'disponible' WHERE id = ?")
                ->execute([$alq['id_maquinaria']]);

            $pdo->commit();
            audit_log($pdo, 'ALQUILER_DEVUELTO', 'alquileres', $id, ['id_maquinaria' => (int)$alq['id_maquinaria']], $_SESSION['id_usuario'] ?? null);
            echo json_encode(['ok' => true]);

        } catch (PDOException $e) {
            $pdo->rollBack();
            http_response_code(500);
            audit_log($pdo, 'ALQUILER_DEVOLVER_ERROR', 'alquileres', $id ?: null, ['error' => $e->getMessage()], $_SESSION['id_usuario'] ?? null);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(400);
        audit_log($pdo, 'ACCION_NO_VALIDA', 'api', null, ['endpoint' => 'api/alquileres.php', 'accion' => $accion], $_SESSION['id_usuario'] ?? null);
        echo json_encode(['error' => 'Acción no válida']);
}