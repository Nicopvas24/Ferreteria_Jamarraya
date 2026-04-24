<?php
// ============================================================
//  usuarios.php — Login, logout y verificación de sesión
// ============================================================

require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/logger.php';

session_start();

$accion = $_POST['accion'] ?? $_GET['accion'] ?? '';

// ------------------------------------------------------------
//  Responde siempre en JSON
// ------------------------------------------------------------
header('Content-Type: application/json');

$pdo = conectar();
//audit_log_request($pdo, 'backend/usuarios.php', $accion ?: 'sin_accion');

switch ($accion) {

    // ----------------------------------------------------------
    //  LOGIN
    // ----------------------------------------------------------
    case 'login':
        $email      = trim($_POST['email'] ?? '');
        $contrasena = $_POST['contrasena'] ?? '';

        if (!$email || !$contrasena) {
            audit_log($pdo, 'LOGIN_FALLIDO', 'usuarios', null, ['motivo' => 'campos_incompletos', 'email' => $email]);
            echo json_encode(['ok' => false, 'mensaje' => 'Completa todos los campos.']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT id, nombre, email, contrasena_hash, rol
                               FROM usuarios
                               WHERE email = ? AND activo = 1
                               LIMIT 1");
        $stmt->execute([$email]);
        $usuario = $stmt->fetch();

        if (!$usuario || !password_verify($contrasena, $usuario['contrasena_hash'])) {
            audit_log($pdo, 'LOGIN_FALLIDO', 'usuarios', null, ['motivo' => 'credenciales_invalidas', 'email' => $email]);
            echo json_encode(['ok' => false, 'mensaje' => 'Correo o contraseña incorrectos.']);
            exit;
        }

        // Guardar sesión
        $_SESSION['id_usuario'] = $usuario['id'];
        $_SESSION['nombre']     = $usuario['nombre'];
        $_SESSION['rol']        = $usuario['rol'];

        audit_log($pdo, 'LOGIN_EXITOSO', 'usuarios', (int)$usuario['id'], ['email' => $email, 'rol' => $usuario['rol']], (int)$usuario['id']);

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
            audit_log($pdo, 'USUARIOS_LISTAR_DENEGADO', 'usuarios', null, ['motivo' => 'sin_permisos']);
            echo json_encode(['error' => 'Acceso denegado']);
            exit;
        }

        
        $stmt = $pdo->query("SELECT id, nombre, email, rol, activo,
                                    DATE_FORMAT(fecha_creacion, '%Y-%m-%d') AS fecha_creacion
                             FROM usuarios
                             ORDER BY id DESC");
        audit_log($pdo, 'USUARIOS_LISTAR', 'usuarios', null, ['total' => $stmt->rowCount()], (int)$_SESSION['id_usuario']);
        echo json_encode($stmt->fetchAll());
        break;

    // ----------------------------------------------------------
    //  CREAR usuario (solo administrador)
    // ----------------------------------------------------------
    case 'crear':
        if (!isset($_SESSION['id_usuario']) || $_SESSION['rol'] !== 'admin') {
            http_response_code(403);
            audit_log($pdo, 'USUARIO_CREAR_DENEGADO', 'usuarios', null, ['motivo' => 'sin_permisos']);
            echo json_encode(['ok' => false, 'mensaje' => 'Acceso denegado']);
            exit;
        }

        $nombre     = trim($_POST['nombre'] ?? '');
        $email      = trim($_POST['email'] ?? '');
        $contrasena = $_POST['contrasena'] ?? '';
        $rol        = $_POST['rol'] ?? 'cliente';

        // Validar
        if (!$nombre || !$email || !$contrasena) {
            audit_log($pdo, 'USUARIO_CREAR_FALLIDO', 'usuarios', null, ['motivo' => 'campos_incompletos', 'email' => $email], (int)$_SESSION['id_usuario']);
            echo json_encode(['ok' => false, 'mensaje' => 'Completa todos los campos.']);
            exit;
        }

        if (strlen($contrasena) < 6) {
            audit_log($pdo, 'USUARIO_CREAR_FALLIDO', 'usuarios', null, ['motivo' => 'password_corta', 'email' => $email], (int)$_SESSION['id_usuario']);
            echo json_encode(['ok' => false, 'mensaje' => 'La contraseña debe tener al menos 6 caracteres.']);
            exit;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            audit_log($pdo, 'USUARIO_CREAR_FALLIDO', 'usuarios', null, ['motivo' => 'email_invalido', 'email' => $email], (int)$_SESSION['id_usuario']);
            echo json_encode(['ok' => false, 'mensaje' => 'Email inválido.']);
            exit;
        }

        // Verificar si email existe
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            audit_log($pdo, 'USUARIO_CREAR_FALLIDO', 'usuarios', null, ['motivo' => 'email_duplicado', 'email' => $email], (int)$_SESSION['id_usuario']);
            echo json_encode(['ok' => false, 'mensaje' => 'El email ya está registrado.']);
            exit;
        }

        // Crear usuario
        try {
            $hash = password_hash($contrasena, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, email, contrasena_hash, rol, activo, fecha_creacion)
                                   VALUES (?, ?, ?, ?, 1, NOW())");
            $stmt->execute([$nombre, $email, $hash, $rol]);
            audit_log($pdo, 'USUARIO_CREADO', 'usuarios', (int)$pdo->lastInsertId(), ['email' => $email, 'rol' => $rol], (int)$_SESSION['id_usuario']);
            
            echo json_encode(['ok' => true, 'mensaje' => 'Usuario creado exitosamente']);
        } catch (Exception $e) {
            audit_log($pdo, 'USUARIO_CREAR_ERROR', 'usuarios', null, ['error' => $e->getMessage(), 'email' => $email], (int)$_SESSION['id_usuario']);
            echo json_encode(['ok' => false, 'mensaje' => 'Error al crear usuario: ' . $e->getMessage()]);
        }
        break;

    // ----------------------------------------------------------
    //  EDITAR usuario (solo admin)
    // ----------------------------------------------------------
    case 'editar':
        if (!isset($_SESSION['id_usuario']) || $_SESSION['rol'] !== 'admin') {
            http_response_code(403);
            audit_log($pdo, 'USUARIO_EDITAR_DENEGADO', 'usuarios', null, ['motivo' => 'sin_permisos']);
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
            audit_log($pdo, 'USUARIO_EDITAR_FALLIDO', 'usuarios', null, ['motivo' => 'id_requerido'], (int)$_SESSION['id_usuario']);
            echo json_encode(['ok' => false, 'mensaje' => 'ID de usuario requerido']);
            exit;
        }

        if (!$nombre || !$email) {
            audit_log($pdo, 'USUARIO_EDITAR_FALLIDO', 'usuarios', $id, ['motivo' => 'campos_requeridos'], (int)$_SESSION['id_usuario']);
            echo json_encode(['ok' => false, 'mensaje' => 'Nombre y email son requeridos']);
            exit;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            audit_log($pdo, 'USUARIO_EDITAR_FALLIDO', 'usuarios', $id, ['motivo' => 'email_invalido', 'email' => $email], (int)$_SESSION['id_usuario']);
            echo json_encode(['ok' => false, 'mensaje' => 'Email inválido']);
            exit;
        }

        // Verificar si email existe (pero no del mismo usuario)
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ? AND id != ? LIMIT 1");
        $stmt->execute([$email, $id]);
        if ($stmt->fetch()) {
            audit_log($pdo, 'USUARIO_EDITAR_FALLIDO', 'usuarios', $id, ['motivo' => 'email_duplicado', 'email' => $email], (int)$_SESSION['id_usuario']);
            echo json_encode(['ok' => false, 'mensaje' => 'El email ya está registrado por otro usuario']);
            exit;
        }

        // Actualizar usuario
        try {
            $stmt = $pdo->prepare("UPDATE usuarios 
                                   SET nombre = ?, email = ?, rol = ?, activo = ?
                                   WHERE id = ?");
            $stmt->execute([$nombre, $email, $rol, $activo, $id]);
            audit_log($pdo, 'USUARIO_EDITADO', 'usuarios', $id, ['email' => $email, 'rol' => $rol, 'activo' => $activo], (int)$_SESSION['id_usuario']);
            
            echo json_encode(['ok' => true, 'mensaje' => 'Usuario actualizado exitosamente']);
        } catch (Exception $e) {
            audit_log($pdo, 'USUARIO_EDITAR_ERROR', 'usuarios', $id, ['error' => $e->getMessage()], (int)$_SESSION['id_usuario']);
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
            audit_log($pdo, 'REGISTRO_FALLIDO', 'usuarios', null, ['motivo' => 'campos_incompletos', 'email' => $email]);
            echo json_encode(['ok' => false, 'mensaje' => 'Completa todos los campos.']);
            exit;
        }

        // Validar email formato
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            audit_log($pdo, 'REGISTRO_FALLIDO', 'usuarios', null, ['motivo' => 'email_invalido', 'email' => $email]);
            echo json_encode(['ok' => false, 'mensaje' => 'El email no es válido.']);
            exit;
        }

        // Validar contraseña mínimo 6 caracteres
        if (strlen($contrasena) < 6) {
            audit_log($pdo, 'REGISTRO_FALLIDO', 'usuarios', null, ['motivo' => 'password_corta', 'email' => $email]);
            echo json_encode(['ok' => false, 'mensaje' => 'La contraseña debe tener mínimo 6 caracteres.']);
            exit;
        }

        // Verificar si el email ya existe en usuarios
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            audit_log($pdo, 'REGISTRO_FALLIDO', 'usuarios', null, ['motivo' => 'email_duplicado', 'email' => $email]);
            echo json_encode(['ok' => false, 'mensaje' => 'Este email ya está registrado.']);
            exit;
        }

        // Verificar si la identificación ya existe en clientes
        $stmt = $pdo->prepare("SELECT id FROM clientes WHERE identificacion = ? LIMIT 1");
        $stmt->execute([$identificacion]);
        if ($stmt->fetch()) {
            audit_log($pdo, 'REGISTRO_FALLIDO', 'clientes', null, ['motivo' => 'identificacion_duplicada', 'identificacion' => $identificacion, 'email' => $email]);
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

            audit_log($pdo, 'REGISTRO_EXITOSO', 'usuarios', (int)$usuarioId, ['cliente_id' => (int)$clienteId, 'email' => $email], (int)$usuarioId);

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
            audit_log($pdo, 'REGISTRO_ERROR', 'usuarios', null, ['error' => $e->getMessage(), 'email' => $email]);
            echo json_encode(['ok' => false, 'mensaje' => 'Error al registrar: ' . $e->getMessage()]);
        }
        break;

    // ----------------------------------------------------------
    //  LOGOUT
    // ----------------------------------------------------------
    case 'logout':
        $idUsuario = isset($_SESSION['id_usuario']) ? (int)$_SESSION['id_usuario'] : null;
        audit_log($pdo, 'LOGOUT', 'usuarios', $idUsuario, ['mensaje' => 'Cierre de sesion'], $idUsuario);
        session_destroy();
        echo json_encode(['ok' => true]);
        break;

    // ----------------------------------------------------------
    //  VERIFICAR sesión activa (para proteger páginas)
    // ----------------------------------------------------------
    case 'verificar':
        if (isset($_SESSION['id_usuario'])) {
            $id_cliente = null;
            if ($_SESSION['rol'] === 'cliente') {
                // 1º Buscar por id_usuario (vínculo directo)
                $stmt = $pdo->prepare("SELECT id FROM clientes WHERE id_usuario = ? LIMIT 1");
                $stmt->execute([$_SESSION['id_usuario']]);
                if ($row = $stmt->fetch()) {
                    $id_cliente = $row['id'];
                }

                // 2º Fallback: buscar por nombre del usuario y vincular
                if (!$id_cliente) {
                    $nombre_usuario = $_SESSION['nombre'] ?? '';
                    $stmtN = $pdo->prepare(
                        "SELECT id FROM clientes WHERE nombre = ? AND (id_usuario IS NULL OR id_usuario = 0) LIMIT 1"
                    );
                    $stmtN->execute([$nombre_usuario]);
                    if ($rowN = $stmtN->fetch()) {
                        $id_cliente = $rowN['id'];
                        // Vincular automáticamente para futuras consultas
                        $pdo->prepare("UPDATE clientes SET id_usuario = ? WHERE id = ?")
                            ->execute([$_SESSION['id_usuario'], $id_cliente]);
                    }
                }
            }
            audit_log($pdo, 'SESION_VERIFICADA', 'usuarios', (int)$_SESSION['id_usuario'], ['rol' => $_SESSION['rol'], 'id_cliente' => $id_cliente], (int)$_SESSION['id_usuario']);
            echo json_encode([
                'ok'         => true,
                'nombre'     => $_SESSION['nombre'],
                'rol'        => $_SESSION['rol'],
                'id_usuario' => $_SESSION['id_usuario'],
                'id_cliente' => $id_cliente
            ]);
        } else {
            audit_log($pdo, 'SESION_NO_VALIDA', 'usuarios', null, ['motivo' => 'sin_sesion']);
            echo json_encode(['ok' => false]);
        }
        break;

    default:
        http_response_code(400);
        audit_log($pdo, 'ACCION_NO_VALIDA', 'api', null, ['endpoint' => 'backend/usuarios.php', 'accion' => $accion]);
        echo json_encode(['error' => 'Acción no válida.']);
}
