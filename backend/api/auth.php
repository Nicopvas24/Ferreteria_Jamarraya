<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
$accion = $data['accion'] ?? '';

// ── LOGIN ──────────────────────────────────────
if ($accion === 'login') {
  $email    = trim($data['email'] ?? '');
  $password = $data['password'] ?? '';

  if (!$email || !$password) {
    echo json_encode(['ok' => false, 'mensaje' => 'Completa todos los campos']);
    exit;
  }

  $stmt = $pdo->prepare('SELECT * FROM usuarios WHERE email = ?');
  $stmt->execute([$email]);
  $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$usuario || !password_verify($password, $usuario['password'])) {
    echo json_encode(['ok' => false, 'mensaje' => 'Correo o contraseña incorrectos']);
    exit;
  }

  // Guardar en sesión
  $_SESSION['id_usuario']  = $usuario['id'];
  $_SESSION['usuario_nombre'] = $usuario['nombre'];
  $_SESSION['usuario_rol'] = $usuario['rol'];

  echo json_encode([
    'ok'     => true,
    'rol'    => $usuario['rol'],
    'nombre' => $usuario['nombre']
  ]);
  exit;
}

// ── LOGOUT ─────────────────────────────────────
if ($accion === 'logout') {
  session_destroy();
  echo json_encode(['ok' => true]);
  exit;
}

// ── VERIFICAR SESIÓN ───────────────────────────
if ($accion === 'verificar') {
  if (isset($_SESSION['id_usuario'])) {
    echo json_encode([
      'ok'     => true,
      'nombre' => $_SESSION['usuario_nombre'],
      'rol'    => $_SESSION['usuario_rol']
    ]);
  } else {
    echo json_encode(['ok' => false]);
  }
  exit;
}

echo json_encode(['error' => 'Acción no válida']);