<?php
require_once __DIR__ . '/backend/conexion.php';

$pdo = conectar();

echo "=== Clientes con Alquileres ===\n";
$stmt = $pdo->query('SELECT DISTINCT id_cliente, COUNT(*) as total FROM alquileres GROUP BY id_cliente ORDER BY id_cliente');
foreach ($stmt->fetchAll() as $row) {
    echo "Cliente " . $row['id_cliente'] . ": " . $row['total'] . " alquileres\n";
}

echo "\n=== Todos los Alquileres ===\n";
$stmt2 = $pdo->query('SELECT id, id_cliente, id_maquinaria, fecha_inicio, estado FROM alquileres ORDER BY id_cliente');
foreach ($stmt2->fetchAll() as $row) {
    echo "ID: " . $row['id'] . ", Cliente: " . $row['id_cliente'] . ", Maquinaria: " . $row['id_maquinaria'] . ", Fecha: " . $row['fecha_inicio'] . ", Estado: " . $row['estado'] . "\n";
}
