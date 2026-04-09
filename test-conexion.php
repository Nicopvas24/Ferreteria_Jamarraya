<?php
// TEST DE CONEXIÓN A BASE DE DATOS
header('Content-Type: application/json');

require_once __DIR__ . '/backend/conexion.php';

try {
    $pdo = conectar();
    
    // Verificar que la conexión funciona
    $result = $pdo->query("SELECT 1")->fetch();
    
    if ($result) {
        echo json_encode([
            'ok' => true,
            'mensaje' => '✓ Conexión exitosa a la base de datos',
            'bd' => 'ferreteria_jamarraya',
            'host' => 'localhost'
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage(),
        'mensaje' => '❌ Error de conexión'
    ]);
}
?>
