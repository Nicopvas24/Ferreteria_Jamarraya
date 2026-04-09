<?php
// ============================================================
//  usuarios.php — Login, logout y verificación de sesión
// ============================================================

require_once __DIR__ . '/conexion.php';

session_start();

$accion = $_POST['accion'] ?? $_GET['accion'] ?? '';

// ------------------------------------------------------------
//  Responde siempre en JSON
// ------------------------------------------------------------
header('Content-Type: application/json');

switch ($accion) {

    // ----------------------------------------------------------
    //  LOGIN
    // ----------------------------------------------------------
    case 'login':
        $email      = trim($_POST['email'] ?? '');
        $contrasena = $_POST['contrasena'] ?? '';

        if (!$email || !$contrasena) {
            echo json_encode(['ok' => false, 'mensaje' => 'Completa todos los campos.']);
            exit;
        }

        $pdo  = conectar();
        $stmt = $pdo->prepare("SELECT id, nombre, email, contrasena_hash, rol
                               FROM usuarios
                               WHERE email = ? AND activo = 1
                               LIMIT 1");
        $stmt->execute([$email]);
        $usuario = $stmt->fetch();

        if (!$usuario || !password_verify($contrasena, $usuario['contrasena_hash'])) {
            echo json_encode(['ok' => false, 'mensaje' => 'Correo o contraseña incorrectos.']);
            exit;
        }

        // Guardar sesión
        $_SESSION['id_usuario'] = $usuario['id'];
        $_SESSION['nombre']     = $usuario['nombre'];
        $_SESSION['rol']        = $usuario['rol'];

        echo json_encode([
            'ok'     => true,
            'nombre' => $usuario['nombre'],
            'rol'    => $usuario['rol'],
        ]);
        break;





   // ----------------------------------------------------------
    //  LISTAR usuarios (solo administrador)
    //  Agregar este case dentro del switch de usuarios.php
    // ----------------------------------------------------------

    case 'listar':
        if (!isset($_SESSION['id_usuario']) || $_SESSION['rol'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Acceso denegado']);
            exit;
        }

        
        $pdo  = conectar();
        $stmt = $pdo->query("SELECT id, nombre, email, rol, activo,
                                    DATE_FORMAT(fecha_creacion, '%Y-%m-%d') AS fecha_creacion
                             FROM usuarios
                             ORDER BY id DESC");
        echo json_encode($stmt->fetchAll());
        break;

    // ----------------------------------------------------------
    //  CREAR usuario (solo administrador)
    // ----------------------------------------------------------
    case 'crear':
        if (!isset($_SESSION['id_usuario']) || $_SESSION['rol'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['ok' => false, 'mensaje' => 'Acceso denegado']);
            exit;
        }

        $nombre     = trim($_POST['nombre'] ?? '');
        $email      = trim($_POST['email'] ?? '');
        $contrasena = $_POST['contrasena'] ?? '';
        $rol        = $_POST['rol'] ?? 'cliente';

        // Validar
        if (!$nombre || !$email || !$contrasena) {
            echo json_encode(['ok' => false, 'mensaje' => 'Completa todos los campos.']);
            exit;
        }

        if (strlen($contrasena) < 6) {
            echo json_encode(['ok' => false, 'mensaje' => 'La contraseña debe tener al menos 6 caracteres.']);
            exit;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['ok' => false, 'mensaje' => 'Email inválido.']);
            exit;
        }

        // Verificar si email existe
        $pdo = conectar();
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            echo json_encode(['ok' => false, 'mensaje' => 'El email ya está registrado.']);
            exit;
        }

        // Crear usuario
        try {
            $hash = password_hash($contrasena, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, email, contrasena_hash, rol, activo, fecha_creacion)
                                   VALUES (?, ?, ?, ?, 1, NOW())");
            $stmt->execute([$nombre, $email, $hash, $rol]);
            
            echo json_encode(['ok' => true, 'mensaje' => 'Usuario creado exitosamente']);
        } catch (Exception $e) {
            echo json_encode(['ok' => false, 'mensaje' => 'Error al crear usuario: ' . $e->getMessage()]);
        }
        break;

    // ----------------------------------------------------------
    //  EDITAR usuario (solo admin)
    // ----------------------------------------------------------
    case 'editar':
        if (!isset($_SESSION['id_usuario']) || $_SESSION['rol'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['ok' => false, 'mensaje' => 'Acceso denegado']);
            exit;
        }

        $id       = (int)($_POST['id'] ?? 0);
        $nombre   = trim($_POST['nombre'] ?? '');
        $email    = trim($_POST['email'] ?? '');
        $rol      = $_POST['rol'] ?? '';
        $activo   = (int)($_POST['activo'] ?? 1);

        // Validar
        if (!$id) {
            echo json_encode(['ok' => false, 'mensaje' => 'ID de usuario requerido']);
            exit;
        }

        if (!$nombre || !$email) {
            echo json_encode(['ok' => false, 'mensaje' => 'Nombre y email son requeridos']);
            exit;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['ok' => false, 'mensaje' => 'Email inválido']);
            exit;
        }

        // Verificar si email existe (pero no del mismo usuario)
        $pdo = conectar();
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ? AND id != ? LIMIT 1");
        $stmt->execute([$email, $id]);
        if ($stmt->fetch()) {
            echo json_encode(['ok' => false, 'mensaje' => 'El email ya está registrado por otro usuario']);
            exit;
        }

        // Actualizar usuario
        try {
            $stmt = $pdo->prepare("UPDATE usuarios 
                                   SET nombre = ?, email = ?, rol = ?, activo = ?
                                   WHERE id = ?");
            $stmt->execute([$nombre, $email, $rol, $activo, $id]);
            
            echo json_encode(['ok' => true, 'mensaje' => 'Usuario actualizado exitosamente']);
        } catch (Exception $e) {
            echo json_encode(['ok' => false, 'mensaje' => 'Error al actualizar usuario: ' . $e->getMessage()]);
        }
        break;

    // ----------------------------------------------------------
    //  REGISTRAR nuevo usuario (público — sin autenticación requerida)
    // ----------------------------------------------------------
    case 'registrar':
        $nombre     = trim($_POST['nombre'] ?? '');
        $identificacion = trim($_POST['identificacion'] ?? '');
        $email      = trim($_POST['email'] ?? '');
        $contrasena = $_POST['contrasena'] ?? '';

        // Validar campos
        if (!$nombre || !$identificacion || !$email || !$contrasena) {
            echo json_encode(['ok' => false, 'mensaje' => 'Completa todos los campos.']);
            exit;
        }

        // Validar email formato
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['ok' => false, 'mensaje' => 'El email no es válido.']);
            exit;
        }

        // Validar contraseña mínimo 6 caracteres
        if (strlen($contrasena) < 6) {
            echo json_encode(['ok' => false, 'mensaje' => 'La contraseña debe tener mínimo 6 caracteres.']);
            exit;
        }

        $pdo = conectar();

        // Verificar si el email ya existe en usuarios
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            echo json_encode(['ok' => false, 'mensaje' => 'Este email ya está registrado.']);
            exit;
        }

        // Verificar si la identificación ya existe en clientes
        $stmt = $pdo->prepare("SELECT id FROM clientes WHERE identificacion = ? LIMIT 1");
        $stmt->execute([$identificacion]);
        if ($stmt->fetch()) {
            echo json_encode(['ok' => false, 'mensaje' => 'Esta identificación ya está registrada.']);
            exit;
        }

        // Hash de contraseña
        $hash = password_hash($contrasena, PASSWORD_BCRYPT);

        // Iniciar transacción para atomicidad
        try {
            $pdo->beginTransaction();

            // 1. Insertar en usuarios
            $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, email, contrasena_hash, rol, activo)
                                   VALUES (?, ?, ?, ?, 1)");
            $stmt->execute([$nombre, $email, $hash, 'cliente']);
            $usuarioId = $pdo->lastInsertId();

            // 2. Insertar en clientes vinculado con el usuario
            $stmt = $pdo->prepare("INSERT INTO clientes (id_usuario, nombre, identificacion, email)
                                   VALUES (?, ?, ?, ?)");
            $stmt->execute([$usuarioId, $nombre, $identificacion, $email]);
            $clienteId = $pdo->lastInsertId();

            $pdo->commit();

            // Guardar sesión automáticamente
            $_SESSION['id_usuario'] = $usuarioId;
            $_SESSION['nombre']     = $nombre;
            $_SESSION['rol']        = 'cliente';

            echo json_encode([
                'ok'         => true,
                'nombre'     => $nombre,
                'rol'        => 'cliente',
                'mensaje'    => 'Registro exitoso! Bienvenido a Ferretería Jamarraya',
                'usuarioId'  => $usuarioId,
                'clienteId'  => $clienteId
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['ok' => false, 'mensaje' => 'Error al registrar: ' . $e->getMessage()]);
        }
        break;

    // ----------------------------------------------------------
    //  LOGOUT
    // ----------------------------------------------------------
    case 'logout':
        session_destroy();
        echo json_encode(['ok' => true]);
        break;

    // ----------------------------------------------------------
    //  VERIFICAR sesión activa (para proteger páginas)
    // ----------------------------------------------------------
    case 'verificar':
        if (isset($_SESSION['id_usuario'])) {
            echo json_encode([
                'ok'     => true,
                'nombre' => $_SESSION['nombre'],
                'rol'    => $_SESSION['rol'],
            ]);
        } else {
            echo json_encode(['ok' => false]);
        }
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Acción no válida.']);
}
