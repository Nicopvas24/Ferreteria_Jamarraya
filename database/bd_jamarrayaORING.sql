-- ============================================================
--  Base de datos: Ferreteria Jamarraya
--  Motor: MySQL 8.0+ / InnoDB
--  Autores: Juan Manuel Aguelo Cardona
--           Nicolas Estiven Valencia Ascencio
--  Fecha: 2026
-- ============================================================
 
CREATE DATABASE IF NOT EXISTS ferreteria_jamarraya
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
 
USE ferreteria_jamarraya;
 
-- ============================================================
--  TABLA: USUARIOS
--  Cuentas del sistema con rol asignado.
--  Las contrasenas se almacenan como hash bcrypt (nunca texto plano).
-- ============================================================
CREATE TABLE usuarios (
    id              INT             NOT NULL AUTO_INCREMENT,
    nombre          VARCHAR(100)    NOT NULL,
    email           VARCHAR(150)    NOT NULL,
    contrasena_hash VARCHAR(255)    NOT NULL,
    rol             ENUM('admin', 'empleado', 'cliente') NOT NULL DEFAULT 'cliente',
    fecha_creacion  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo          TINYINT(1)      NOT NULL DEFAULT 1,
 
    CONSTRAINT pk_usuarios PRIMARY KEY (id),
    CONSTRAINT uq_usuarios_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 
 
-- ============================================================
--  TABLA: CLIENTES
--  Perfil de negocio del cliente (puede o no tener cuenta de usuario).
--  id_usuario es nullable: clientes de mostrador no necesitan cuenta.
-- ============================================================
CREATE TABLE clientes (
    id              INT             NOT NULL AUTO_INCREMENT,
    id_usuario      INT             NULL,
    nombre          VARCHAR(100)    NOT NULL,
    identificacion  VARCHAR(20)     NOT NULL,
    telefono        VARCHAR(20)     NULL,
    email           VARCHAR(150)    NULL,
    direccion       VARCHAR(255)    NULL,
 
    CONSTRAINT pk_clientes PRIMARY KEY (id),
    CONSTRAINT uq_clientes_identificacion UNIQUE (identificacion),
    CONSTRAINT fk_clientes_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 
 
-- ============================================================
--  TABLA: PRODUCTOS
--  Inventario de productos disponibles para venta.
-- ============================================================
CREATE TABLE productos (
    id              INT             NOT NULL AUTO_INCREMENT,
    codigo          VARCHAR(50)     NOT NULL,
    nombre          VARCHAR(150)    NOT NULL,
    descripcion     TEXT            NULL,
    categoria       VARCHAR(80)     NOT NULL,
    precio          DECIMAL(10,2)   NOT NULL CHECK (precio >= 0),
    stock_actual    INT             NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo    INT             NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    activo          TINYINT(1)      NOT NULL DEFAULT 1,
 
    CONSTRAINT pk_productos PRIMARY KEY (id),
    CONSTRAINT uq_productos_codigo UNIQUE (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 
 
-- ============================================================
--  TABLA: MAQUINARIA
--  Equipos disponibles para alquiler.
-- ============================================================
CREATE TABLE maquinaria (
    id              INT             NOT NULL AUTO_INCREMENT,
    nombre          VARCHAR(100)    NOT NULL,
    descripcion     TEXT            NULL,
    estado          ENUM('disponible', 'alquilada', 'mantenimiento') NOT NULL DEFAULT 'disponible',
    tarifa_alquiler DECIMAL(10,2)   NOT NULL CHECK (tarifa_alquiler >= 0),
    activo          TINYINT(1)      NOT NULL DEFAULT 1,
 
    CONSTRAINT pk_maquinaria PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 
 
-- ============================================================
--  TABLA: VENTAS
--  Cabecera de cada transaccion de venta.
-- ============================================================
CREATE TABLE ventas (
    id              INT             NOT NULL AUTO_INCREMENT,
    id_cliente      INT             NOT NULL,
    id_usuario      INT             NOT NULL,
    fecha           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total           DECIMAL(12,2)   NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    comprobante     VARCHAR(50)     NOT NULL,
 
    CONSTRAINT pk_ventas PRIMARY KEY (id),
    CONSTRAINT uq_ventas_comprobante UNIQUE (comprobante),
    CONSTRAINT fk_ventas_cliente
        FOREIGN KEY (id_cliente) REFERENCES clientes(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_ventas_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 
 
-- ============================================================
--  TABLA: DETALLE_VENTA
--  Lineas de producto de cada venta.
--  precio_unitario se almacena para preservar el precio historico.
-- ============================================================
CREATE TABLE detalle_venta (
    id                  INT             NOT NULL AUTO_INCREMENT,
    id_venta            INT             NOT NULL,
    id_producto         INT             NOT NULL,
    cantidad            INT             NOT NULL CHECK (cantidad > 0),
    precio_unitario     DECIMAL(10,2)   NOT NULL CHECK (precio_unitario >= 0),
    subtotal            DECIMAL(12,2)   NOT NULL CHECK (subtotal >= 0),
 
    CONSTRAINT pk_detalle_venta PRIMARY KEY (id),
    CONSTRAINT fk_detalle_venta_venta
        FOREIGN KEY (id_venta) REFERENCES ventas(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_detalle_venta_producto
        FOREIGN KEY (id_producto) REFERENCES productos(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 
 
-- ============================================================
--  TABLA: ALQUILERES
--  Registro de alquileres de maquinaria.
-- ============================================================
CREATE TABLE alquileres (
    id              INT             NOT NULL AUTO_INCREMENT,
    id_cliente      INT             NOT NULL,
    id_maquinaria   INT             NOT NULL,
    id_usuario      INT             NOT NULL,
    fecha_inicio    DATE            NOT NULL,
    fecha_fin       DATE            NOT NULL,
    monto           DECIMAL(10,2)   NOT NULL CHECK (monto >= 0),
    estado          ENUM('activo', 'finalizado', 'vencido') NOT NULL DEFAULT 'activo',
    fecha_registro  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
 
    CONSTRAINT pk_alquileres PRIMARY KEY (id),
    CONSTRAINT chk_alquileres_fechas CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT fk_alquileres_cliente
        FOREIGN KEY (id_cliente) REFERENCES clientes(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_alquileres_maquinaria
        FOREIGN KEY (id_maquinaria) REFERENCES maquinaria(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_alquileres_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 
 
-- ============================================================
--  TABLA: LOGS
--  Auditoria de acciones del sistema.
--  id_usuario nullable: permite registrar intentos de login fallidos.
-- ============================================================
CREATE TABLE logs (
    id              INT             NOT NULL AUTO_INCREMENT,
    id_usuario      INT             NULL,
    accion          VARCHAR(100)    NOT NULL,
    tabla_afectada  VARCHAR(50)     NULL,
    id_registro     INT             NULL,
    detalle         TEXT            NULL,
    ip_origen       VARCHAR(45)     NULL,
    fecha           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
 
    CONSTRAINT pk_logs PRIMARY KEY (id),
    CONSTRAINT fk_logs_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 
 
-- ============================================================
--  INDICES adicionales para optimizar consultas frecuentes
-- ============================================================
 
-- Busquedas de ventas por fecha (reportes)
CREATE INDEX idx_ventas_fecha        ON ventas(fecha);
-- Busquedas de ventas por cliente (historial)
CREATE INDEX idx_ventas_cliente      ON ventas(id_cliente);
-- Busquedas de alquileres activos y por fechas (alertas)
CREATE INDEX idx_alquileres_estado   ON alquileres(estado);
CREATE INDEX idx_alquileres_fecha_fin ON alquileres(fecha_fin);
CREATE INDEX idx_alquileres_cliente  ON alquileres(id_cliente);
-- Busquedas de productos con stock bajo (alertas inventario)
CREATE INDEX idx_productos_stock     ON productos(stock_actual, stock_minimo);
-- Busquedas de productos por categoria (reportes)
CREATE INDEX idx_productos_categoria ON productos(categoria);
-- Auditoria: buscar logs por usuario y fecha
CREATE INDEX idx_logs_usuario_fecha  ON logs(id_usuario, fecha);
 
 
-- ============================================================
--  TRIGGERS
-- ============================================================
 
DELIMITER $$
 
-- Descontar stock automaticamente al insertar un detalle de venta
CREATE TRIGGER trg_descontar_stock
AFTER INSERT ON detalle_venta
FOR EACH ROW
BEGIN
    UPDATE productos
    SET stock_actual = stock_actual - NEW.cantidad
    WHERE id = NEW.id_producto;
END$$
 
 
-- Calcular subtotal automaticamente antes de insertar detalle
CREATE TRIGGER trg_calcular_subtotal
BEFORE INSERT ON detalle_venta
FOR EACH ROW
BEGIN
    SET NEW.subtotal = NEW.cantidad * NEW.precio_unitario;
END$$
 
 
-- Actualizar total de la venta al insertar cada detalle
CREATE TRIGGER trg_actualizar_total_venta
AFTER INSERT ON detalle_venta
FOR EACH ROW
BEGIN
    UPDATE ventas
    SET total = (
        SELECT SUM(subtotal)
        FROM detalle_venta
        WHERE id_venta = NEW.id_venta
    )
    WHERE id = NEW.id_venta;
END$$
 
 
-- Cambiar estado de maquinaria a 'alquilada' al crear un alquiler activo
CREATE TRIGGER trg_maquinaria_alquilada
AFTER INSERT ON alquileres
FOR EACH ROW
BEGIN
    IF NEW.estado = 'activo' THEN
        UPDATE maquinaria
        SET estado = 'alquilada'
        WHERE id = NEW.id_maquinaria;
    END IF;
END$$
 
 
-- Devolver maquinaria a 'disponible' al finalizar un alquiler
CREATE TRIGGER trg_maquinaria_devuelta
AFTER UPDATE ON alquileres
FOR EACH ROW
BEGIN
    IF NEW.estado IN ('finalizado', 'vencido') AND OLD.estado = 'activo' THEN
        UPDATE maquinaria
        SET estado = 'disponible'
        WHERE id = NEW.id_maquinaria;
    END IF;
END$$
 
DELIMITER ;
 
 
-- ============================================================
--  DATOS INICIALES
--  Usuario administrador por defecto.
--  Contrasena: 'admin1234' hasheada con bcrypt (reemplazar en produccion).
-- ============================================================
 
INSERT INTO usuarios (nombre, email, contrasena_hash, rol)
VALUES (
    'Administrador',
    'admin@jamarraya.com',
    '$2b$12$placeholder_reemplazar_con_hash_bcrypt_real',
    'admin'
);