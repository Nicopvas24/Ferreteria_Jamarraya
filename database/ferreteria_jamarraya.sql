-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 25-04-2026 a las 22:49:58
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `ferreteria_jamarraya`
--
CREATE DATABASE IF NOT EXISTS `ferreteria_jamarraya` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ferreteria_jamarraya`;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alquileres`
--

DROP TABLE IF EXISTS `alquileres`;
CREATE TABLE IF NOT EXISTS `alquileres` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_cliente` int(11) NOT NULL,
  `id_maquinaria` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `monto` decimal(10,2) NOT NULL CHECK (`monto` >= 0),
  `estado` enum('activo','finalizado','vencido') NOT NULL DEFAULT 'activo',
  `fecha_registro` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_alquileres_maquinaria` (`id_maquinaria`),
  KEY `fk_alquileres_usuario` (`id_usuario`),
  KEY `idx_alquileres_estado` (`estado`),
  KEY `idx_alquileres_fecha_fin` (`fecha_fin`),
  KEY `idx_alquileres_cliente` (`id_cliente`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `alquileres`
--

INSERT INTO `alquileres` (`id`, `id_cliente`, `id_maquinaria`, `id_usuario`, `fecha_inicio`, `fecha_fin`, `monto`, `estado`, `fecha_registro`) VALUES
(1, 1, 5, 3, '2026-01-10', '2026-01-15', 300000.00, 'finalizado', '2026-01-10 08:30:00'),
(2, 3, 1, 4, '2026-01-20', '2026-01-23', 240000.00, 'finalizado', '2026-01-20 09:00:00'),
(3, 5, 7, 3, '2026-02-05', '2026-02-07', 300000.00, 'finalizado', '2026-02-05 10:00:00'),
(4, 2, 11, 5, '2026-02-14', '2026-02-16', 170000.00, 'finalizado', '2026-02-14 08:00:00'),
(5, 7, 3, 6, '2026-02-28', '2026-03-02', 360000.00, 'finalizado', '2026-02-28 09:30:00'),
(6, 4, 6, 4, '2026-03-10', '2026-03-12', 140000.00, 'finalizado', '2026-03-10 08:00:00'),
(7, 8, 2, 7, '2026-03-18', '2026-03-20', 90000.00, 'finalizado', '2026-03-18 10:00:00'),
(8, 6, 10, 5, '2026-03-25', '2026-04-24', 280000.00, 'finalizado', '2026-03-25 09:00:00'),
(9, 9, 4, 8, '2026-04-03', '2026-04-25', 800000.00, 'finalizado', '2026-04-18 08:30:00'),
(10, 10, 8, 3, '2026-04-10', '2026-04-25', 450000.00, 'finalizado', '2026-04-20 09:00:00'),
(11, 6, 5, 1, '2026-04-24', '2026-04-30', 420000.00, 'activo', '2026-04-24 16:19:46'),
(12, 1, 12, 9, '2026-04-25', '2026-04-25', 35000.00, 'activo', '2026-04-25 15:46:00'),
(13, 1, 2, 9, '2026-04-25', '2026-04-30', 270000.00, 'activo', '2026-04-25 15:46:00'),
(14, 1, 1, 9, '2026-04-25', '2026-04-26', 160000.00, 'activo', '2026-04-25 15:48:25');

--
-- Disparadores `alquileres`
--
DROP TRIGGER IF EXISTS `trg_alerta_alquiler_insert`;
DELIMITER $$
CREATE TRIGGER `trg_alerta_alquiler_insert` AFTER INSERT ON `alquileres` FOR EACH ROW BEGIN
    DECLARE v_cliente VARCHAR(100) DEFAULT '';
    DECLARE v_maquinaria VARCHAR(100) DEFAULT '';

    SELECT COALESCE(nombre, '') INTO v_cliente
    FROM clientes
    WHERE id = NEW.id_cliente
    LIMIT 1;

    SELECT COALESCE(nombre, '') INTO v_maquinaria
    FROM maquinaria
    WHERE id = NEW.id_maquinaria
    LIMIT 1;

    IF NEW.estado = 'activo' AND DATEDIFF(NEW.fecha_fin, CURDATE()) BETWEEN 0 AND 2 THEN
        INSERT INTO logs (id_usuario, accion, tabla_afectada, id_registro, detalle, ip_origen)
        SELECT NULL,
               'ALERTA_ALQUILER_POR_VENCER',
               'alquileres',
               NEW.id,
               JSON_OBJECT(
                   'cliente', v_cliente,
                   'maquinaria', v_maquinaria,
                   'fecha_fin', NEW.fecha_fin,
                   'color', 'amarillo',
                   'accion_sugerida', 'Contactar cliente para devolucion'
               ),
               NULL
        WHERE NOT EXISTS (
            SELECT 1
            FROM logs l
            WHERE l.accion = 'ALERTA_ALQUILER_POR_VENCER'
              AND l.id_registro = NEW.id
              AND DATE(l.fecha) = CURDATE()
        );
    END IF;

    IF NEW.estado = 'vencido' THEN
        INSERT INTO logs (id_usuario, accion, tabla_afectada, id_registro, detalle, ip_origen)
        SELECT NULL,
               'ALERTA_ALQUILER_VENCIDO',
               'alquileres',
               NEW.id,
               JSON_OBJECT(
                   'cliente', v_cliente,
                   'maquinaria', v_maquinaria,
                   'fecha_fin', NEW.fecha_fin,
                   'color', 'rojo',
                   'accion_sugerida', 'Alquiler vencido - Contactar urgente'
               ),
               NULL
        WHERE NOT EXISTS (
            SELECT 1
            FROM logs l
            WHERE l.accion = 'ALERTA_ALQUILER_VENCIDO'
              AND l.id_registro = NEW.id
              AND DATE(l.fecha) = CURDATE()
        );
    END IF;
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `trg_alerta_alquiler_update`;
DELIMITER $$
CREATE TRIGGER `trg_alerta_alquiler_update` AFTER UPDATE ON `alquileres` FOR EACH ROW BEGIN
    DECLARE v_cliente VARCHAR(100) DEFAULT '';
    DECLARE v_maquinaria VARCHAR(100) DEFAULT '';

    SELECT COALESCE(nombre, '') INTO v_cliente
    FROM clientes
    WHERE id = NEW.id_cliente
    LIMIT 1;

    SELECT COALESCE(nombre, '') INTO v_maquinaria
    FROM maquinaria
    WHERE id = NEW.id_maquinaria
    LIMIT 1;

    IF NEW.estado = 'activo'
       AND DATEDIFF(NEW.fecha_fin, CURDATE()) BETWEEN 0 AND 2
       AND (
            OLD.estado <> NEW.estado
            OR OLD.fecha_fin <> NEW.fecha_fin
            OR OLD.id_cliente <> NEW.id_cliente
            OR OLD.id_maquinaria <> NEW.id_maquinaria
       ) THEN
        INSERT INTO logs (id_usuario, accion, tabla_afectada, id_registro, detalle, ip_origen)
        SELECT NULL,
               'ALERTA_ALQUILER_POR_VENCER',
               'alquileres',
               NEW.id,
               JSON_OBJECT(
                   'cliente', v_cliente,
                   'maquinaria', v_maquinaria,
                   'fecha_fin', NEW.fecha_fin,
                   'color', 'amarillo',
                   'accion_sugerida', 'Contactar cliente para devolucion'
               ),
               NULL
        WHERE NOT EXISTS (
            SELECT 1
            FROM logs l
            WHERE l.accion = 'ALERTA_ALQUILER_POR_VENCER'
              AND l.id_registro = NEW.id
              AND DATE(l.fecha) = CURDATE()
        );
    END IF;

    IF NEW.estado = 'vencido' AND OLD.estado <> 'vencido' THEN
        INSERT INTO logs (id_usuario, accion, tabla_afectada, id_registro, detalle, ip_origen)
        SELECT NULL,
               'ALERTA_ALQUILER_VENCIDO',
               'alquileres',
               NEW.id,
               JSON_OBJECT(
                   'cliente', v_cliente,
                   'maquinaria', v_maquinaria,
                   'fecha_fin', NEW.fecha_fin,
                   'color', 'rojo',
                   'accion_sugerida', 'Alquiler vencido - Contactar urgente'
               ),
               NULL
        WHERE NOT EXISTS (
            SELECT 1
            FROM logs l
            WHERE l.accion = 'ALERTA_ALQUILER_VENCIDO'
              AND l.id_registro = NEW.id
              AND DATE(l.fecha) = CURDATE()
        );
    END IF;
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `trg_alquiler_estado_vencido_insert`;
DELIMITER $$
CREATE TRIGGER `trg_alquiler_estado_vencido_insert` BEFORE INSERT ON `alquileres` FOR EACH ROW BEGIN
    IF NEW.estado = 'activo' AND NEW.fecha_fin < CURDATE() THEN
        SET NEW.estado = 'vencido';
    END IF;
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `trg_alquiler_estado_vencido_update`;
DELIMITER $$
CREATE TRIGGER `trg_alquiler_estado_vencido_update` BEFORE UPDATE ON `alquileres` FOR EACH ROW BEGIN
    IF NEW.estado = 'activo' AND NEW.fecha_fin < CURDATE() THEN
        SET NEW.estado = 'vencido';
    END IF;
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `trg_maquinaria_alquilada`;
DELIMITER $$
CREATE TRIGGER `trg_maquinaria_alquilada` AFTER INSERT ON `alquileres` FOR EACH ROW BEGIN
    IF NEW.estado IN ('activo', 'vencido') THEN
        UPDATE maquinaria
        SET estado = 'alquilada'
        WHERE id = NEW.id_maquinaria;
    END IF;
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `trg_maquinaria_devuelta`;
DELIMITER $$
CREATE TRIGGER `trg_maquinaria_devuelta` AFTER UPDATE ON `alquileres` FOR EACH ROW BEGIN
    IF NEW.estado = 'finalizado' AND OLD.estado <> 'finalizado' THEN
        UPDATE maquinaria
        SET estado = 'disponible'
        WHERE id = NEW.id_maquinaria;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

DROP TABLE IF EXISTS `clientes`;
CREATE TABLE IF NOT EXISTS `clientes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `identificacion` varchar(20) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_clientes_identificacion` (`identificacion`),
  KEY `fk_clientes_usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id`, `id_usuario`, `nombre`, `identificacion`, `telefono`, `email`, `direccion`) VALUES
(1, 9, 'Pedro Gómez', '10234567', '3001234567', 'pedro.gomez@gmail.com', 'Cra 5 #12-34, Pereira'),
(2, 10, 'Ana Morales', '10345678', '3109876543', 'ana.morales@gmail.com', 'Cll 19 #8-22, Pereira'),
(3, 11, 'Ricardo Zapata', '10456789', '3156789012', 'ricardo.zapata@gmail.com', 'Av. 30 de Agosto #45-10, Pereira'),
(4, 12, 'Sofía Castillo', '10567890', '3003456789', 'sofia.castillo@gmail.com', 'Cll 12 #15-60, Dosquebradas'),
(5, 13, 'Hernán Vargas', '10678901', '3172345678', 'hernan.vargas@gmail.com', 'Cra 14 #20-55, Pereira'),
(6, 14, 'Camila Restrepo', '10789012', '3181234567', 'camila.restrepo@gmail.com', 'Cll 25 #10-11, Pereira'),
(7, NULL, 'Luis Arango', '10890123', '3123456789', 'luis.arango@gmail.com', 'Cra 7 #33-90, Pereira'),
(8, NULL, 'Natalia Patiño', '10901234', '3204567890', 'natalia.patino@gmail.com', 'Cll 5 #18-44, Cartago'),
(9, NULL, 'Sebastián Cano', '11012345', '3055678901', 'sebastian.cano@gmail.com', 'Cra 22 #9-15, Pereira'),
(10, NULL, 'Juliana Mejía', '11123456', '3196789012', 'juliana.mejia@gmail.com', 'Cll 17 #7-80, Pereira');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_venta`
--

DROP TABLE IF EXISTS `detalle_venta`;
CREATE TABLE IF NOT EXISTS `detalle_venta` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_venta` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL CHECK (`cantidad` > 0),
  `precio_unitario` decimal(10,2) NOT NULL CHECK (`precio_unitario` >= 0),
  `subtotal` decimal(12,2) NOT NULL CHECK (`subtotal` >= 0),
  PRIMARY KEY (`id`),
  KEY `fk_detalle_venta_venta` (`id_venta`),
  KEY `fk_detalle_venta_producto` (`id_producto`)
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `detalle_venta`
--

INSERT INTO `detalle_venta` (`id`, `id_venta`, `id_producto`, `cantidad`, `precio_unitario`, `subtotal`) VALUES
(1, 1, 1, 1, 289000.00, 289000.00),
(2, 1, 14, 1, 18000.00, 18000.00),
(3, 2, 19, 5, 28000.00, 140000.00),
(4, 2, 24, 2, 6500.00, 13000.00),
(5, 2, 21, 3, 8000.00, 24000.00),
(6, 3, 27, 4, 15000.00, 60000.00),
(7, 3, 29, 2, 9500.00, 19000.00),
(8, 3, 33, 3, 3500.00, 10500.00),
(9, 4, 42, 2, 58000.00, 116000.00),
(10, 4, 44, 1, 18000.00, 18000.00),
(11, 4, 45, 2, 12000.00, 24000.00),
(12, 5, 34, 1, 95000.00, 95000.00),
(13, 5, 36, 3, 14000.00, 42000.00),
(14, 5, 37, 4, 12000.00, 48000.00),
(15, 6, 20, 6, 18500.00, 111000.00),
(16, 6, 22, 50, 1800.00, 90000.00),
(17, 7, 9, 1, 32000.00, 32000.00),
(18, 7, 13, 1, 28000.00, 28000.00),
(19, 7, 15, 1, 42000.00, 42000.00),
(20, 8, 49, 2, 28000.00, 56000.00),
(21, 8, 50, 2, 12000.00, 24000.00),
(22, 8, 25, 2, 9000.00, 18000.00),
(23, 9, 30, 2, 22000.00, 44000.00),
(24, 9, 31, 1, 65000.00, 65000.00),
(25, 9, 32, 1, 18000.00, 18000.00),
(26, 10, 38, 1, 75000.00, 75000.00),
(27, 10, 39, 2, 35000.00, 70000.00),
(28, 10, 41, 1, 45000.00, 45000.00),
(29, 11, 43, 3, 72000.00, 216000.00),
(30, 11, 46, 2, 32000.00, 64000.00),
(31, 11, 47, 4, 7500.00, 30000.00),
(32, 12, 3, 1, 195000.00, 195000.00),
(33, 12, 6, 1, 150000.00, 150000.00),
(34, 13, 23, 4, 55000.00, 220000.00),
(35, 13, 26, 2, 12000.00, 24000.00),
(36, 14, 10, 1, 85000.00, 85000.00),
(37, 14, 17, 1, 48000.00, 48000.00),
(38, 14, 16, 1, 35000.00, 35000.00),
(39, 15, 19, 3, 28000.00, 84000.00),
(40, 15, 20, 4, 18500.00, 74000.00),
(41, 15, 21, 2, 8000.00, 16000.00),
(42, 16, 35, 1, 68000.00, 68000.00),
(43, 16, 40, 3, 22000.00, 66000.00),
(44, 17, 42, 4, 58000.00, 232000.00),
(45, 17, 44, 2, 18000.00, 36000.00),
(46, 17, 48, 3, 15000.00, 45000.00),
(47, 18, 49, 3, 28000.00, 84000.00),
(48, 18, 11, 2, 12000.00, 24000.00),
(49, 18, 12, 2, 12000.00, 24000.00),
(50, 19, 27, 6, 15000.00, 90000.00),
(51, 19, 28, 2, 24000.00, 48000.00),
(52, 19, 30, 3, 22000.00, 66000.00),
(53, 20, 7, 1, 260000.00, 260000.00),
(54, 20, 5, 1, 210000.00, 210000.00),
(55, 21, 27, 2, 15000.00, 30000.00),
(56, 22, 25, 1, 9000.00, 9000.00),
(57, 23, 25, 1, 9000.00, 9000.00),
(58, 24, 25, 1, 9000.00, 9000.00);

--
-- Disparadores `detalle_venta`
--
DROP TRIGGER IF EXISTS `trg_actualizar_total_venta`;
DELIMITER $$
CREATE TRIGGER `trg_actualizar_total_venta` AFTER INSERT ON `detalle_venta` FOR EACH ROW BEGIN
    UPDATE ventas
    SET total = (
        SELECT SUM(subtotal)
        FROM detalle_venta
        WHERE id_venta = NEW.id_venta
    )
    WHERE id = NEW.id_venta;
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `trg_calcular_subtotal`;
DELIMITER $$
CREATE TRIGGER `trg_calcular_subtotal` BEFORE INSERT ON `detalle_venta` FOR EACH ROW BEGIN
    SET NEW.subtotal = NEW.cantidad * NEW.precio_unitario;
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `trg_descontar_stock`;
DELIMITER $$
CREATE TRIGGER `trg_descontar_stock` AFTER INSERT ON `detalle_venta` FOR EACH ROW BEGIN
    UPDATE productos
    SET stock_actual = stock_actual - NEW.cantidad
    WHERE id = NEW.id_producto;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `logs`
--

DROP TABLE IF EXISTS `logs`;
CREATE TABLE IF NOT EXISTS `logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) DEFAULT NULL,
  `accion` varchar(100) NOT NULL,
  `tabla_afectada` varchar(50) DEFAULT NULL,
  `id_registro` int(11) DEFAULT NULL,
  `detalle` text DEFAULT NULL,
  `ip_origen` varchar(45) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_logs_usuario_fecha` (`id_usuario`,`fecha`)
) ENGINE=InnoDB AUTO_INCREMENT=97 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `logs`
--

INSERT INTO `logs` (`id`, `id_usuario`, `accion`, `tabla_afectada`, `id_registro`, `detalle`, `ip_origen`, `fecha`) VALUES
(1, NULL, 'LOGIN_FALLIDO', 'usuarios', NULL, '{\"motivo\":\"credenciales_invalidas\",\"email\":\"admin@jamarraya.com\"}', '::1', '2026-04-24 15:52:45'),
(2, NULL, 'LOGIN_FALLIDO', 'usuarios', NULL, '{\"motivo\":\"credenciales_invalidas\",\"email\":\"admin@jamarraya.com\"}', '::1', '2026-04-24 15:52:51'),
(3, NULL, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/recuperar-contrasena.php\",\"operacion\":\"solicitar_codigo\",\"method\":\"POST\",\"query\":[]}', '::1', '2026-04-24 15:53:16'),
(4, 1, 'RCP_SOLICITAR_OK', 'usuarios', 1, '{\"rol\":\"admin\",\"email\":\"admin@jamarraya.com\"}', '::1', '2026-04-24 15:53:16'),
(5, NULL, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/recuperar-contrasena.php\",\"operacion\":\"validar_codigo\",\"method\":\"POST\",\"query\":[]}', '::1', '2026-04-24 15:53:19'),
(6, 1, 'RCP_VALIDAR_OK', 'usuarios', 1, '{\"rol\":\"admin\"}', '::1', '2026-04-24 15:53:19'),
(7, NULL, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/recuperar-contrasena.php\",\"operacion\":\"cambiar_contrasena\",\"method\":\"POST\",\"query\":[]}', '::1', '2026-04-24 15:54:34'),
(8, 1, 'RCP_CAMBIO_OK', 'usuarios', 1, '{\"mensaje\":\"Contrasena actualizada\"}', '::1', '2026-04-24 15:54:34'),
(9, 1, 'LOGIN_EXITOSO', 'usuarios', 1, '{\"email\":\"admin@jamarraya.com\",\"rol\":\"admin\"}', '::1', '2026-04-24 15:54:40'),
(10, 1, 'LOGOUT', 'usuarios', 1, '{\"mensaje\":\"Cierre de sesion\"}', '::1', '2026-04-24 15:58:09'),
(11, NULL, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/recuperar-contrasena.php\",\"operacion\":\"solicitar_codigo\",\"method\":\"POST\",\"query\":[]}', '::1', '2026-04-24 15:58:29'),
(12, NULL, 'RCP_SOLICITAR_FALLIDO', 'usuarios', NULL, '{\"motivo\":\"email_no_encontrado\",\"email\":\"andres.herrera@gmail.com\"}', '::1', '2026-04-24 15:58:29'),
(13, NULL, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/recuperar-contrasena.php\",\"operacion\":\"solicitar_codigo\",\"method\":\"POST\",\"query\":[]}', '::1', '2026-04-24 15:58:46'),
(14, 3, 'RCP_SOLICITAR_OK', 'usuarios', 3, '{\"rol\":\"empleado\",\"email\":\"andres.herrera@jamarraya.com\"}', '::1', '2026-04-24 15:58:46'),
(15, NULL, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/recuperar-contrasena.php\",\"operacion\":\"validar_codigo\",\"method\":\"POST\",\"query\":[]}', '::1', '2026-04-24 15:58:51'),
(16, 3, 'RCP_VALIDAR_OK', 'usuarios', 3, '{\"rol\":\"empleado\"}', '::1', '2026-04-24 15:58:51'),
(17, NULL, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/recuperar-contrasena.php\",\"operacion\":\"cambiar_contrasena\",\"method\":\"POST\",\"query\":[]}', '::1', '2026-04-24 15:59:49'),
(18, 3, 'RCP_CAMBIO_OK', 'usuarios', 3, '{\"mensaje\":\"Contrasena actualizada\"}', '::1', '2026-04-24 15:59:49'),
(19, NULL, 'LOGIN_FALLIDO', 'usuarios', NULL, '{\"motivo\":\"credenciales_invalidas\",\"email\":\"andres.herrera@gmail.com\"}', '::1', '2026-04-24 16:02:22'),
(20, NULL, 'LOGIN_FALLIDO', 'usuarios', NULL, '{\"motivo\":\"credenciales_invalidas\",\"email\":\"andres.herrera@gmail.com\"}', '::1', '2026-04-24 16:02:35'),
(21, NULL, 'LOGIN_FALLIDO', 'usuarios', NULL, '{\"motivo\":\"credenciales_invalidas\",\"email\":\"andres.herrera@gmail.com\"}', '::1', '2026-04-24 16:02:36'),
(22, NULL, 'LOGIN_FALLIDO', 'usuarios', NULL, '{\"motivo\":\"credenciales_invalidas\",\"email\":\"andres.herrera@gmail.com\"}', '::1', '2026-04-24 16:02:36'),
(23, NULL, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/recuperar-contrasena.php\",\"operacion\":\"solicitar_codigo\",\"method\":\"POST\",\"query\":[]}', '::1', '2026-04-24 16:02:53'),
(24, NULL, 'RCP_SOLICITAR_FALLIDO', 'usuarios', NULL, '{\"motivo\":\"email_no_encontrado\",\"email\":\"andres.herrera@gmail.com\"}', '::1', '2026-04-24 16:02:53'),
(25, NULL, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/recuperar-contrasena.php\",\"operacion\":\"solicitar_codigo\",\"method\":\"POST\",\"query\":[]}', '::1', '2026-04-24 16:03:02'),
(26, 3, 'RCP_SOLICITAR_OK', 'usuarios', 3, '{\"rol\":\"empleado\",\"email\":\"andres.herrera@jamarraya.com\"}', '::1', '2026-04-24 16:03:02'),
(27, NULL, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/recuperar-contrasena.php\",\"operacion\":\"validar_codigo\",\"method\":\"POST\",\"query\":[]}', '::1', '2026-04-24 16:03:04'),
(28, 3, 'RCP_VALIDAR_OK', 'usuarios', 3, '{\"rol\":\"empleado\"}', '::1', '2026-04-24 16:03:04'),
(29, NULL, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/recuperar-contrasena.php\",\"operacion\":\"cambiar_contrasena\",\"method\":\"POST\",\"query\":[]}', '::1', '2026-04-24 16:03:19'),
(30, 3, 'RCP_CAMBIO_OK', 'usuarios', 3, '{\"mensaje\":\"Contrasena actualizada\"}', '::1', '2026-04-24 16:03:19'),
(31, NULL, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/recuperar-contrasena.php\",\"operacion\":\"solicitar_codigo\",\"method\":\"POST\",\"query\":[]}', '::1', '2026-04-24 16:05:51'),
(32, 9, 'RCP_SOLICITAR_OK', 'usuarios', 9, '{\"rol\":\"cliente\",\"email\":\"pedro.gomez@gmail.com\"}', '::1', '2026-04-24 16:05:51'),
(33, NULL, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/recuperar-contrasena.php\",\"operacion\":\"validar_codigo\",\"method\":\"POST\",\"query\":[]}', '::1', '2026-04-24 16:05:53'),
(34, 9, 'RCP_VALIDAR_OK', 'usuarios', 9, '{\"rol\":\"cliente\"}', '::1', '2026-04-24 16:05:53'),
(35, NULL, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/recuperar-contrasena.php\",\"operacion\":\"cambiar_contrasena\",\"method\":\"POST\",\"query\":[]}', '::1', '2026-04-24 16:06:07'),
(36, 9, 'RCP_CAMBIO_OK', 'usuarios', 9, '{\"mensaje\":\"Contrasena actualizada\"}', '::1', '2026-04-24 16:06:07'),
(37, 13, 'LOGIN_EXITOSO', 'usuarios', 13, '{\"email\":\"hernan.vargas@gmail.com\",\"rol\":\"cliente\"}', '::1', '2026-04-24 16:08:37'),
(38, 13, 'LOGOUT', 'usuarios', 13, '{\"mensaje\":\"Cierre de sesion\"}', '::1', '2026-04-24 16:17:36'),
(39, 1, 'LOGIN_EXITOSO', 'usuarios', 1, '{\"email\":\"admin@jamarraya.com\",\"rol\":\"admin\"}', '::1', '2026-04-24 16:17:47'),
(40, 1, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/alquileres.php\",\"operacion\":\"registrar\",\"method\":\"POST\",\"query\":{\"accion\":\"registrar\"}}', '::1', '2026-04-24 16:19:46'),
(41, 1, 'ALQUILER_REGISTRADO', 'alquileres', 11, '{\"id_cliente\":6,\"id_maquinaria\":5,\"monto\":420000}', '::1', '2026-04-24 16:19:46'),
(42, 1, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/alquileres.php\",\"operacion\":\"devolver\",\"method\":\"POST\",\"query\":{\"accion\":\"devolver\"}}', '::1', '2026-04-24 16:22:18'),
(43, 1, 'ALQUILER_DEVUELTO', 'alquileres', 8, '{\"id_maquinaria\":10}', '::1', '2026-04-24 16:22:18'),
(44, 1, 'CLIENTE_REGISTRADO', 'clientes', 11, '{\"identificacion\":\"1111111\",\"email\":\"11111@gmail.com\"}', '::1', '2026-04-24 16:55:56'),
(45, 1, 'VENTA_REGISTRADA', 'ventas', 21, '{\"id_cliente\":5,\"items\":1,\"total\":30000}', '::1', '2026-04-24 16:57:24'),
(46, 1, 'LOGOUT', 'usuarios', 1, '{\"mensaje\":\"Cierre de sesion\"}', '::1', '2026-04-24 16:57:33'),
(47, 1, 'LOGIN_EXITOSO', 'usuarios', 1, '{\"email\":\"admin@jamarraya.com\",\"rol\":\"admin\"}', '::1', '2026-04-25 14:58:41'),
(48, NULL, 'ALERTA_STOCK_BAJO', 'productos', 20, '{\"nombre\": \"Varilla Corrugada 3/8\\\" x6m\", \"stock_actual\": 5, \"stock_minimo\": 15, \"color\": \"rojo\", \"accion_sugerida\": \"Reabastecer producto\"}', NULL, '2026-04-25 15:03:15'),
(49, 1, 'PRODUCTO_EDITADO', 'productos', 20, '{\"codigo\":\"MC-002\",\"nombre\":\"Varilla Corrugada 3/8\\\" x6m\"}', '::1', '2026-04-25 15:03:15'),
(50, NULL, 'ALERTA_ALQUILER_VENCIDO', 'alquileres', 9, '{\"cliente\": \"Sebastián Cano\", \"maquinaria\": \"Compresor Industrial 100L\", \"fecha_fin\": \"2026-04-08\", \"color\": \"rojo\", \"accion_sugerida\": \"Alquiler vencido - Contactar urgente\"}', NULL, '2026-04-25 15:05:56'),
(51, 1, 'LOGOUT', 'usuarios', 1, '{\"mensaje\":\"Cierre de sesion\"}', '::1', '2026-04-25 15:06:46'),
(52, NULL, 'LOGIN_FALLIDO', 'usuarios', NULL, '{\"motivo\":\"credenciales_invalidas\",\"email\":\"empleado@jamarraya\"}', '::1', '2026-04-25 15:07:24'),
(53, 3, 'LOGIN_EXITOSO', 'usuarios', 3, '{\"email\":\"empleado@jamarraya.com\",\"rol\":\"empleado\"}', '::1', '2026-04-25 15:07:29'),
(54, 3, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/alquileres.php\",\"operacion\":\"devolver\",\"method\":\"POST\",\"query\":{\"accion\":\"devolver\"}}', '::1', '2026-04-25 15:07:59'),
(55, 3, 'ALQUILER_DEVUELTO', 'alquileres', 9, '{\"id_maquinaria\":4}', '::1', '2026-04-25 15:07:59'),
(56, 3, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/alquileres.php\",\"operacion\":\"devolver\",\"method\":\"POST\",\"query\":{\"accion\":\"devolver\"}}', '::1', '2026-04-25 15:11:22'),
(57, 3, 'ALQUILER_DEVUELTO', 'alquileres', 10, '{\"id_maquinaria\":8}', '::1', '2026-04-25 15:11:22'),
(58, 3, 'LOGOUT', 'usuarios', 3, '{\"mensaje\":\"Cierre de sesion\"}', '::1', '2026-04-25 15:11:43'),
(59, 1, 'LOGIN_EXITOSO', 'usuarios', 1, '{\"email\":\"admin@jamarraya.com\",\"rol\":\"admin\"}', '::1', '2026-04-25 15:11:46'),
(60, 1, 'PRODUCTO_EDITADO', 'productos', 20, '{\"codigo\":\"MC-002\",\"nombre\":\"Varilla Corrugada 3/8\\\" x6m\"}', '::1', '2026-04-25 15:12:07'),
(61, NULL, 'ALERTA_STOCK_BAJO', 'productos', 1, '{\"nombre\": \"Taladro Percutor 13mm\", \"stock_actual\": 1, \"stock_minimo\": 3, \"color\": \"rojo\", \"accion_sugerida\": \"Reabastecer producto\"}', NULL, '2026-04-25 15:12:38'),
(62, 1, 'PRODUCTO_EDITADO', 'productos', 1, '{\"codigo\":\"HE-001\",\"nombre\":\"Taladro Percutor 13mm\"}', '::1', '2026-04-25 15:12:38'),
(63, 1, 'PRODUCTO_EDITADO', 'productos', 27, '{\"codigo\":\"FP-001\",\"nombre\":\"Tubo PVC Presión 1/2\\\" x6m\"}', '::1', '2026-04-25 15:25:15'),
(64, 1, 'LOGOUT', 'usuarios', 1, '{\"mensaje\":\"Cierre de sesion\"}', '::1', '2026-04-25 15:25:30'),
(65, 3, 'LOGIN_EXITOSO', 'usuarios', 3, '{\"email\":\"empleado@jamarraya.com\",\"rol\":\"empleado\"}', '::1', '2026-04-25 15:25:51'),
(66, 3, 'LOGOUT', 'usuarios', 3, '{\"mensaje\":\"Cierre de sesion\"}', '::1', '2026-04-25 15:26:52'),
(67, 3, 'LOGIN_EXITOSO', 'usuarios', 3, '{\"email\":\"empleado@jamarraya.com\",\"rol\":\"empleado\"}', '::1', '2026-04-25 15:27:14'),
(68, 3, 'LOGOUT', 'usuarios', 3, '{\"mensaje\":\"Cierre de sesion\"}', '::1', '2026-04-25 15:27:53'),
(69, 3, 'LOGIN_EXITOSO', 'usuarios', 3, '{\"email\":\"empleado@jamarraya.com\",\"rol\":\"empleado\"}', '::1', '2026-04-25 15:35:32'),
(70, 3, 'LOGOUT', 'usuarios', 3, '{\"mensaje\":\"Cierre de sesion\"}', '::1', '2026-04-25 15:36:05'),
(71, 3, 'LOGIN_EXITOSO', 'usuarios', 3, '{\"email\":\"empleado@jamarraya.com\",\"rol\":\"empleado\"}', '::1', '2026-04-25 15:38:41'),
(72, 3, 'PRODUCTO_EDITADO', 'productos', 25, '{\"codigo\":\"MC-007\",\"nombre\":\"Tornillo Drywall 3½\\\" x100und\"}', '::1', '2026-04-25 15:39:13'),
(73, 3, 'LOGOUT', 'usuarios', 3, '{\"mensaje\":\"Cierre de sesion\"}', '::1', '2026-04-25 15:43:01'),
(74, 1, 'LOGIN_EXITOSO', 'usuarios', 1, '{\"email\":\"admin@jamarraya.com\",\"rol\":\"admin\"}', '::1', '2026-04-25 15:43:09'),
(75, 1, 'LOGOUT', 'usuarios', 1, '{\"mensaje\":\"Cierre de sesion\"}', '::1', '2026-04-25 15:44:07'),
(76, NULL, 'LOGIN_FALLIDO', 'usuarios', NULL, '{\"motivo\":\"credenciales_invalidas\",\"email\":\"cliente@jamarraya.com\"}', '::1', '2026-04-25 15:44:35'),
(77, NULL, 'LOGIN_FALLIDO', 'usuarios', NULL, '{\"motivo\":\"credenciales_invalidas\",\"email\":\"cliente@jamarraya.com\"}', '::1', '2026-04-25 15:44:44'),
(78, 9, 'LOGIN_EXITOSO', 'usuarios', 9, '{\"email\":\"cliente@gmail.com\",\"rol\":\"cliente\"}', '::1', '2026-04-25 15:44:54'),
(79, 9, 'LOGOUT', 'usuarios', 9, '{\"mensaje\":\"Cierre de sesion\"}', '::1', '2026-04-25 15:45:18'),
(80, 9, 'LOGIN_EXITOSO', 'usuarios', 9, '{\"email\":\"cliente@gmail.com\",\"rol\":\"cliente\"}', '::1', '2026-04-25 15:45:21'),
(81, 9, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/alquileres.php\",\"operacion\":\"registrar\",\"method\":\"POST\",\"query\":{\"accion\":\"registrar\"}}', '::1', '2026-04-25 15:45:59'),
(82, 9, 'VENTA_REGISTRADA', 'ventas', 22, '{\"id_cliente\":1,\"items\":1,\"total\":9000}', '::1', '2026-04-25 15:46:00'),
(83, 9, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/alquileres.php\",\"operacion\":\"registrar\",\"method\":\"POST\",\"query\":{\"accion\":\"registrar\"}}', '::1', '2026-04-25 15:46:00'),
(84, NULL, 'ALERTA_ALQUILER_POR_VENCER', 'alquileres', 12, '{\"cliente\": \"Pedro Gómez\", \"maquinaria\": \"Dobladora de Varilla Manual\", \"fecha_fin\": \"2026-04-25\", \"color\": \"amarillo\", \"accion_sugerida\": \"Contactar cliente para devolucion\"}', NULL, '2026-04-25 15:46:00'),
(85, 9, 'ALQUILER_REGISTRADO', 'alquileres', 12, '{\"id_cliente\":1,\"id_maquinaria\":12,\"monto\":35000}', '::1', '2026-04-25 15:46:00'),
(86, 9, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/alquileres.php\",\"operacion\":\"registrar\",\"method\":\"POST\",\"query\":{\"accion\":\"registrar\"}}', '::1', '2026-04-25 15:46:00'),
(87, 9, 'ALQUILER_REGISTRADO', 'alquileres', 13, '{\"id_cliente\":1,\"id_maquinaria\":2,\"monto\":270000}', '::1', '2026-04-25 15:46:00'),
(88, 9, 'VENTA_REGISTRADA', 'ventas', 23, '{\"id_cliente\":1,\"items\":1,\"total\":9000}', '::1', '2026-04-25 15:46:33'),
(89, 9, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/alquileres.php\",\"operacion\":\"registrar\",\"method\":\"POST\",\"query\":{\"accion\":\"registrar\"}}', '::1', '2026-04-25 15:46:33'),
(90, 9, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/alquileres.php\",\"operacion\":\"registrar\",\"method\":\"POST\",\"query\":{\"accion\":\"registrar\"}}', '::1', '2026-04-25 15:46:33'),
(91, 9, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/alquileres.php\",\"operacion\":\"registrar\",\"method\":\"POST\",\"query\":{\"accion\":\"registrar\"}}', '::1', '2026-04-25 15:46:33'),
(92, 9, 'LOGIN_EXITOSO', 'usuarios', 9, '{\"email\":\"cliente@gmail.com\",\"rol\":\"cliente\"}', '::1', '2026-04-25 15:47:41'),
(93, 9, 'VENTA_REGISTRADA', 'ventas', 24, '{\"id_cliente\":1,\"items\":1,\"total\":9000}', '::1', '2026-04-25 15:47:57'),
(94, 9, 'REQUEST', 'api', NULL, '{\"endpoint\":\"api/alquileres.php\",\"operacion\":\"registrar\",\"method\":\"POST\",\"query\":{\"accion\":\"registrar\"}}', '::1', '2026-04-25 15:48:25'),
(95, NULL, 'ALERTA_ALQUILER_POR_VENCER', 'alquileres', 14, '{\"cliente\": \"Pedro Gómez\", \"maquinaria\": \"Concretera 1 Saco\", \"fecha_fin\": \"2026-04-26\", \"color\": \"amarillo\", \"accion_sugerida\": \"Contactar cliente para devolucion\"}', NULL, '2026-04-25 15:48:25'),
(96, 9, 'ALQUILER_REGISTRADO', 'alquileres', 14, '{\"id_cliente\":1,\"id_maquinaria\":1,\"monto\":160000}', '::1', '2026-04-25 15:48:25');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `maquinaria`
--

DROP TABLE IF EXISTS `maquinaria`;
CREATE TABLE IF NOT EXISTS `maquinaria` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `estado` enum('disponible','alquilada','mantenimiento') NOT NULL DEFAULT 'disponible',
  `tarifa_alquiler` decimal(10,2) NOT NULL CHECK (`tarifa_alquiler` >= 0),
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `img` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `maquinaria`
--

INSERT INTO `maquinaria` (`id`, `nombre`, `descripcion`, `estado`, `tarifa_alquiler`, `activo`, `img`) VALUES
(1, 'Concretera 1 Saco', 'Mezcladora de concreto capacidad 1 saco, motor eléctrico 1HP, tambor de 160L', 'alquilada', 80000.00, 1, NULL),
(2, 'Vibrador de Concreto 1.5\"', 'Vibrador eléctrico para concreto, aguja flexible 1.5\", cable 6m, 1450W', 'alquilada', 45000.00, 1, NULL),
(3, 'Cortadora de Piso 14\"', 'Cortadora de piso disco diamantado 14\" 3HP gasolina para concreto, cerámica y asfalto', 'disponible', 120000.00, 1, NULL),
(4, 'Compresor Industrial 100L', 'Compresor de tornillo 100L 3HP eléctrico, presión máx 125PSI con set de manguera y pistola', 'disponible', 100000.00, 1, NULL),
(5, 'Andamio Tubular x3 tramos', 'Andamio multidireccional galvanizado, juego de 3 tramos altura máx 6m con plataforma y ruedas', 'alquilada', 60000.00, 1, NULL),
(6, 'Martillo Demoledor 11kg', 'Martillo demoledor eléctrico SDS-MAX 1500W 11kg con cinceles plano y punta', 'disponible', 70000.00, 1, NULL),
(7, 'Generador Eléctrico 5kW', 'Generador a gasolina 5kW monofásico 120/240V con AVR, tanque 15L autonomía 8h', 'disponible', 150000.00, 1, NULL),
(8, 'Pulidora de Pisos 17\"', 'Pulidora de pisos industrial 17\" 1HP 175RPM para ceras, limpieza y brillado', 'disponible', 90000.00, 1, NULL),
(9, 'Elevador de Materiales 200kg', 'Montacargas/elevador de materiales 200kg, altura máx 30m, motor eléctrico trifásico', 'disponible', 200000.00, 1, NULL),
(10, 'Esmeril de Banco 8\"', 'Esmeril de banco 750W disco doble 8\" para afilado y desbaste de metales y herramientas', 'disponible', 40000.00, 1, NULL),
(11, 'Hidrolavadora 2500PSI', 'Hidrolavadora de alta presión 2500PSI 2HP eléctrica con manguera 8m y lanza regulable', 'disponible', 85000.00, 1, NULL),
(12, 'Dobladora de Varilla Manual', 'Dobladora manual de varilla hasta 5/8\", capacidad de doble y corte, estructura metálica reforzada', 'alquilada', 35000.00, 1, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

DROP TABLE IF EXISTS `productos`;
CREATE TABLE IF NOT EXISTS `productos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `categoria` varchar(80) NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `stock_actual` int(11) NOT NULL DEFAULT 0,
  `stock_minimo` int(11) NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `img` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_productos_codigo` (`codigo`),
  KEY `idx_productos_stock` (`stock_actual`,`stock_minimo`),
  KEY `idx_productos_categoria` (`categoria`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `codigo`, `nombre`, `descripcion`, `categoria`, `precio`, `stock_actual`, `stock_minimo`, `activo`, `img`) VALUES
(1, 'HE-001', 'Taladro Percutor 13mm', 'Taladro percutor 700W con reversa y velocidad variable', 'herramientas_electricas', 289000.00, 1, 3, 1, NULL),
(2, 'HE-002', 'Taladro Inalámbrico 20V', 'Taladro inalámbrico brushless con batería de litio 2Ah', 'herramientas_electricas', 480000.00, 10, 2, 1, NULL),
(3, 'HE-003', 'Pulidora Angular 4½\"', 'Pulidora angular 800W con disco de corte incluido', 'herramientas_electricas', 195000.00, 11, 3, 1, NULL),
(4, 'HE-004', 'Sierra Circular 7¼\"', 'Sierra circular 1200W con guía paralela y disco 24 dientes', 'herramientas_electricas', 320000.00, 8, 2, 1, NULL),
(5, 'HE-005', 'Caladora Eléctrica 500W', 'Caladora 500W con pendulo de 4 posiciones, suela metálica', 'herramientas_electricas', 210000.00, 6, 2, 1, NULL),
(6, 'HE-006', 'Lijadora Orbital 180W', 'Lijadora orbital 180W con bolsa recolectora de polvo', 'herramientas_electricas', 150000.00, 9, 2, 1, NULL),
(7, 'HE-007', 'Atornillador Inalámbrico 12V', 'Atornillador inalámbrico 12V con 2 baterías y maletín', 'herramientas_electricas', 260000.00, 8, 2, 1, NULL),
(8, 'HE-008', 'Compresor de Aire 24L', 'Compresor de aire 1HP 24L con manómetro de doble escala', 'herramientas_electricas', 550000.00, 5, 1, 1, NULL),
(9, 'HM-001', 'Martillo Carpintero 16oz', 'Martillo de carpintero mango fibra de vidrio antivibraciones', 'herramientas_manuales', 32000.00, 29, 5, 1, NULL),
(10, 'HM-002', 'Juego de Llaves Mixtas x12', 'Set 12 llaves mixtas cromo vanadio 8–19mm', 'herramientas_manuales', 85000.00, 19, 4, 1, NULL),
(11, 'HM-003', 'Destornillador Pala 6\"', 'Destornillador pala mango bimaterial hoja 150mm', 'herramientas_manuales', 12000.00, 38, 8, 1, NULL),
(12, 'HM-004', 'Destornillador Estrella #2', 'Destornillador Phillips #2 mango bimaterial hoja 125mm', 'herramientas_manuales', 12000.00, 38, 8, 1, NULL),
(13, 'HM-005', 'Alicate Universal 8\"', 'Alicate universal aislado 1000V 200mm', 'herramientas_manuales', 28000.00, 24, 5, 1, NULL),
(14, 'HM-006', 'Cinta Métrica 5m', 'Cinta métrica 5m x19mm con freno y gancho magnético', 'herramientas_manuales', 18000.00, 34, 5, 1, NULL),
(15, 'HM-007', 'Nivel Aluminio 60cm', 'Nivel de aluminio 3 burbujas, 60cm de longitud', 'herramientas_manuales', 42000.00, 17, 3, 1, NULL),
(16, 'HM-008', 'Serrucho 22\"', 'Serrucho 22\" con dientes endurecidos por inducción', 'herramientas_manuales', 35000.00, 14, 3, 1, NULL),
(17, 'HM-009', 'Llave Stilson 14\"', 'Llave stilson de 14\" con mandíbulas reforzadas', 'herramientas_manuales', 48000.00, 11, 2, 1, NULL),
(18, 'HM-010', 'Espátula Metálica 4\"', 'Espátula metálica 4\" mango plástico reforzado', 'herramientas_manuales', 14000.00, 30, 5, 1, NULL),
(19, 'MC-001', 'Cemento Gris 50kg', 'Cemento Portland gris tipo I resistencia 3000 PSI', 'materiales', 28000.00, 72, 20, 1, NULL),
(20, 'MC-002', 'Varilla Corrugada 3/8\" x6m', 'Varilla corrugada acero 60 3/8\" longitud 6 metros', 'materiales', 18500.00, 50, 10, 1, NULL),
(21, 'MC-003', 'Arena Fina x bulto 40kg', 'Arena fina lavada para repellos y enchapes, bulto 40kg', 'materiales', 8000.00, 95, 25, 1, NULL),
(22, 'MC-004', 'Ladrillo Bloque #4 x unidad', 'Bloque de arcilla #4 para mampostería estructural', 'materiales', 1800.00, 450, 50, 1, NULL),
(23, 'MC-005', 'Plancha Fibrocemento 1.22x2.44', 'Plancha fibrocemento 6mm para cielos rasos y paredes', 'materiales', 55000.00, 26, 5, 1, NULL),
(24, 'MC-006', 'Puntilla 2½\" x500g', 'Puntilla lisa brillante 2½\" presentación 500 gramos', 'materiales', 6500.00, 48, 10, 1, NULL),
(25, 'MC-007', 'Tornillo Drywall 3½\" x100und', 'Tornillo drywall fosfatado 3½\" x 100 unidades', 'materiales', 9000.00, 35, 8, 1, NULL),
(26, 'MC-008', 'Pernos Expansores 3/8\" x25und', 'Taco fisher 3/8\" con perno, bolsa x25 unidades', 'materiales', 12000.00, 33, 5, 1, NULL),
(27, 'FP-001', 'Tubo PVC Presión 1/2\" x6m', 'Tubo PVC presión RDE-13.5 diámetro 1/2\" longitud 6m', 'plomeria', 15000.00, 28, 8, 1, NULL),
(28, 'FP-002', 'Tubo PVC Presión 1\" x6m', 'Tubo PVC presión RDE-21 diámetro 1\" longitud 6m', 'plomeria', 24000.00, 28, 6, 1, NULL),
(29, 'FP-003', 'Codo PVC 90° 1/2\" x bolsa 10', 'Codo PVC presión 90° de 1/2\", bolsa de 10 unidades', 'plomeria', 9500.00, 23, 5, 1, NULL),
(30, 'FP-004', 'Llave de Paso 1/2\" esfera', 'Llave de paso esférica 1/2\" latón cromado', 'plomeria', 22000.00, 15, 4, 1, NULL),
(31, 'FP-005', 'Manguera Jardín 1/2\" x15m', 'Manguera flexible 1/2\" x15m con pistola de 7 funciones', 'plomeria', 65000.00, 14, 3, 1, NULL),
(32, 'FP-006', 'Sifón PVC para Lavaplatos', 'Sifón extensible PVC blanco con tubo de desagüe 40mm', 'plomeria', 18000.00, 19, 4, 1, NULL),
(33, 'FP-007', 'Teflón Rollo 10m x19mm', 'Cinta teflón para uniones roscadas, rollo 10m ancho 19mm', 'plomeria', 3500.00, 57, 10, 1, NULL),
(34, 'EL-001', 'Cable THW 12 AWG x100m', 'Carrete cable THW 12AWG ICONTEC resistencia 20A', 'electricidad', 95000.00, 19, 4, 1, NULL),
(35, 'EL-002', 'Cable Dúplex 2x12 AWG x50m', 'Carrete cable dúplex 2x12AWG para circuitos domiciliarios', 'electricidad', 68000.00, 17, 3, 1, NULL),
(36, 'EL-003', 'Toma Corriente Doble 15A', 'Toma corriente doble polarizado 15A 125V con placa', 'electricidad', 14000.00, 32, 6, 1, NULL),
(37, 'EL-004', 'Interruptor Sencillo 10A', 'Interruptor sencillo 10A 250V con placa blanca', 'electricidad', 12000.00, 36, 8, 1, NULL),
(38, 'EL-005', 'Caja Breaker 4 circuitos', 'Caja breaker din-rail 4 circuitos con puerta transparente', 'electricidad', 75000.00, 9, 2, 1, NULL),
(39, 'EL-006', 'Breaker Bipolar 20A', 'Disyuntor termomagnético bipolar 20A 240V ICONTEC', 'electricidad', 35000.00, 13, 3, 1, NULL),
(40, 'EL-007', 'Conduit EMT 3/4\" x3m', 'Conduit de acero esmaltado 3/4\" longitud 3 metros', 'electricidad', 22000.00, 22, 5, 1, NULL),
(41, 'EL-008', 'Multímetro Digital DT830', 'Multímetro digital VCA/VCC/Amperios/Ohms DT830B', 'electricidad', 45000.00, 11, 2, 1, NULL),
(42, 'PA-001', 'Pintura Vinilo Interior 1GL', 'Pintura vinilo interior acabado mate lavable, galón', 'pintura', 58000.00, 24, 5, 1, NULL),
(43, 'PA-002', 'Pintura Vinilo Exterior 1GL', 'Pintura vinilo exterior resistente a la intemperie, galón', 'pintura', 72000.00, 22, 5, 1, NULL),
(44, 'PA-003', 'Rodillo de Felpa 9\" con Marco', 'Rodillo de felpa corta 9\" con marco metálico', 'pintura', 18000.00, 17, 4, 1, NULL),
(45, 'PA-004', 'Brocha Cerda Natural 3\"', 'Brocha cerda natural 3\" para esmalte y pintura base aceite', 'pintura', 12000.00, 28, 5, 1, NULL),
(46, 'PA-005', 'Masilla Multipropósito 4kg', 'Masilla lista para usar en paredes y cielos rasos, balde 4kg', 'pintura', 32000.00, 18, 4, 1, NULL),
(47, 'PA-006', 'Lija Grano 80 x5 hojas', 'Lija abrasiva papel grano 80, presentación x5 hojas', 'pintura', 7500.00, 36, 8, 1, NULL),
(48, 'PA-007', 'Sellador Acrílico Blanco 300ml', 'Sellador acrílico blanco para juntas interiores, cartucho', 'pintura', 15000.00, 22, 5, 1, NULL),
(49, 'SI-001', 'Casco Seguridad Tipo I Blanco', 'Casco de seguridad Tipo I ABS blanco con ajuste deslizante', 'seguridad', 28000.00, 15, 4, 1, NULL),
(50, 'SI-002', 'Gafas de Seguridad Clara', 'Gafas de seguridad policarbonato clara antiempañante ANSI', 'seguridad', 12000.00, 28, 5, 1, NULL);

--
-- Disparadores `productos`
--
DROP TRIGGER IF EXISTS `trg_alerta_stock_bajo_insert`;
DELIMITER $$
CREATE TRIGGER `trg_alerta_stock_bajo_insert` AFTER INSERT ON `productos` FOR EACH ROW BEGIN
    IF NEW.activo = 1 AND NEW.stock_actual < NEW.stock_minimo THEN
        INSERT INTO logs (id_usuario, accion, tabla_afectada, id_registro, detalle, ip_origen)
        SELECT NULL,
               'ALERTA_STOCK_BAJO',
               'productos',
               NEW.id,
               JSON_OBJECT(
                   'nombre', NEW.nombre,
                   'stock_actual', NEW.stock_actual,
                   'stock_minimo', NEW.stock_minimo,
                   'color', 'rojo',
                   'accion_sugerida', 'Reabastecer producto'
               ),
               NULL
        WHERE NOT EXISTS (
            SELECT 1
            FROM logs l
            WHERE l.accion = 'ALERTA_STOCK_BAJO'
              AND l.id_registro = NEW.id
              AND DATE(l.fecha) = CURDATE()
        );
    END IF;
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `trg_alerta_stock_bajo_update`;
DELIMITER $$
CREATE TRIGGER `trg_alerta_stock_bajo_update` AFTER UPDATE ON `productos` FOR EACH ROW BEGIN
    IF NEW.activo = 1
       AND NEW.stock_actual < NEW.stock_minimo
       AND (
            OLD.stock_actual >= OLD.stock_minimo
            OR OLD.stock_minimo <> NEW.stock_minimo
            OR OLD.activo <> NEW.activo
       ) THEN
        INSERT INTO logs (id_usuario, accion, tabla_afectada, id_registro, detalle, ip_origen)
        SELECT NULL,
               'ALERTA_STOCK_BAJO',
               'productos',
               NEW.id,
               JSON_OBJECT(
                   'nombre', NEW.nombre,
                   'stock_actual', NEW.stock_actual,
                   'stock_minimo', NEW.stock_minimo,
                   'color', 'rojo',
                   'accion_sugerida', 'Reabastecer producto'
               ),
               NULL
        WHERE NOT EXISTS (
            SELECT 1
            FROM logs l
            WHERE l.accion = 'ALERTA_STOCK_BAJO'
              AND l.id_registro = NEW.id
              AND DATE(l.fecha) = CURDATE()
        );
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `contrasena_hash` varchar(255) NOT NULL,
  `rol` enum('admin','empleado','cliente') NOT NULL DEFAULT 'cliente',
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_usuarios_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `email`, `contrasena_hash`, `rol`, `fecha_creacion`, `activo`) VALUES
(1, 'Carlos Ramírez', 'admin@jamarraya.com', '$2y$10$T9NsvwHbWXyDqaEVuY0/4.pNu4dxvCR5QP67UOZeUrfmxRUhzp72S', 'admin', '2025-01-10 08:00:00', 1),
(2, 'Luisa Fernández', 'luisa.fernandez@jamarraya.com', '$2y$10$T9NsvwHbWXyDqaEVuY0/4.pNu4dxvCR5QP67UOZeUrfmxRUhzp72S', 'admin', '2025-01-10 08:05:00', 1),
(3, 'Andrés Herrera', 'empleado@jamarraya.com', '$2y$10$9OT8UgjG4Q.GMDtEdp4ES.g0SEY8BC1F2iVZ7Jtzau9XaBeGAOC5u', 'empleado', '2025-02-03 09:00:00', 1),
(4, 'Marcela Torres', 'marcela.torres@jamarraya.com', '$2y$10$9OT8UgjG4Q.GMDtEdp4ES.g0SEY8BC1F2iVZ7Jtzau9XaBeGAOC5u', 'empleado', '2025-02-10 09:00:00', 1),
(5, 'Felipe Osorio', 'felipe.osorio@jamarraya.com', '$2y$10$9OT8UgjG4Q.GMDtEdp4ES.g0SEY8BC1F2iVZ7Jtzau9XaBeGAOC5u', 'empleado', '2025-03-01 09:00:00', 1),
(6, 'Valentina Ríos', 'valentina.rios@jamarraya.com', '$2y$10$9OT8UgjG4Q.GMDtEdp4ES.g0SEY8BC1F2iVZ7Jtzau9XaBeGAOC5u', 'empleado', '2025-03-15 09:00:00', 1),
(7, 'Jorge Salcedo', 'jorge.salcedo@jamarraya.com', '$2y$10$9OT8UgjG4Q.GMDtEdp4ES.g0SEY8BC1F2iVZ7Jtzau9XaBeGAOC5u', 'empleado', '2025-04-01 09:00:00', 1),
(8, 'Diana Muñoz', 'diana.munoz@jamarraya.com', '$2y$10$9OT8UgjG4Q.GMDtEdp4ES.g0SEY8BC1F2iVZ7Jtzau9XaBeGAOC5u', 'empleado', '2025-04-20 09:00:00', 1),
(9, 'Pedro Gómez', 'cliente@gmail.com', '$2y$10$IBN8zrQqH9eXXcFWyIVqj.m9x36sASXxmGqGAKEpJgZTG6Aloewii', 'cliente', '2025-05-05 10:00:00', 1),
(10, 'Ana Morales', 'ana.morales@gmail.com', '$2y$10$IBN8zrQqH9eXXcFWyIVqj.m9x36sASXxmGqGAKEpJgZTG6Aloewii', 'cliente', '2025-05-12 10:00:00', 1),
(11, 'Ricardo Zapata', 'ricardo.zapata@gmail.com', '$2y$10$IBN8zrQqH9eXXcFWyIVqj.m9x36sASXxmGqGAKEpJgZTG6Aloewii', 'cliente', '2025-06-01 10:00:00', 1),
(12, 'Sofía Castillo', 'sofia.castillo@gmail.com', '$2y$10$IBN8zrQqH9eXXcFWyIVqj.m9x36sASXxmGqGAKEpJgZTG6Aloewii', 'cliente', '2025-06-18 10:00:00', 1),
(13, 'Hernán Vargas', 'hernan.vargas@gmail.com', '$2y$10$IBN8zrQqH9eXXcFWyIVqj.m9x36sASXxmGqGAKEpJgZTG6Aloewii', 'cliente', '2025-07-03 10:00:00', 1),
(14, 'Camila Restrepo', 'camila.restrepo@gmail.com', '$2y$10$IBN8zrQqH9eXXcFWyIVqj.m9x36sASXxmGqGAKEpJgZTG6Aloewii', 'cliente', '2025-07-22 10:00:00', 1),
(15, 'Luis Arango', 'luis.arango@gmail.com', '$2y$10$IBN8zrQqH9eXXcFWyIVqj.m9x36sASXxmGqGAKEpJgZTG6Aloewii', 'cliente', '2025-08-08 10:00:00', 1),
(16, 'Natalia Patiño', 'natalia.patino@gmail.com', '$2y$10$IBN8zrQqH9eXXcFWyIVqj.m9x36sASXxmGqGAKEpJgZTG6Aloewii', 'cliente', '2025-08-30 10:00:00', 1),
(17, 'Sebastián Cano', 'sebastian.cano@gmail.com', '$2y$10$IBN8zrQqH9eXXcFWyIVqj.m9x36sASXxmGqGAKEpJgZTG6Aloewii', 'cliente', '2025-09-15 10:00:00', 1),
(18, 'Juliana Mejía', 'juliana.mejia@gmail.com', '$2y$10$IBN8zrQqH9eXXcFWyIVqj.m9x36sASXxmGqGAKEpJgZTG6Aloewii', 'cliente', '2025-10-01 10:00:00', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

DROP TABLE IF EXISTS `ventas`;
CREATE TABLE IF NOT EXISTS `ventas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_cliente` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `total` decimal(12,2) NOT NULL DEFAULT 0.00 CHECK (`total` >= 0),
  `comprobante` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ventas_comprobante` (`comprobante`),
  KEY `fk_ventas_usuario` (`id_usuario`),
  KEY `idx_ventas_fecha` (`fecha`),
  KEY `idx_ventas_cliente` (`id_cliente`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `ventas`
--

INSERT INTO `ventas` (`id`, `id_cliente`, `id_usuario`, `fecha`, `total`, `comprobante`) VALUES
(1, 1, 3, '2026-01-12 10:15:00', 307000.00, 'VTA-20260112-001'),
(2, 2, 4, '2026-01-18 11:30:00', 177000.00, 'VTA-20260118-002'),
(3, 3, 3, '2026-01-25 09:45:00', 89500.00, 'VTA-20260125-003'),
(4, 4, 5, '2026-02-03 14:00:00', 158000.00, 'VTA-20260203-004'),
(5, 5, 6, '2026-02-10 10:30:00', 185000.00, 'VTA-20260210-005'),
(6, 1, 3, '2026-02-17 16:00:00', 201000.00, 'VTA-20260217-006'),
(7, 6, 7, '2026-02-24 11:00:00', 102000.00, 'VTA-20260224-007'),
(8, 7, 4, '2026-03-03 09:30:00', 98000.00, 'VTA-20260303-008'),
(9, 8, 5, '2026-03-10 13:15:00', 127000.00, 'VTA-20260310-009'),
(10, 9, 8, '2026-03-15 10:00:00', 190000.00, 'VTA-20260315-010'),
(11, 10, 6, '2026-03-20 11:45:00', 310000.00, 'VTA-20260320-011'),
(12, 2, 3, '2026-03-25 09:00:00', 345000.00, 'VTA-20260325-012'),
(13, 3, 7, '2026-03-28 14:30:00', 244000.00, 'VTA-20260328-013'),
(14, 4, 4, '2026-04-02 10:00:00', 168000.00, 'VTA-20260402-014'),
(15, 5, 5, '2026-04-05 15:00:00', 174000.00, 'VTA-20260405-015'),
(16, 6, 8, '2026-04-08 11:30:00', 134000.00, 'VTA-20260408-016'),
(17, 7, 3, '2026-04-12 09:15:00', 313000.00, 'VTA-20260412-017'),
(18, 8, 6, '2026-04-16 13:00:00', 132000.00, 'VTA-20260416-018'),
(19, 9, 7, '2026-04-20 10:45:00', 204000.00, 'VTA-20260420-019'),
(20, 10, 4, '2026-04-22 16:30:00', 470000.00, 'VTA-20260422-020'),
(21, 5, 1, '2026-04-24 16:57:24', 30000.00, 'VTA-20260424-11062'),
(22, 1, 9, '2026-04-25 15:45:59', 9000.00, 'VTA-20260425-F0895'),
(23, 1, 9, '2026-04-25 15:46:33', 9000.00, 'VTA-20260425-C6F5A'),
(24, 1, 9, '2026-04-25 15:47:57', 9000.00, 'VTA-20260425-2FDB0');

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `alquileres`
--
ALTER TABLE `alquileres`
  ADD CONSTRAINT `fk_alquileres_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_alquileres_maquinaria` FOREIGN KEY (`id_maquinaria`) REFERENCES `maquinaria` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_alquileres_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD CONSTRAINT `fk_clientes_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `detalle_venta`
--
ALTER TABLE `detalle_venta`
  ADD CONSTRAINT `fk_detalle_venta_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_detalle_venta_venta` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `logs`
--
ALTER TABLE `logs`
  ADD CONSTRAINT `fk_logs_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD CONSTRAINT `fk_ventas_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ventas_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE;

DELIMITER $$
--
-- Eventos
--
DROP EVENT IF EXISTS `ev_actualizar_alquileres_vencidos`$$
CREATE DEFINER=`root`@`localhost` EVENT `ev_actualizar_alquileres_vencidos` ON SCHEDULE EVERY 1 MINUTE STARTS '2026-04-25 15:58:06' ON COMPLETION NOT PRESERVE ENABLE DO BEGIN
    UPDATE alquileres
    SET estado = 'vencido'
    WHERE estado = 'activo'
      AND fecha_fin < CURDATE();
END$$

DROP EVENT IF EXISTS `ev_generar_alertas_dashboard`$$
CREATE DEFINER=`root`@`localhost` EVENT `ev_generar_alertas_dashboard` ON SCHEDULE EVERY 1 MINUTE STARTS '2026-04-25 15:58:06' ON COMPLETION NOT PRESERVE ENABLE DO BEGIN
    INSERT INTO logs (id_usuario, accion, tabla_afectada, id_registro, detalle, ip_origen)
    SELECT NULL,
           'ALERTA_STOCK_BAJO',
           'productos',
           p.id,
           JSON_OBJECT(
               'nombre', p.nombre,
               'stock_actual', p.stock_actual,
               'stock_minimo', p.stock_minimo,
               'color', 'rojo',
               'accion_sugerida', 'Reabastecer producto'
           ),
           NULL
    FROM productos p
    WHERE p.activo = 1
      AND p.stock_actual < p.stock_minimo
      AND NOT EXISTS (
          SELECT 1
          FROM logs l
          WHERE l.accion = 'ALERTA_STOCK_BAJO'
            AND l.id_registro = p.id
            AND DATE(l.fecha) = CURDATE()
      );

    INSERT INTO logs (id_usuario, accion, tabla_afectada, id_registro, detalle, ip_origen)
    SELECT NULL,
           'ALERTA_ALQUILER_POR_VENCER',
           'alquileres',
           a.id,
           JSON_OBJECT(
               'cliente', c.nombre,
               'maquinaria', m.nombre,
               'fecha_fin', a.fecha_fin,
               'color', 'amarillo',
               'accion_sugerida', 'Contactar cliente para devolucion'
           ),
           NULL
    FROM alquileres a
    INNER JOIN clientes c ON c.id = a.id_cliente
    INNER JOIN maquinaria m ON m.id = a.id_maquinaria
    WHERE a.estado = 'activo'
      AND DATEDIFF(a.fecha_fin, CURDATE()) BETWEEN 0 AND 2
      AND NOT EXISTS (
          SELECT 1
          FROM logs l
          WHERE l.accion = 'ALERTA_ALQUILER_POR_VENCER'
            AND l.id_registro = a.id
            AND DATE(l.fecha) = CURDATE()
      );

    INSERT INTO logs (id_usuario, accion, tabla_afectada, id_registro, detalle, ip_origen)
    SELECT NULL,
           'ALERTA_ALQUILER_VENCIDO',
           'alquileres',
           a.id,
           JSON_OBJECT(
               'cliente', c.nombre,
               'maquinaria', m.nombre,
               'fecha_fin', a.fecha_fin,
               'color', 'rojo',
               'accion_sugerida', 'Alquiler vencido - Contactar urgente'
           ),
           NULL
    FROM alquileres a
    INNER JOIN clientes c ON c.id = a.id_cliente
    INNER JOIN maquinaria m ON m.id = a.id_maquinaria
    WHERE a.estado = 'vencido'
      AND NOT EXISTS (
          SELECT 1
          FROM logs l
          WHERE l.accion = 'ALERTA_ALQUILER_VENCIDO'
            AND l.id_registro = a.id
            AND DATE(l.fecha) = CURDATE()
      );
END$$

DELIMITER ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
