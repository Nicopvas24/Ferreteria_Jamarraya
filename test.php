<?php
require_once __DIR__ . '/php/conexion.php';

$pdo  = conectar();
$stmt = $pdo->prepare("SELECT contrasena_hash FROM usuarios WHERE email = 'admin@jamarraya.com'");
$stmt->execute();
$fila = $stmt->fetch();

echo "Hash en BD: " . $fila['contrasena_hash'] . "<br>";
echo "Verificación: ";
echo password_verify('admin1234', $fila['contrasena_hash']) ? '✅ CORRECTO' : '❌ INCORRECTO';