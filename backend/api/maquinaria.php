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
            SELECT id, nombre, descripcion, estado, tarifa_alquiler, activo
            FROM maquinaria
            WHERE " . implode(' AND ', $where) . "
            ORDER BY nombre ASC
        ");
        $stmt->execute($params);
        $maq = $stmt->fetchAll();

        foreach ($maq as &$m) {
            $m['tarifa_alquiler'] = (float)$m['tarifa_alquiler'];
            $m['activo'] = (int)$m['activo'];
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

    case 'obtener':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID requerido']); exit; }

        $stmt = $pdo->prepare("SELECT * FROM maquinaria WHERE id = ?");
        $stmt->execute([$id]);
        $m = $stmt->fetch();

        if (!$m) { http_response_code(404); echo json_encode(['error' => 'No encontrada']); exit; }

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

        $nombre         = trim($_POST['nombre']         ?? '');
        $descripcion    = trim($_POST['descripcion']    ?? '');
        $tarifa_alquiler= (float)($_POST['tarifa_alquiler'] ?? 0);
        $img            = null;

        if (!$nombre || !$tarifa_alquiler) {
            http_response_code(400);
            echo json_encode(['error' => 'Nombre y tarifa son requeridos']);
            exit;
        }

        // Procesar imagen si existe
        if (isset($_FILES['img']) && $_FILES['img']['error'] !== UPLOAD_ERR_NO_FILE) {
            try {
                $archivo = $_FILES['img'];
                
                // Verificar si hay errores en el upload
                if ($archivo['error'] !== UPLOAD_ERR_OK) {
                    $errores = [
                        UPLOAD_ERR_INI_SIZE => 'Archivo supera tamaño máximo del servidor',
                        UPLOAD_ERR_FORM_SIZE => 'Archivo supera tamaño máximo del formulario',
                        UPLOAD_ERR_PARTIAL => 'Archivo se subió parcialmente',
                        UPLOAD_ERR_NO_FILE => 'No se subió archivo',
                        UPLOAD_ERR_NO_TMP_DIR => 'Falta carpeta temporal',
                        UPLOAD_ERR_CANT_WRITE => 'No se puede escribir archivo',
                        UPLOAD_ERR_EXTENSION => 'Extensión de archivo no permitida'
                    ];
                    throw new Exception('Error upload: ' . ($errores[$archivo['error']] ?? 'Error desconocido'));
                }

                // Validar extensión
                $ext = strtolower(pathinfo($archivo['name'], PATHINFO_EXTENSION));
                $extsPermitidas = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                if (!in_array($ext, $extsPermitidas)) {
                    throw new Exception('Extensión no permitida: ' . $ext);
                }

                // Validar tamaño (máx 5MB)
                if ($archivo['size'] > 5 * 1024 * 1024) {
                    throw new Exception('Archivo supera 5MB');
                }

                // Crear directorio si no existe
                $dirImg = __DIR__ . '/../../assets/img/maquinaria/';
                if (!is_dir($dirImg)) {
                    if (!@mkdir($dirImg, 0755, true)) {
                        throw new Exception('No se pudo crear directorio de imágenes');
                    }
                }

                if (!is_writable($dirImg)) {
                    throw new Exception('Directorio no tiene permisos de escritura');
                }

                // Generar nombre único
                $nombreImg = 'maq_' . time() . '_' . uniqid() . '.' . $ext;
                $rutaImg = $dirImg . $nombreImg;

                if (!@move_uploaded_file($archivo['tmp_name'], $rutaImg)) {
                    throw new Exception('Error al guardar la imagen');
                }

                $img = $nombreImg;
                error_log("✅ Imagen guardada: $nombreImg");

            } catch (Exception $e) {
                error_log("⚠️ Error procesando imagen: " . $e->getMessage());
                // Continuar sin imagen
            }
        }

        // Insertar en BD
        try {
            $stmt = $pdo->prepare("INSERT INTO maquinaria (nombre, descripcion, estado, tarifa_alquiler, img)
                                   VALUES (?, ?, 'disponible', ?, ?)");
            $stmt->execute([$nombre, $descripcion, $tarifa_alquiler, $img]);

            echo json_encode(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al guardar en base de datos: ' . $e->getMessage()]);
        }
        break;

    case 'editar':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit;
        }

        if ($_SESSION['rol'] !== 'admin') {
            http_response_code(403); echo json_encode(['error' => 'Sin permisos']); exit;
        }

        $id    = (int)($_POST['id'] ?? 0);
        $nombre = trim($_POST['nombre'] ?? '');
        $descripcion = trim($_POST['descripcion'] ?? '');
        $tarifa_alquiler = (float)($_POST['tarifa_alquiler'] ?? 0);

        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID requerido']); exit; }
        if (!$nombre) { http_response_code(400); echo json_encode(['error' => 'Nombre requerido']); exit; }
        if (!$tarifa_alquiler) { http_response_code(400); echo json_encode(['error' => 'Tarifa requerida']); exit; }

        try {
            // Obtener datos actuales
            $stmt = $pdo->prepare("SELECT img FROM maquinaria WHERE id = ?");
            $stmt->execute([$id]);
            $maq = $stmt->fetch();

            if (!$maq) {
                http_response_code(404);
                echo json_encode(['error' => 'Maquinaria no encontrada']);
                exit;
            }

            $nombreImg = $maq['img']; // Mantener imagen actual por defecto

            // Procesar imagen si se proporciona
            if (isset($_FILES['img']) && $_FILES['img']['error'] !== UPLOAD_ERR_NO_FILE) {
                try {
                    // Función guardarImagen existe en productos.php, la reutilizamos aquí
                    $archivo = $_FILES['img'];
                    
                    if ($archivo['error'] !== UPLOAD_ERR_OK) {
                        throw new Exception('Error upload');
                    }

                    if ($archivo['size'] > 5 * 1024 * 1024) {
                        throw new Exception('Imagen excede 5MB');
                    }

                    $tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
                    $tipo = $archivo['type'] ?? mime_content_type($archivo['tmp_name']);
                    
                    if (!in_array($tipo, $tiposPermitidos)) {
                        throw new Exception('Tipo no permitido');
                    }

                    $dirImg = __DIR__ . '/../../assets/img/maquinaria/';
                    if (!is_dir($dirImg) && !@mkdir($dirImg, 0755, true)) {
                        throw new Exception('No se pude crear directorio');
                    }

                    if (!is_writable($dirImg)) {
                        throw new Exception('Directorio no escribible');
                    }

                    // Generar nombre único
                    $ext = strtolower(pathinfo($archivo['name'], PATHINFO_EXTENSION));
                    $nuevoNombre = 'maq_' . time() . '_' . uniqid() . '.' . $ext;
                    $rutaImg = $dirImg . $nuevoNombre;

                    if (!@move_uploaded_file($archivo['tmp_name'], $rutaImg)) {
                        throw new Exception('Error guardando archivo');
                    }

                    // Eliminar imagen anterior si existe
                    if ($maq['img'] && $maq['img'] !== 'default.png') {
                        $rutaAntigua = $dirImg . $maq['img'];
                        if (file_exists($rutaAntigua)) {
                            @unlink($rutaAntigua);
                        }
                    }

                    $nombreImg = $nuevoNombre;
                    error_log("✅ Imagen actualizada: $nuevoNombre");

                } catch (Exception $e) {
                    error_log("⚠️ Error procesando imagen: " . $e->getMessage());
                    // Continuar con imagen anterior
                }
            }

            // Actualizar en base de datos
            $stmt = $pdo->prepare("UPDATE maquinaria 
                                   SET nombre=?, descripcion=?, tarifa_alquiler=?, img=?
                                   WHERE id=?");
            $stmt->execute([$nombre, $descripcion, $tarifa_alquiler, $nombreImg, $id]);

            echo json_encode(['ok' => true, 'mensaje' => 'Maquinaria actualizada correctamente']);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error en BD: ' . $e->getMessage()]);
        }
        break;

    case 'cambiar_estado':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit;
        }

        if ($_SESSION['rol'] !== 'admin') {
            http_response_code(403); echo json_encode(['error' => 'Sin permisos']); exit;
        }

        $id = (int)($_POST['id'] ?? 0);
        $activo = (int)($_POST['activo'] ?? 0);

        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID requerido']); exit; }

        try {
            // Verificar que exista
            $stmt = $pdo->prepare("SELECT id FROM maquinaria WHERE id = ?");
            $stmt->execute([$id]);

            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => 'Maquinaria no encontrada']);
                exit;
            }

            // Cambiar estado
            $stmt = $pdo->prepare("UPDATE maquinaria SET activo = ? WHERE id = ?");
            $stmt->execute([$activo, $id]);

            $mensaje = $activo ? 'Maquinaria activada correctamente' : 'Maquinaria desactivada correctamente';
            echo json_encode(['ok' => true, 'mensaje' => $mensaje]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error en BD: ' . $e->getMessage()]);
        }
        break;

    case 'eliminar':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit;
        }

        if ($_SESSION['rol'] !== 'admin') {
            http_response_code(403); echo json_encode(['error' => 'Sin permisos']); exit;
        }

        $id = (int)($_POST['id'] ?? 0);
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID requerido']); exit; }

        try {
            // Verificar que exista
            $stmt = $pdo->prepare("SELECT id FROM maquinaria WHERE id = ?");
            $stmt->execute([$id]);

            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => 'Maquinaria no encontrada']);
                exit;
            }

            // Soft delete: marcar como inactiva
            $stmt = $pdo->prepare("UPDATE maquinaria SET activo = 0 WHERE id = ?");
            $stmt->execute([$id]);

            echo json_encode(['ok' => true, 'mensaje' => 'Maquinaria desactivada correctamente']);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error en BD: ' . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Acción no válida']);
}
