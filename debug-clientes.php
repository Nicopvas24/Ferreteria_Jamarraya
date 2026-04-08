<?php
// debug-clientes.php - Verifica si hay clientes en la BD

require_once __DIR__ . '/backend/conexion.php';

session_start();
$_SESSION['id_usuario'] = 1; // Simular sesión

try {
    $pdo = conectar();
    
    // Verificar si la tabla existe
    $stmt = $pdo->query("SHOW TABLES LIKE 'clientes'");
    $existe = $stmt->rowCount() > 0;
    
    $debug = [
        'tabla_existe' => $existe,
        'clientes' => [],
        'error' => null
    ];
    
    if ($existe) {
        // Contar clientes
        $stmt = $pdo->query("SELECT COUNT(*) as total FROM clientes");
        $result = $stmt->fetch();
        $debug['total_clientes'] = $result['total'];
        
        // Listar primeros 5
        $stmt = $pdo->query("SELECT * FROM clientes LIMIT 5");
        $debug['clientes'] = $stmt->fetchAll();
    }
    
    header('Content-Type: application/json');
    echo json_encode($debug, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
}
