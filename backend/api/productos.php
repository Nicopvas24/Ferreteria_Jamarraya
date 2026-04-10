<?php
// ============================================================
//  backend/api/productos.php
//  Admin: CRUD productos + Exportación CSV
// ============================================================

// Iniciar sesión PRIMERO
session_start();

// CORS headers
header('Access-Control-Allow-Origin: ' . (isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : 'http://localhost'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Manejar preflight requests (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../conexion.php';

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function guardarImagen($archivo) {
    // Validar que el primer argumento sea un array
    if (!is_array($archivo)) {
        throw new Exception('Error: Archivo no es válido');
    }

    // Verificar si hay errores en el upload
    if (!isset($archivo['error'])) {
        throw new Exception('Error: No se recibió archivo');
    }

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

    // Validar que exista el archivo temporal
    if (!isset($archivo['tmp_name']) || !file_exists($archivo['tmp_name'])) {
        throw new Exception('Error: No existe archivo temporal');
    }

    // Validar tamaño
    $maxSize = 5 * 1024 * 1024; // 5MB
    if ($archivo['size'] > $maxSize) {
        throw new Exception('Imagen excede tamaño máximo (5MB)');
    }

    // Validar tipo
    $tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    $tipo = $archivo['type'] ?? mime_content_type($archivo['tmp_name']);
    
    if (!in_array($tipo, $tiposPermitidos)) {
        throw new Exception('Tipo de archivo no permitido: ' . $tipo);
    }

    // Crear directorio si no existe
    $dirImg = __DIR__ . '/../../assets/img/productos/';
    if (!is_dir($dirImg)) {
        if (!@mkdir($dirImg, 0755, true)) {
            throw new Exception('No se puede crear directorio de imágenes');
        }
    }

    // Verificar que el directorio sea escribible
    if (!is_writable($dirImg)) {
        throw new Exception('Directorio de imágenes no es escribible');
    }

    // Generar nombre único
    $ext = strtolower(pathinfo($archivo['name'], PATHINFO_EXTENSION));
    $nombreImg = 'prod_' . time() . '_' . uniqid() . '.' . $ext;
    $rutaImg = $dirImg . $nombreImg;

    // Mover archivo
    if (!@move_uploaded_file($archivo['tmp_name'], $rutaImg)) {
        throw new Exception('Error al guardar imagen en: ' . $rutaImg);
    }

    // Verificar que el archivo se guardó correctamente
    if (!file_exists($rutaImg)) {
        throw new Exception('Archivo no se guardó correctamente');
    }

    return $nombreImg;
}

function borrarImagenAntigua($nombreImg) {
    if (!$nombreImg || $nombreImg === 'nombreimagen.png') return;
    
    $ruta = __DIR__ . '/../../assets/img/productos/' . $nombreImg;
    if (file_exists($ruta)) {
        @unlink($ruta);
    }
}

// ============================================================
// VERIFICACIÓN DE SESIÓN
// ============================================================

$accion = $_GET['accion'] ?? $_POST['accion'] ?? 'listar';
$esAdmin = isset($_SESSION['id_usuario']) && 
           isset($_SESSION['rol']) && 
           $_SESSION['rol'] === 'admin';

// Para listar (pública), no requiere admin
// Para otras acciones, requiere admin
if ($accion !== 'listar' && !$esAdmin) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'No autorizado']);
    exit;
}

$pdo = conectar();

switch ($accion) {

    // ==============================================================
    // LISTAR PRODUCTOS (Pública - para catálogo)
    // ==============================================================
    case 'listar':
        header('Content-Type: application/json');
        try {
            $cat = $_GET['categoria'] ?? null;
            $soloActivos = $_GET['solo_activos'] ?? true;

            $sql = "SELECT id, codigo, nombre, descripcion, categoria,
                           precio, stock_actual, stock_minimo, activo, img
                    FROM productos
                    WHERE 1=1";
            $params = [];

            if ($cat && $cat !== 'todos') {
                $sql .= " AND categoria = ?";
                $params[] = $cat;
            }

            if ($soloActivos) {
                $sql .= " AND activo = 1";
            }

            $sql .= " ORDER BY nombre DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($productos as &$p) {
                $p['id']            = (int)$p['id'];
                $p['precio']        = (float)$p['precio'];
                $p['stock_actual']  = (int)$p['stock_actual'];
                $p['stock_minimo']  = (int)$p['stock_minimo'];
                $p['activo']        = (bool)$p['activo'];
            }

            echo json_encode($productos);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al consultar productos: ' . $e->getMessage()]);
        }
        break;

    // ==============================================================
    // CREAR PRODUCTO (Admin)
    // ==============================================================
    case 'crear':
        header('Content-Type: application/json');
        try {
            $codigo       = trim($_POST['codigo']      ?? '');
            $nombre       = trim($_POST['nombre']      ?? '');
            $descripcion  = trim($_POST['descripcion'] ?? '') ?: null;
            $categoria    = trim($_POST['categoria']   ?? '');
            $precio       = (float)($_POST['precio']   ?? 0);
            $stock        = (int)($_POST['stock_actual']   ?? 0);
            $stockMin     = (int)($_POST['stock_minimo']   ?? 0);

            // Validaciones básicas
            if (!$codigo || strlen($codigo) > 50) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'mensaje' => 'Código inválido']);
                exit;
            }

            if (!$nombre || strlen($nombre) > 150) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'mensaje' => 'Nombre inválido']);
                exit;
            }

            if (!$categoria) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'mensaje' => 'Categoría requerida']);
                exit;
            }

            if ($precio < 0) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'mensaje' => 'Precio debe ser positivo']);
                exit;
            }

            if ($stock < 0 || $stockMin < 0) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'mensaje' => 'Stock no puede ser negativo']);
                exit;
            }

            // Verificar código único
            $check = $pdo->prepare("SELECT id FROM productos WHERE codigo = ?");
            $check->execute([$codigo]);
            if ($check->fetch()) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'mensaje' => 'Ya existe un producto con ese código']);
                exit;
            }

            // Procesar imagen - SOLO si se proporciona
            $nombreImg = 'nombreimagen.png'; // Valor por defecto
            
            if (isset($_FILES['imagen']) && $_FILES['imagen']['error'] !== UPLOAD_ERR_NO_FILE) {
                try {
                    $nombreImg = guardarImagen($_FILES['imagen']);
                } catch (Exception $e) {
                    // Si hay error al guardar imagen, continuamos con la imagen por defecto
                    error_log('Error al guardar imagen: ' . $e->getMessage());
                    // O podemos ser estrictos y rechazar
                    // throw new Exception('Error al procesar imagen: ' . $e->getMessage());
                }
            }

            // Insertar producto en la base de datos
            $stmt = $pdo->prepare("
                INSERT INTO productos 
                (codigo, nombre, descripcion, categoria, precio, stock_actual, stock_minimo, img, activo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            ");

            $resultado = $stmt->execute([
                $codigo,
                $nombre,
                $descripcion,
                $categoria,
                $precio,
                $stock,
                $stockMin,
                $nombreImg
            ]);

            if (!$resultado) {
                throw new Exception('Error al insertar producto en BD');
            }

            $idProducto = (int)$pdo->lastInsertId();

            echo json_encode([
                'ok' => true,
                'id' => $idProducto,
                'imagen' => $nombreImg,
                'mensaje' => 'Producto creado exitosamente'
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'ok' => false,
                'error' => $e->getMessage(),
                'mensaje' => 'Error al crear producto'
            ]);
        }
        break;

    // ==============================================================
    // EDITAR PRODUCTO (Admin)
    // ==============================================================
    case 'editar':
        header('Content-Type: application/json');
        try {
            $id          = (int)($_POST['id'] ?? 0);
            $codigo      = trim($_POST['codigo']      ?? '');
            $nombre      = trim($_POST['nombre']      ?? '');
            $descripcion = trim($_POST['descripcion'] ?? '') ?: null;
            $categoria   = trim($_POST['categoria']   ?? '');
            $precio      = (float)($_POST['precio']   ?? 0);
            $stock       = (int)($_POST['stock_actual']   ?? 0);
            $stockMin    = (int)($_POST['stock_minimo']   ?? 0);

            if (!$id) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'mensaje' => 'ID requerido']);
                exit;
            }

            // Obtener producto actual
            $stmt = $pdo->prepare("SELECT img FROM productos WHERE id = ?");
            $stmt->execute([$id]);
            $producto = $stmt->fetch();
            
            if (!$producto) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'mensaje' => 'Producto no encontrado']);
                exit;
            }

            $nombreImg = $producto['img'];

            // Procesar nueva imagen si existe
            if (isset($_FILES['imagen']) && $_FILES['imagen']['error'] === UPLOAD_ERR_OK) {
                borrarImagenAntigua($nombreImg);
                $nombreImg = guardarImagen($_FILES['imagen']);
            }

            // Actualizar producto
            $stmt = $pdo->prepare("
                UPDATE productos 
                SET codigo=?, nombre=?, descripcion=?, categoria=?, 
                    precio=?, stock_actual=?, stock_minimo=?, img=?
                WHERE id=?
            ");

            $stmt->execute([
                $codigo,
                $nombre,
                $descripcion,
                $categoria,
                $precio,
                $stock,
                $stockMin,
                $nombreImg,
                $id
            ]);

            echo json_encode(['ok' => true, 'mensaje' => 'Producto actualizado']);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error: ' . $e->getMessage()]);
        }
        break;

    // ==============================================================
    // EXPORTAR PRODUCTOS A CSV (Admin)
    // ==============================================================
    case 'exportar_csv':
        try {
            $stmt = $pdo->query("
                SELECT codigo, nombre, descripcion, categoria, precio, 
                       stock_actual, stock_minimo, activo
                FROM productos
                ORDER BY codigo ASC
            ");
            $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Headers para descarga
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="productos_' . date('Y-m-d') . '.csv"');
            header('Pragma: no-cache');
            header('Expires: 0');

            $output = fopen('php://output', 'w');

            // BOM para Excel
            fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

            // Encabezados
            fputcsv($output, [
                'Código',
                'Nombre',
                'Descripción',
                'Categoría',
                'Precio',
                'Stock Actual',
                'Stock Mínimo',
                'Activo'
            ], ',');

            // Datos
            foreach ($productos as $p) {
                fputcsv($output, [
                    $p['codigo'],
                    $p['nombre'],
                    $p['descripcion'] ?? '',
                    $p['categoria'],
                    number_format($p['precio'], 2, '.', ''),
                    $p['stock_actual'],
                    $p['stock_minimo'],
                    $p['activo'] ? 'Sí' : 'No'
                ], ',');
            }

            fclose($output);
            exit;

        } catch (Exception $e) {
            header('Content-Type: application/json');
            http_response_code(500);
            echo json_encode(['error' => 'Error al exportar: ' . $e->getMessage()]);
        }
        break;

    // ==============================================================
    // ELIMINAR PRODUCTO (Admin)
    // ==============================================================
    case 'eliminar':
        header('Content-Type: application/json');
        try {
            $id = (int)($_POST['id'] ?? 0);

            if (!$id) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'mensaje' => 'ID requerido']);
                exit;
            }

            // Obtener imagen antes de eliminar
            $stmt = $pdo->prepare("SELECT img FROM productos WHERE id = ?");
            $stmt->execute([$id]);
            $producto = $stmt->fetch();

            if ($producto) {
                borrarImagenAntigua($producto['img']);
                
                // Marcar como inactivo
                $stmt = $pdo->prepare("UPDATE productos SET activo = 0 WHERE id = ?");
                $stmt->execute([$id]);

                echo json_encode(['ok' => true, 'mensaje' => 'Producto eliminado']);
            } else {
                http_response_code(404);
                echo json_encode(['ok' => false, 'mensaje' => 'Producto no encontrado']);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error: ' . $e->getMessage()]);
        }
        break;

    default:
        header('Content-Type: application/json');
        http_response_code(400);
        echo json_encode(['error' => 'Acción no válida']);
}
?>