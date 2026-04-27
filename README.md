# 🛠️ Ferretería Jamarraya

Sistema integral web para la gestión comercial y operativa de la **Ferretería Jamarraya**. Esta plataforma unifica el modelo de ventas de productos de ferretería tradicional con el servicio de alquiler de maquinaria pesada, proporcionando una solución completa tanto para los clientes como para la administración del negocio.

## 🚀 Características Principales

*   **🛒 Carrito de Compras Unificado:** Permite a los clientes agregar tanto productos para comprar como maquinaria para alquilar en un mismo carrito global, optimizando la experiencia de usuario y el checkout.
*   **🎨 Diseño Premium UI/UX:** Interfaz moderna (Glassmorphism), tema oscuro tipo industrial, uso de modales interactivos y notificaciones en tiempo real.
*   **📦 Gestión de Inventario Automatizada:** El sistema descuenta el stock en tiempo real asegurando la exactitud de los datos.
*   **🚜 Ciclo de Vida de Alquileres:** Control total sobre el estado de la maquinaria (disponible, alquilada, finalizada) y auditoría de fechas y devoluciones.
*   **🔔 Sistema de Alertas Administrativas:** Notificaciones en el panel (Dashboard) para los empleados sobre stock bajo de mercancía y alquileres vencidos.

## 🏗️ Arquitectura y Tecnologías

El proyecto sigue una arquitectura **Cliente-Servidor** separando lógicamente las vistas de la lógica de negocio:

*   **Frontend (Vista Cliente):** HTML5, CSS3 puro (estilos modulares) y JavaScript Vanilla. Gestión de estado del carrito usando `localStorage` y consumo asíncrono de datos mediante `fetch()`. No requiere procesos de compilación (build steps).
*   **Backend (Servidor/API):** PHP 8+ estructurado en endpoints (`backend/api/`). Centraliza la lógica recibiendo solicitudes y entregando respuestas en formato **JSON**.
*   **Base de Datos:** MySQL relacional.
*   **Seguridad:** Conexiones seguras a la base de datos utilizando **PDO (PHP Data Objects)** (`conexion.php`) para prevenir vulnerabilidades como la Inyección SQL.

## ⚡ Base de Datos y Automatización (Triggers)

El corazón de la fiabilidad del sistema radica en el motor de la base de datos. Se implementaron **Triggers (Disparadores)** en MySQL para delegar reglas de negocio críticas y asegurar la integridad de las transacciones, incluso ante problemas de concurrencia:

*   **Módulo de Inventario y Ventas:**
    *   `trg_calcular_subtotal`: Calcula automáticamente el importe de línea (cantidad x precio_unitario).
    *   `trg_actualizar_total_venta`: Totaliza la venta de forma automática.
    *   `trg_descontar_stock`: Deduce del inventario la cantidad comprada al momento exacto del registro.
*   **Sistema de Logs y Alertas:**
    *   `trg_alerta_stock_bajo_insert / update`: Registra un aviso en la tabla de `logs` si, tras una venta, el inventario físico cae por debajo del límite mínimo.
*   **Módulo de Maquinaria y Alquileres:**
    *   `trg_maquinaria_alquilada` y `trg_maquinaria_devuelta`: Bloquean y liberan dinámicamente la maquinaria según inicie o termine su alquiler.
    *   `trg_alquiler_estado_vencido_insert / update`: Marca de forma automática si un contrato superó su fecha límite.

## ⚙️ Instalación y Entorno de Desarrollo Local

1.  **Requisitos Previos:**
    *   Servidor web Apache y motor de base de datos MySQL (Se recomienda [XAMPP](https://www.apachefriends.org/es/index.html) o similar).
    *   PHP versión 8.0+.
2.  **Puesta en marcha:**
    *   Clona este repositorio o ubica la carpeta `Ferreteria_Jamarraya` dentro del directorio público del servidor (`htdocs` en XAMPP).
    *   Abre el gestor de base de datos (ej: `http://localhost/phpmyadmin`) y crea una base de datos nueva nombrada **`ferreteria_jamarraya`**.
    *   Importa el archivo **`database/ferreteria_jamarraya.sql`** en dicha base de datos. Esto creará la estructura, relaciones y triggers.
    *   Inicia los servicios de Apache y MySQL.
    *   Accede al proyecto a través de tu navegador en: `http://localhost/Ferreteria_Jamarraya`.
