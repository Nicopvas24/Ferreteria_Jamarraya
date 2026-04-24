<?php
// ============================================================
//  backend/api/recuperar-contrasena.php
//  Maneja el flujo de recuperación de contraseña
//  - Identificación de usuario (cliente vs empleado/admin)
//  - Generación ficticia de códigos
//  - Validación y cambio de contraseña
// ============================================================

// Iniciar sesión ANTES de cualquier header
session_start();

require_once __DIR__ . '/../conexion.php';
require_once __DIR__ . '/../logger.php';

header('Content-Type: application/json');

$accion = $_POST['accion'] ?? '';
$pdoLog = conectar();
audit_log_request($pdoLog, 'api/recuperar-contrasena.php', $accion ?: 'sin_accion');

// ── PASO 1: Solicitar código ───────────────────────────────
if ($accion === 'solicitar_codigo') {
    $email = trim($_POST['email'] ?? '');

    if (!$email) {
        http_response_code(400);
        audit_log($pdoLog, 'RCP_SOLICITAR_FALLIDO', 'usuarios', null, ['motivo' => 'email_requerido']);
        echo json_encode(['ok' => false, 'mensaje' => 'Email requerido']);
        exit;
    }

    try {
        $pdo = conectar();
        
        // Buscar usuario
        $stmt = $pdo->prepare("SELECT id, nombre, email, rol, fecha_creacion FROM usuarios WHERE email = ? AND activo = 1");
        $stmt->execute([$email]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$usuario) {
            // Por seguridad, no indicar si el email existe o no
            http_response_code(400);
            audit_log($pdoLog, 'RCP_SOLICITAR_FALLIDO', 'usuarios', null, ['motivo' => 'email_no_encontrado', 'email' => $email]);
            echo json_encode(['ok' => false, 'mensaje' => 'No se encontró cuenta asociada a este correo']);
            exit;
        }

        // ── Generar código/token ficticio según rol ──────────────
        $codigo = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT); // 6 dígitos para clientes
        
        // Variable para almacenar qué se mostrará como "código ficticio"
        $codigo_mostrar = '';
        $respuesta_correcta = '';

        // Si es admin/empleado, agregar sistema de 2FA
        if ($usuario['rol'] !== 'cliente') {
            // ── Preguntas de seguridad más robustas ──────────────────
            $preguntas_admin = [
                // [
                //     'pregunta' => '¿En qué trimestre fue tu última capacitación de seguridad informatica?',
                //     'respuestas_validas' => ['Q1', 'Q2', 'Q3', 'Q4', 'trimestre 1', 'trimestre 2', 'trimestre 3', 'trimestre 4', '1', '2', '3', '4']
                // ],
                // [
                //     'pregunta' => '¿Cuál es el nivel de acceso mínimo requerido para cambiar contraseña de otros usuarios?',
                //     'respuestas_validas' => ['admin', 'administrador', 'alto', 'nivel 3', 'level 3', 'l3']
                // ],
                // [
                //     'pregunta' => '¿Cuántos caracteres debe tener mínimo una contraseña corporativa?',
                //     'respuestas_validas' => ['8', 'ocho', '8 caracteres', 'ocho caracteres']
                // ],
                // [
                //     'pregunta' => '¿En qué mes se renovó el certificado SSL del servidor?',
                //     'respuestas_validas' => ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
                // ],
                // [
                //     'pregunta' => '¿Cuál es la política máxima de días para cambiar contraseña?',
                //     'respuestas_validas' => ['90', 'noventa', 'tres meses', '90 dias', '90 días']
                // ],
                // [
                //     'pregunta' => '¿Cuál es el protocolo de respuesta ante un intento de acceso no autorizado?',
                //     'respuestas_validas' => ['reportar', 'notificar', 'bloquear', 'documentar', 'activar alerta', 'alerta']
                // ]

                [
    'pregunta' => '¿Cuál es el NIT o número de identificación tributaria de la empresa?',
    'respuestas_validas' => ['900.123.456-7', '9001234567', '900123456-7']
],
[
    'pregunta' => '¿Cuál es la razón social exacta de la empresa?',
    'respuestas_validas' => ['Soluciones Ferreteria S.A.S', 'soluciones ferreteria sas', 'Soluciones Ferreteria SAS']
],
[
    'pregunta' => '¿En qué año fue constituida legalmente la empresa?',
    'respuestas_validas' => ['2015', 'dos mil quince']
],
[
    'pregunta' => '¿Cuál es el nombre del representante legal actual de la empresa?',
    'respuestas_validas' => ['Juan Carlos Mendoza', 'juan carlos mendoza', 'Juan Mendoza']
],
[
    'pregunta' => '¿Cuál es el número de empleados registrados actualmente en la empresa?',
    'respuestas_validas' => ['87', 'ochenta y siete']
],
[
    'pregunta' => '¿Cuál es el nombre del banco principal donde la empresa tiene su cuenta corporativa?',
    'respuestas_validas' => ['Bancolombia', 'bancolombia', 'banco colombia']
],

[
    'pregunta' => '¿Cuál es el código CIIU o actividad económica principal registrada de la empresa?',
    'respuestas_validas' => ['6201', '6202', '6209']
],
[
    'pregunta' => '¿Cuál es el nombre del proveedor de hosting o datacenter contratado por la empresa?',
    'respuestas_validas' => ['AWS', 'Amazon Web Services', 'aws', 'amazon']
],

[
    'pregunta' => '¿Cuántas sucursales o sedes tiene registradas la empresa actualmente?',
    'respuestas_validas' => ['3', 'tres']
],
[
    'pregunta' => '¿Cuál es el nombre del contador o firma contable que lleva los libros de la empresa?',
    'respuestas_validas' => ['Deloitte', 'deloitte', 'Contadores Asociados SAS', 'contadores asociados']
],
            ];

            $pregunta_idx = array_rand($preguntas_admin);
            $pregunta_obj = $preguntas_admin[$pregunta_idx];
            
            // Generar respuesta correcta ficticia de la lista válida
            $respuesta_correcta = $pregunta_obj['respuestas_validas'][array_rand($pregunta_obj['respuestas_validas'])];
            $codigo_mostrar = $respuesta_correcta;
        } else {
            $codigo_mostrar = $codigo;
        }

        // ── Guardar en sesión el estado de recuperación ──────────
        $_SESSION['rcp_email'] = $email;
        $_SESSION['rcp_id_usuario'] = $usuario['id'];
        $_SESSION['rcp_rol'] = $usuario['rol'];
        $_SESSION['rcp_codigo'] = $codigo_mostrar;
        $_SESSION['rcp_timestamp'] = time();

        // ── Responses diferentes según rol ──────────────────────
        $response = [
            'ok' => true,
            'tipo_usuario' => $usuario['rol'],
            'email' => $email,
            'nombre' => $usuario['nombre'],
            'codigo_ficticio' => $codigo_mostrar // Para cliente: 6 dígitos. Para admin: respuesta correcta
        ];

        // Si es admin/empleado, agregar información de 2FA
        if ($usuario['rol'] !== 'cliente') {
            
            // Generar Token Corporativo consistente basado en datos del usuario (no cambia)
            // Esto asegura que el mismo token se valide correctamente
            $token_corporativo = strtoupper(substr(hash('sha256', 'CORP_' . $usuario['id'] . '_' . $usuario['email']), 0, 8));
            
            $_SESSION['rcp_pregunta'] = $pregunta_obj['pregunta'];
            $_SESSION['rcp_respuesta_correcta'] = strtolower(trim($respuesta_correcta));
            $_SESSION['rcp_respuestas_validas'] = array_map('strtolower', $pregunta_obj['respuestas_validas']);
            $_SESSION['rcp_token_corporativo'] = $token_corporativo;
            
            error_log("DEBUG: Guardadas en sesión - Respuestas válidas: " . json_encode($_SESSION['rcp_respuestas_validas']) . ", Token: " . $token_corporativo);
            
            $response['pregunta'] = $pregunta_obj['pregunta'];
            $response['token_corporativo_ficticio'] = $token_corporativo;
            $response['respuesta_ficticia'] = $respuesta_correcta;
            $response['requiere_dos_factores'] = true;
        }

        echo json_encode($response);
        audit_log($pdoLog, 'RCP_SOLICITAR_OK', 'usuarios', (int)$usuario['id'], ['rol' => $usuario['rol'], 'email' => $email], (int)$usuario['id']);

    } catch (Exception $e) {
        http_response_code(500);
        audit_log($pdoLog, 'RCP_SOLICITAR_ERROR', 'usuarios', null, ['error' => $e->getMessage(), 'email' => $email]);
        echo json_encode(['ok' => false, 'mensaje' => 'Error en el servidor']);
    }
    exit;
}

// ── PASO 2: Validar código/respuesta ───────────────────────
if ($accion === 'validar_codigo') {
    $codigo_ingresado = trim($_POST['codigo'] ?? '');
    $respuesta_ingresada = trim($_POST['respuesta'] ?? '');
    $token_ingresado = trim($_POST['token'] ?? '');

    if (!isset($_SESSION['rcp_codigo'])) {
        http_response_code(400);
        audit_log($pdoLog, 'RCP_VALIDAR_FALLIDO', 'usuarios', $_SESSION['rcp_id_usuario'] ?? null, ['motivo' => 'sesion_expirada']);
        echo json_encode(['ok' => false, 'mensaje' => 'Sesión expirada. Intenta de nuevo']);
        exit;
    }

    // ── Validar según tipo de usuario ──────────────────────────
    $es_valido = false;

    if ($_SESSION['rcp_rol'] === 'cliente') {
        // Para clientes: validar código de 6 dígitos
        $es_valido = ($codigo_ingresado === $_SESSION['rcp_codigo']);
        if (!$es_valido) {
            http_response_code(400);
            audit_log($pdoLog, 'RCP_VALIDAR_FALLIDO', 'usuarios', $_SESSION['rcp_id_usuario'] ?? null, ['motivo' => 'codigo_incorrecto']);
            echo json_encode(['ok' => false, 'mensaje' => 'Código incorrecto. Por favor verifica el código enviado a tu correo']);
            exit;
        }
    } else {
        // Para admin/empleado: validar AMBOS factores (respuesta + token corporativo)
        
        error_log("DEBUG: Paso 2 Admin - Sesión actual: " . json_encode($_SESSION));
        
        // Validar respuesta a pregunta de seguridad
        $respuesta_normalizada = strtolower(trim($respuesta_ingresada));
        $respuesta_valida = false;
        
        error_log("DEBUG: Respuesta ingresada (normalizada): '$respuesta_normalizada'");
        error_log("DEBUG: Respuestas válidas en sesión: " . json_encode($_SESSION['rcp_respuestas_validas'] ?? 'NO EXISTE'));
        
        if (isset($_SESSION['rcp_respuestas_validas']) && is_array($_SESSION['rcp_respuestas_validas'])) {
            foreach ($_SESSION['rcp_respuestas_validas'] as $resp_valida) {
                if ($respuesta_normalizada === $resp_valida) {
                    $respuesta_valida = true;
                    error_log("DEBUG: Respuesta VÁLIDA encontrada: '$resp_valida'");
                    break;
                }
            }
            if (!$respuesta_valida) {
                error_log("DEBUG: Respuesta no coincide con ninguna válida. Intentó: '$respuesta_normalizada'");
            }
        } else {
            error_log("DEBUG: rcp_respuestas_validas no existe o no es array en sesión");
        }
        
        // Validar token corporativo
        $token_valido = ($token_ingresado === $_SESSION['rcp_token_corporativo']);
        error_log("DEBUG: Token ingresado: '$token_ingresado', Token en sesión: '" . ($_SESSION['rcp_token_corporativo'] ?? 'NO EXISTE') . "', Válido: " . ($token_valido ? 'SI' : 'NO'));
        
        if (!$respuesta_valida && !$token_valido) {
            http_response_code(400);
            audit_log($pdoLog, 'RCP_VALIDAR_FALLIDO', 'usuarios', $_SESSION['rcp_id_usuario'] ?? null, ['motivo' => 'doble_factor_incorrecto']);
            echo json_encode(['ok' => false, 'mensaje' => 'Verificación fallida. La respuesta de seguridad o el token corporativo son incorrectos']);
            exit;
        }
        
        if (!$respuesta_valida) {
            http_response_code(400);
            audit_log($pdoLog, 'RCP_VALIDAR_FALLIDO', 'usuarios', $_SESSION['rcp_id_usuario'] ?? null, ['motivo' => 'respuesta_incorrecta']);
            echo json_encode(['ok' => false, 'mensaje' => 'Respuesta de seguridad incorrecta']);
            exit;
        }
        
        if (!$token_valido) {
            http_response_code(400);
            audit_log($pdoLog, 'RCP_VALIDAR_FALLIDO', 'usuarios', $_SESSION['rcp_id_usuario'] ?? null, ['motivo' => 'token_incorrecto']);
            echo json_encode(['ok' => false, 'mensaje' => 'Token corporativo incorrecto']);
            exit;
        }
        
        $es_valido = true;
    }

    // ── Validación completada ──────────────────────────────────
    $_SESSION['rcp_validado'] = true;
    audit_log($pdoLog, 'RCP_VALIDAR_OK', 'usuarios', $_SESSION['rcp_id_usuario'] ?? null, ['rol' => $_SESSION['rcp_rol'] ?? null], $_SESSION['rcp_id_usuario'] ?? null);
    echo json_encode(['ok' => true, 'mensaje' => 'Verificación exitosa']);
    exit;
}

// ── PASO 3: Cambiar contraseña ────────────────────────────
if ($accion === 'cambiar_contrasena') {
    error_log("DEBUG: Iniciando cambio de contraseña. Sesión: " . json_encode($_SESSION));
    
    if (!isset($_SESSION['rcp_validado']) || !$_SESSION['rcp_validado']) {
        error_log("DEBUG: No validado. rcp_validado = " . ($_SESSION['rcp_validado'] ?? 'NO EXISTE'));
        http_response_code(403);
        audit_log($pdoLog, 'RCP_CAMBIO_FALLIDO', 'usuarios', $_SESSION['rcp_id_usuario'] ?? null, ['motivo' => 'no_verificado']);
        echo json_encode(['ok' => false, 'mensaje' => 'Debe completar la verificación primero']);
        exit;
    }

    if (!isset($_SESSION['rcp_id_usuario'])) {
        error_log("DEBUG: No existe rcp_id_usuario en sesión");
        http_response_code(400);
        echo json_encode(['ok' => false, 'mensaje' => 'Sesión expirada. Por favor intenta de nuevo']);
        exit;
    }

    $nueva_contrasena = $_POST['nueva_contrasena'] ?? '';
    $confirmar = $_POST['confirmar_contrasena'] ?? '';

    if (!$nueva_contrasena || !$confirmar) {
        error_log("DEBUG: Contraseñas vacías. nueva_contrasena = " . strlen($nueva_contrasena) . ", confirmar = " . strlen($confirmar));
        http_response_code(400);
        echo json_encode(['ok' => false, 'mensaje' => 'Las contraseñas son requeridas']);
        exit;
    }

    if ($nueva_contrasena !== $confirmar) {
        error_log("DEBUG: Contraseñas no coinciden");
        http_response_code(400);
        echo json_encode(['ok' => false, 'mensaje' => 'Las contraseñas no coinciden']);
        exit;
    }

    // Validar requisitos de contraseña
    $validacion = validarContrasena($nueva_contrasena);
    error_log("DEBUG: Validación de contraseña: " . json_encode($validacion));
    if (!$validacion['valida']) {
        error_log("DEBUG: Fallo validación. Mensaje: " . $validacion['mensaje']);
        http_response_code(400);
        echo json_encode(['ok' => false, 'mensaje' => $validacion['mensaje']]);
        exit;
    }

    try {
        $pdo = conectar();
        
        $hash = password_hash($nueva_contrasena, PASSWORD_BCRYPT);
        
        $stmt = $pdo->prepare("UPDATE usuarios SET contrasena_hash = ? WHERE id = ? AND activo = 1");
        $result = $stmt->execute([$hash, $_SESSION['rcp_id_usuario']]);

        if (!$result) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'mensaje' => 'Error al ejecutar la actualización']);
            exit;
        }

        if ($stmt->rowCount() > 0) {
            $idUsuarioRec = $_SESSION['rcp_id_usuario'] ?? null;

            // Limpiar sesión de recuperación
            unset($_SESSION['rcp_email']);
            unset($_SESSION['rcp_id_usuario']);
            unset($_SESSION['rcp_rol']);
            unset($_SESSION['rcp_codigo']);
            unset($_SESSION['rcp_validado']);
            unset($_SESSION['rcp_pregunta']);
            unset($_SESSION['rcp_timestamp']);

            audit_log($pdoLog, 'RCP_CAMBIO_OK', 'usuarios', $idUsuarioRec, ['mensaje' => 'Contrasena actualizada'], $idUsuarioRec);

            echo json_encode(['ok' => true, 'mensaje' => 'Contraseña actualizada correctamente']);
        } else {
            http_response_code(400);
            audit_log($pdoLog, 'RCP_CAMBIO_FALLIDO', 'usuarios', $_SESSION['rcp_id_usuario'] ?? null, ['motivo' => 'sin_filas_afectadas']);
            echo json_encode(['ok' => false, 'mensaje' => 'No se pudo actualizar la contraseña']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        audit_log($pdoLog, 'RCP_CAMBIO_ERROR', 'usuarios', $_SESSION['rcp_id_usuario'] ?? null, ['error' => $e->getMessage()]);
        echo json_encode(['ok' => false, 'mensaje' => 'Error en el servidor']);
    }
    exit;
}

// ── VALIDAR CONTRASEÑA ────────────────────────────────────
function validarContrasena($pass) {
    $requisitos = [
        'minimo' => strlen($pass) >= 8,
        'mayuscula' => preg_match('/[A-Z]/', $pass),
        'minuscula' => preg_match('/[a-z]/', $pass),
        'numero' => preg_match('/[0-9]/', $pass),
        'especial' => preg_match('/[!@#$%^&*()_+\\-=\\[\\]{};\'":\\\\|,.<>\\/?]/', $pass)
    ];

    // Contar cuántos requisitos se cumplen
    $cumplidos = count(array_filter($requisitos));
    $cumpleTodos = $cumplidos === count($requisitos);

    if (!$cumpleTodos) {
        $faltantes = [];
        if (!$requisitos['minimo']) $faltantes[] = '8+ caracteres';
        if (!$requisitos['mayuscula']) $faltantes[] = 'Mayúscula';
        if (!$requisitos['minuscula']) $faltantes[] = 'Minúscula';
        if (!$requisitos['numero']) $faltantes[] = 'Número';
        if (!$requisitos['especial']) $faltantes[] = 'Símbolo especial';
        return ['valida' => false, 'mensaje' => 'Requisitos: ' . implode(', ', $faltantes)];
    }

    return ['valida' => true];
}

// Acción no válida
http_response_code(400);
audit_log($pdoLog, 'ACCION_NO_VALIDA', 'api', null, ['endpoint' => 'api/recuperar-contrasena.php', 'accion' => $accion]);
echo json_encode(['error' => 'Acción no válida']);
?>
