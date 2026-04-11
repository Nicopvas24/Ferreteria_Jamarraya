-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 11-04-2026 a las 05:34:41
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Disparadores `alquileres`
--
DROP TRIGGER IF EXISTS `trg_maquinaria_alquilada`;
DELIMITER $$
CREATE TRIGGER `trg_maquinaria_alquilada` AFTER INSERT ON `alquileres` FOR EACH ROW BEGIN
    IF NEW.estado = 'activo' THEN
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
    IF NEW.estado IN ('finalizado', 'vencido') AND OLD.estado = 'activo' THEN
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id`, `id_usuario`, `nombre`, `identificacion`, `telefono`, `email`, `direccion`) VALUES
(1, NULL, 'Juan Jose', '34555', '3137287531', 'j.gomez14@gmail.com', 'La vitgin'),
(2, NULL, 'roche', '123', '3137287531', 'd.rivas@gmail.com', 'cll 20 31 B 41'),
(3, NULL, 'roche', '123455', '-43137287531', 'd.1rivas@gmail.com', '44'),
(4, 7, 'Jose', '5544112', '3137287531', 'jose@gmail.com', 'cll 20 31 B 41'),
(5, NULL, 'pepe', '123432', '1234', 'pep@gmail.com', 'cll 20 31 B 41'),
(6, 8, 'pepe', '5111', '+573017213193', 'pepe@gmail.com', 'cll 20 31 B 41'),
(7, NULL, 'eeee', 'sdd', '4444', 'ee@gmail.com', '444');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  `precio` decimal(10,2) NOT NULL CHECK (`precio` >= 0),
  `stock_actual` int(11) NOT NULL DEFAULT 0 CHECK (`stock_actual` >= 0),
  `stock_minimo` int(11) NOT NULL DEFAULT 0 CHECK (`stock_minimo` >= 0),
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `img` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_productos_codigo` (`codigo`),
  KEY `idx_productos_stock` (`stock_actual`,`stock_minimo`),
  KEY `idx_productos_categoria` (`categoria`)
) ENGINE=InnoDB AUTO_INCREMENT=2014 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `codigo`, `nombre`, `descripcion`, `categoria`, `precio`, `stock_actual`, `stock_minimo`, `activo`, `img`) VALUES
(2007, '1010', 'TALADRO', 'TALADRA INALAMBRICO 20 wats', 'herramientas_electricas', 500000.00, 10, 3, 1, 'Taladro.png'),
(2008, '1011', 'MANGUERA', 'MANGUERA AGUA 3 METROS', 'fontaneria', 80000.00, 30, 2, 1, 'manguera.png'),
(2009, '1012', 'Caja de Puntillas', 'Puntilla 1/2', 'materiales', 5500.00, 12, 5, 1, 'puntilla.png'),
(2010, '2007', 'Cable cobre 1/2\'', '11', 'electricidad', 10000.00, 5, 1, 1, 'prod_1775875932_69d9b75ca1500.png'),
(2011, '2008', 'Cable cobre 1/2\'', 'jeje', 'pintura', 10000.00, 1, 5, 1, 'prod_1775875284_69d9b4d4d8a4a.png'),
(2012, '2009', 'Cinta 100 m', 'Cinta muy buena', 'herramientas_manuales', 500000.00, 5, 1, 1, 'prod_1775793145_69d873f9efc2b.png'),
(2013, '2040', 'Pulidora', 'pule madera y mucho más', 'herramientas_electricas', 500000.00, 5, 2, 1, 'prod_1775850330_69d9535a2c224.png');

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
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `email`, `contrasena_hash`, `rol`, `fecha_creacion`, `activo`) VALUES
(1, 'Administrador', 'admin@jamarraya.com', '$2y$10$COjYgEh85KJy9XEcmn7cmOjAPtTmbuqqKKyjZQpxM0F/07AxctXuu', 'admin', '2026-03-31 09:49:50', 1),
(2, 'poka1234', 'poka@jamarraya.com', '1234', 'admin', '2026-03-31 11:25:43', 1),
(3, 'Juan', 'd.rivas@gmail.com', '$2y$10$vuet6ImcjOiMsmCHURVkuO2U9RpUsY2xtnZudcJdyEZ5JMSrhZPSa', 'empleado', '2026-04-07 15:27:41', 1),
(4, 'nico valencia', 'nico@jamarraya.com', '$2y$10$bKc/sHBlZSkVQV6jYwd0GO3Dz0QqDKhu6t/fs.P9TaicGYRyFaeNq', 'cliente', '2026-04-07 15:28:47', 1),
(5, 'nico', 'n@gmail.com', '$2y$10$pZ0NvKtHodFdym2CvH4PluD5VKOmapD7nvZ5vPwVF5ZCoidWIVje2', 'admin', '2026-04-07 15:34:20', 1),
(6, 'Marta', 'marta@gmail.com', '$2y$10$Ka2cfqGfULHKTHf9mcjRguoEQS6lwvLAtEuPRuAoBTuQ/nOnY3Eei', 'cliente', '2026-04-08 00:03:59', 1),
(7, 'Jose', 'jose@gmail.com', '$2y$10$cr5RaF6.vDmhYao5DLB.LOnzgO7UaM0tdNAUBZWrvVMuzlxSq/516', 'cliente', '2026-04-08 00:11:09', 1),
(8, 'pepe', 'pepe@gmail.com', '$2y$10$hMmKD2RO7/NdnSrTFFfMJOEioIPyCxOrkDtpBY546IPN09AY/cbAK', 'cliente', '2026-04-08 20:41:53', 1),
(9, 'll', 'dd@gmail.com', '$2y$10$8tyoSXpAuqVBSPVTwoD6ie2DnurLLTfviz0xk5VOorgFSurNJ6GY.', 'empleado', '2026-04-08 20:55:48', 1),
(10, 'q', 'qqq@sss.com', '$2y$10$gRF0qdy2eITU86eMp8zmD.UIPRiXQwYdF7O5iAatTOm5VwolPkcea', 'cliente', '2026-04-08 21:48:53', 1);

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
