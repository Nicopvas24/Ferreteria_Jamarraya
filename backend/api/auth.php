<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../conexion.php';
require_once '../logger.php';

$pdo  = conectar();
$data = json_decode(file_get_contents('php://input'), true);
$accion = $data['accion'] ?? '';

// audit_log_request($pdo, 'api/auth.php', $accion ?: 'sin_accion');

// ── LOGIN ──────────────────────────────────────
if ($accion === 'login') {
  $email    = trim($data['email'] ?? '');
  $password = $data['password'] ?? '';

  if (!$email || !$password) {
    audit_log($pdo, 'LOGIN_FALLIDO', 'usuarios', null, ['motivo' => 'campos_incompletos', 'email' => $email]);
    echo json_encode(['ok' => false, 'mensaje' => 'Completa todos los campos']);
    exit;
  }

  $stmt = $pdo->prepare('SELECT * FROM usuarios WHERE email = ?');
  $stmt->execute([$email]);
  $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$usuario || !password_verify($password, $usuario['password'])) {
    audit_log($pdo, 'LOGIN_FALLIDO', 'usuarios', null, ['motivo' => 'credenciales_invalidas', 'email' => $email]);
    echo json_encode(['ok' => false, 'mensaje' => 'Correo o contraseña incorrectos']);
    exit;
  }

  // Guardar en sesión
  $_SESSION['id_usuario']  = $usuario['id'];
  $_SESSION['usuario_nombre'] = $usuario['nombre'];
  $_SESSION['usuario_rol'] = $usuario['rol'];

  audit_log($pdo, 'LOGIN_EXITOSO', 'usuarios', (int)$usuario['id'], ['email' => $email, 'rol' => $usuario['rol']], (int)$usuario['id']);

  echo json_encode([
    'ok'     => true,
    'rol'    => $usuario['rol'],
    'nombre' => $usuario['nombre']
  ]);
  exit;
}

// ── LOGOUT ─────────────────────────────────────
if ($accion === 'logout') {
  $idUsuario = isset($_SESSION['id_usuario']) ? (int)$_SESSION['id_usuario'] : null;
  audit_log($pdo, 'LOGOUT', 'usuarios', $idUsuario, ['mensaje' => 'Cierre de sesion'], $idUsuario);
  session_destroy();
  echo json_encode(['ok' => true]);
  exit;
}

// ── VERIFICAR SESIÓN ───────────────────────────
if ($accion === 'verificar') {
  if (isset($_SESSION['id_usuario'])) {
    audit_log($pdo, 'SESION_VERIFICADA', 'usuarios', (int)$_SESSION['id_usuario'], ['rol' => $_SESSION['usuario_rol'] ?? null], (int)$_SESSION['id_usuario']);
    echo json_encode([
      'ok'     => true,
      'nombre' => $_SESSION['usuario_nombre'],
      'rol'    => $_SESSION['usuario_rol']
    ]);
  } else {
    audit_log($pdo, 'SESION_NO_VALIDA', 'usuarios', null, ['motivo' => 'sin_sesion']);
    echo json_encode(['ok' => false]);
  }
  exit;
}

audit_log($pdo, 'ACCION_NO_VALIDA', 'api', null, ['accion' => $accion, 'endpoint' => 'api/auth.php']);
echo json_encode(['error' => 'Acción no válida']);