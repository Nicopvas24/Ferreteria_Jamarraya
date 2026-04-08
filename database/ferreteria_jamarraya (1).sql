-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 07-04-2026 a las 00:55:37
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

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alquileres`
--

CREATE TABLE `alquileres` (
  `id` int(11) NOT NULL,
  `id_cliente` int(11) NOT NULL,
  `id_maquinaria` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `monto` decimal(10,2) NOT NULL CHECK (`monto` >= 0),
  `estado` enum('activo','finalizado','vencido') NOT NULL DEFAULT 'activo',
  `fecha_registro` datetime NOT NULL DEFAULT current_timestamp()
) ;

--
-- Disparadores `alquileres`
--
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

CREATE TABLE `clientes` (
  `id` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `identificacion` varchar(20) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_venta`
--

CREATE TABLE `detalle_venta` (
  `id` int(11) NOT NULL,
  `id_venta` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL CHECK (`cantidad` > 0),
  `precio_unitario` decimal(10,2) NOT NULL CHECK (`precio_unitario` >= 0),
  `subtotal` decimal(12,2) NOT NULL CHECK (`subtotal` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Disparadores `detalle_venta`
--
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
DELIMITER $$
CREATE TRIGGER `trg_calcular_subtotal` BEFORE INSERT ON `detalle_venta` FOR EACH ROW BEGIN
    SET NEW.subtotal = NEW.cantidad * NEW.precio_unitario;
END
$$
DELIMITER ;
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

CREATE TABLE `logs` (
  `id` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `accion` varchar(100) NOT NULL,
  `tabla_afectada` varchar(50) DEFAULT NULL,
  `id_registro` int(11) DEFAULT NULL,
  `detalle` text DEFAULT NULL,
  `ip_origen` varchar(45) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `maquinaria`
--

CREATE TABLE `maquinaria` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `estado` enum('disponible','alquilada','mantenimiento') NOT NULL DEFAULT 'disponible',
  `tarifa_alquiler` decimal(10,2) NOT NULL CHECK (`tarifa_alquiler` >= 0),
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id` int(11) NOT NULL,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `categoria` varchar(80) NOT NULL,
  `precio` decimal(10,2) NOT NULL CHECK (`precio` >= 0),
  `stock_actual` int(11) NOT NULL DEFAULT 0 CHECK (`stock_actual` >= 0),
  `stock_minimo` int(11) NOT NULL DEFAULT 0 CHECK (`stock_minimo` >= 0),
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `img` varchar(150) DEFAULT 'nombreimagen.png'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `codigo`, `nombre`, `descripcion`, `categoria`, `precio`, `stock_actual`, `stock_minimo`, `activo`, `img`) VALUES
(2007, '1010', 'TALADRO ', 'TALADRA INALAMBRICO 20 wats', 'herramientas-electricas', 400000.00, 5, 1, 1, 'Taladro.png'),
(2008, '1011', 'MANGUERA', 'MANGUERA AGUA 3 METROS', 'fontaneria', 80000.00, 30, 2, 1, 'manguera.png'),
(2009, '1012', 'Puntillas', 'Puntilla 1/2', 'Electricidad', 5000.00, 12, 1, 1, 'puntilla.png');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `contrasena_hash` varchar(255) NOT NULL,
  `rol` enum('admin','empleado','cliente') NOT NULL DEFAULT 'cliente',
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `email`, `contrasena_hash`, `rol`, `fecha_creacion`, `activo`) VALUES
(1, 'Administrador', 'admin@jamarraya.com', '$2y$10$COjYgEh85KJy9XEcmn7cmOjAPtTmbuqqKKyjZQpxM0F/07AxctXuu', 'admin', '2026-03-31 09:49:50', 1),
(2, 'poka1234', 'poka@jamarraya.com', '1234', 'admin', '2026-03-31 11:25:43', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

CREATE TABLE `ventas` (
  `id` int(11) NOT NULL,
  `id_cliente` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `total` decimal(12,2) NOT NULL DEFAULT 0.00 CHECK (`total` >= 0),
  `comprobante` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `alquileres`
--
ALTER TABLE `alquileres`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_alquileres_maquinaria` (`id_maquinaria`),
  ADD KEY `fk_alquileres_usuario` (`id_usuario`),
  ADD KEY `idx_alquileres_estado` (`estado`),
  ADD KEY `idx_alquileres_fecha_fin` (`fecha_fin`),
  ADD KEY `idx_alquileres_cliente` (`id_cliente`);

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_clientes_identificacion` (`identificacion`),
  ADD KEY `fk_clientes_usuario` (`id_usuario`);

--
-- Indices de la tabla `detalle_venta`
--
ALTER TABLE `detalle_venta`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_detalle_venta_venta` (`id_venta`),
  ADD KEY `fk_detalle_venta_producto` (`id_producto`);

--
-- Indices de la tabla `logs`
--
ALTER TABLE `logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_logs_usuario_fecha` (`id_usuario`,`fecha`);

--
-- Indices de la tabla `maquinaria`
--
ALTER TABLE `maquinaria`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_productos_codigo` (`codigo`),
  ADD KEY `idx_productos_stock` (`stock_actual`,`stock_minimo`),
  ADD KEY `idx_productos_categoria` (`categoria`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_usuarios_email` (`email`);

--
-- Indices de la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_ventas_comprobante` (`comprobante`),
  ADD KEY `fk_ventas_usuario` (`id_usuario`),
  ADD KEY `idx_ventas_fecha` (`fecha`),
  ADD KEY `idx_ventas_cliente` (`id_cliente`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `alquileres`
--
ALTER TABLE `alquileres`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `detalle_venta`
--
ALTER TABLE `detalle_venta`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `logs`
--
ALTER TABLE `logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `maquinaria`
--
ALTER TABLE `maquinaria`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2010;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

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
