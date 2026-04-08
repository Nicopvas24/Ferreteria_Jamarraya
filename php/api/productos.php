<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require '../conexion.php';

$pdo = conectar(); 

$cat = $_GET['categoria'] ?? null;

try {
    if ($cat && $cat !== 'todos') {
        $stmt = $pdo->prepare("
            SELECT id, codigo, nombre, descripcion, categoria,
                   precio, stock_actual, activo, img
            FROM productos
            WHERE categoria = ? AND activo = 1
        ");
        $stmt->execute([$cat]);
    } else {
        $stmt = $pdo->query("
            SELECT id, codigo, nombre, descripcion, categoria,
                   precio, stock_actual, activo, img
            FROM productos
            WHERE activo = 1
        ");
    }

    $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($productos as &$p) {
        $p['id']          = (int)$p['id'];
        $p['precio']      = (float)$p['precio'];
        $p['stock_actual']= (int)$p['stock_actual'];
        $p['activo']      = (bool)$p['activo'];
    }

    echo json_encode($productos);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al consultar productos']);
}
?>