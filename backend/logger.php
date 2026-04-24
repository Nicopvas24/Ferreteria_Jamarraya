<?php
// ============================================================
//  logger.php - Auditoria centralizada hacia tabla logs
// ============================================================

if (!function_exists('audit_get_client_ip')) {
    function audit_get_client_ip(): ?string {
        $keys = ['HTTP_X_FORWARDED_FOR', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];

        foreach ($keys as $key) {
            if (empty($_SERVER[$key])) {
                continue;
            }

            $raw = (string)$_SERVER[$key];
            if ($key === 'HTTP_X_FORWARDED_FOR') {
                $parts = explode(',', $raw);
                $raw = trim($parts[0]);
            }

            if (filter_var($raw, FILTER_VALIDATE_IP)) {
                return $raw;
            }
        }

        return null;
    }
}

if (!function_exists('audit_stringify_detail')) {
    function audit_stringify_detail($detalle): ?string {
        if ($detalle === null) {
            return null;
        }

        if (is_string($detalle)) {
            return $detalle;
        }

        if (!is_array($detalle)) {
            return (string)$detalle;
        }

        $json = json_encode($detalle, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            return 'No fue posible serializar el detalle';
        }

        // Evita payloads grandes en detalle que ralentizan la insercion.
        if (strlen($json) > 4000) {
            $json = substr($json, 0, 4000) . '...(truncado)';
        }

        return $json;
    }
}

if (!function_exists('audit_is_read_action')) {
    function audit_is_read_action(string $accion): bool {
        return (bool)preg_match('/(LISTAR|DETALLE|OBTENER|REPORTE|DASHBOARD|MIS_COMPRAS|SESION_VERIFICADA|EQUIPOS|CONSULTA)/i', $accion);
    }
}

if (!function_exists('audit_is_critical_action')) {
    function audit_is_critical_action(string $accion): bool {
        return (bool)preg_match('/(ERROR|FALLIDO|DENEGADO|NO_VALIDA|LOGIN|LOGOUT|REGISTR|CREAD|EDIT|ELIM|DESACT|ACTUALIZ|DEVUELTO|CAMBIO|RCP)/i', $accion);
    }
}

if (!function_exists('audit_should_log')) {
    function audit_should_log(string $accion): bool {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'CLI');
        $verboseReads = getenv('AUDIT_LOG_READS') === '1';

        // REQUEST en GET genera demasiado volumen; se conserva para metodos de cambio.
        if ($accion === 'REQUEST' && $method === 'GET' && !$verboseReads) {
            return false;
        }

        // Mantener siempre seguridad/escrituras/errores.
        if (audit_is_critical_action($accion)) {
            return true;
        }

        // Las lecturas exitosas se pueden silenciar en modo normal para mejorar rendimiento.
        if ($method === 'GET' && audit_is_read_action($accion) && !$verboseReads) {
            return false;
        }

        return true;
    }
}

if (!function_exists('audit_log')) {
    function audit_log(PDO $pdo, string $accion, ?string $tablaAfectada = null, ?int $idRegistro = null, $detalle = null, ?int $idUsuario = null): void {
        try {
            if (!audit_should_log($accion)) {
                return;
            }

            if ($idUsuario === null && isset($_SESSION['id_usuario'])) {
                $idUsuario = (int)$_SESSION['id_usuario'];
            }

            $ip = audit_get_client_ip();
            $detalleText = audit_stringify_detail($detalle);

            static $stmtByConn = [];
            $connId = spl_object_id($pdo);
            if (!isset($stmtByConn[$connId])) {
                $stmtByConn[$connId] = $pdo->prepare(
                    'INSERT INTO logs (id_usuario, accion, tabla_afectada, id_registro, detalle, ip_origen)
                     VALUES (?, ?, ?, ?, ?, ?)'
                );
            }

            $stmt = $stmtByConn[$connId];
            $stmt->execute([
                $idUsuario,
                $accion,
                $tablaAfectada,
                $idRegistro,
                $detalleText,
                $ip,
            ]);
        } catch (Throwable $e) {
            error_log('AUDIT_LOG_ERROR: ' . $e->getMessage());
        }
    }
}

if (!function_exists('audit_log_request')) {
    function audit_log_request(PDO $pdo, string $endpoint, string $operacion, array $extra = []): void {
        $detalle = array_merge([
            'endpoint' => $endpoint,
            'operacion' => $operacion,
            'method' => $_SERVER['REQUEST_METHOD'] ?? 'CLI',
            'query' => $_GET,
        ], $extra);

        audit_log($pdo, 'REQUEST', 'api', null, $detalle);
    }
}
