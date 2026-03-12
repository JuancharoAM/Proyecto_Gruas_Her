-- ============================================================================
-- Sistema Grúas Heredianas - Script de Inicialización de Base de Datos
-- ============================================================================
-- Este script crea todas las tablas necesarias para la Fase 1 del sistema.
-- Incluye: roles, usuarios, tipos de grúa, camiones y solicitudes de servicio.
-- También inserta datos semilla (roles y usuario administrador por defecto).
-- ============================================================================

-- Usar la base de datos del proyecto
-- (Se crea automáticamente en docker-compose con la variable MSSQL_DATABASE)
USE master;
GO

-- Crear la base de datos si no existe
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'gruas_heredianas')
BEGIN
    CREATE DATABASE gruas_heredianas;
END
GO

USE gruas_heredianas;
GO

-- ============================================================================
-- TABLA: roles
-- Almacena los roles del sistema. Cada usuario tiene un rol que determina
-- qué secciones y acciones puede realizar en el sistema.
-- Roles previstos: Administrador, Chofer, Logística, Técnico
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'roles')
BEGIN
    CREATE TABLE roles (
        id          INT PRIMARY KEY IDENTITY(1,1),  -- Identificador único auto-incremental
        nombre      VARCHAR(50) NOT NULL UNIQUE,     -- Nombre del rol (ej: 'Administrador')
        descripcion VARCHAR(200),                    -- Descripción de los permisos del rol
        activo      BIT DEFAULT 1,                   -- Si el rol está activo en el sistema
        fecha_creacion DATETIME DEFAULT GETDATE()    -- Fecha de creación del registro
    );
END
GO

-- ============================================================================
-- TABLA: usuarios
-- Registra a todos los usuarios que pueden acceder al sistema.
-- Cada usuario tiene credenciales de acceso y un rol asignado.
-- La contraseña se almacena como hash (bcrypt) por seguridad.
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'usuarios')
BEGIN
    CREATE TABLE usuarios (
        id              INT PRIMARY KEY IDENTITY(1,1),  -- Identificador único
        nombre          VARCHAR(100) NOT NULL,           -- Nombre completo del usuario
        email           VARCHAR(100) NOT NULL UNIQUE,    -- Correo electrónico (usado para login)
        password_hash   VARCHAR(255) NOT NULL,           -- Contraseña hasheada con bcrypt
        rol_id          INT NOT NULL,                    -- FK al rol del usuario
        activo          BIT DEFAULT 1,                   -- Si la cuenta está activa
        fecha_creacion  DATETIME DEFAULT GETDATE(),      -- Fecha de creación de la cuenta
        ultimo_acceso   DATETIME NULL,                   -- Última vez que inició sesión
        CONSTRAINT FK_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
    );
END
GO

-- ============================================================================
-- TABLA: tipos_grua
-- Catálogo de los diferentes tipos de grúa que maneja la empresa.
-- Ejemplos: Plataforma, Arrastre, Elevación.
-- Se usa para clasificar los camiones de la flota.
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tipos_grua')
BEGIN
    CREATE TABLE tipos_grua (
        id          INT PRIMARY KEY IDENTITY(1,1),  -- Identificador único
        nombre      VARCHAR(50) NOT NULL UNIQUE,     -- Nombre del tipo (ej: 'Plataforma')
        descripcion VARCHAR(200),                    -- Descripción del tipo de grúa
        activo      BIT DEFAULT 1,                   -- Si el tipo está activo
        fecha_creacion DATETIME DEFAULT GETDATE()    -- Fecha de creación
    );
END
GO

-- ============================================================================
-- TABLA: camiones
-- Registro principal de la flota de camiones/grúas de la empresa.
-- Cada camión tiene datos técnicos, estado operativo y puede tener
-- un chofer asignado de forma predeterminada.
-- Estados posibles: 'Disponible', 'En servicio', 'Mantenimiento', 'Fuera de servicio'
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'camiones')
BEGIN
    CREATE TABLE camiones (
        id                  INT PRIMARY KEY IDENTITY(1,1),  -- Identificador único
        placa               VARCHAR(20) NOT NULL UNIQUE,     -- Número de placa del vehículo
        marca               VARCHAR(50),                     -- Marca del camión (ej: 'Hino')
        modelo              VARCHAR(50),                     -- Modelo del camión
        anio                INT,                             -- Año de fabricación
        color               VARCHAR(30),                     -- Color del vehículo
        numero_vin          VARCHAR(50),                     -- Número de identificación vehicular
        tipo_grua_id        INT,                             -- FK al tipo de grúa
        estado              VARCHAR(30) DEFAULT 'Disponible',-- Estado operativo actual
        kilometraje         DECIMAL(10,2) DEFAULT 0,         -- Kilometraje actual del camión
        capacidad_toneladas DECIMAL(5,2),                    -- Capacidad de carga en toneladas
        chofer_asignado_id  INT NULL,                        -- FK al chofer asignado (puede ser NULL)
        fecha_registro      DATETIME DEFAULT GETDATE(),      -- Fecha de registro en el sistema
        notas               TEXT NULL,                        -- Notas adicionales sobre el camión
        CONSTRAINT FK_camiones_tipo FOREIGN KEY (tipo_grua_id) REFERENCES tipos_grua(id),
        CONSTRAINT FK_camiones_chofer FOREIGN KEY (chofer_asignado_id) REFERENCES usuarios(id)
    );
END
GO

-- ============================================================================
-- TABLA: solicitudes
-- Registra cada solicitud de servicio de grúa realizada por un cliente.
-- Una solicitud pasa por varios estados: Pendiente → Asignada → En camino
-- → Atendiendo → Finalizada (o Cancelada en cualquier momento).
-- Cada solicitud puede tener un camión y chofer asignados.
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'solicitudes')
BEGIN
    CREATE TABLE solicitudes (
        id                    INT PRIMARY KEY IDENTITY(1,1),    -- Identificador único
        numero_servicio       VARCHAR(20) NOT NULL UNIQUE,       -- Código único del servicio (ej: 'SRV-2026-0001')
        -- Datos del cliente
        cliente_nombre        VARCHAR(100) NOT NULL,             -- Nombre del cliente
        cliente_telefono      VARCHAR(20),                       -- Teléfono de contacto
        cliente_email         VARCHAR(100),                      -- Email del cliente (opcional)
        -- Datos de ubicación
        ubicacion_origen      VARCHAR(200) NOT NULL,             -- Dirección de origen (dónde recoger)
        ubicacion_destino     VARCHAR(200),                      -- Dirección de destino (dónde llevar)
        -- Descripción del servicio
        descripcion_problema  TEXT,                              -- Descripción del problema o servicio
        tipo_servicio         VARCHAR(50) DEFAULT 'Estándar',    -- Tipo: 'Estándar', 'Urgente', 'Programado'
        -- Estado y asignación
        estado                VARCHAR(30) DEFAULT 'Pendiente',   -- Estado actual de la solicitud
        prioridad             VARCHAR(20) DEFAULT 'Normal',      -- Prioridad: 'Baja', 'Normal', 'Alta', 'Urgente'
        camion_id             INT NULL,                          -- FK al camión asignado
        chofer_id             INT NULL,                          -- FK al chofer asignado
        -- Fechas del ciclo de vida
        fecha_solicitud       DATETIME DEFAULT GETDATE(),        -- Cuándo se creó la solicitud
        fecha_asignacion      DATETIME NULL,                     -- Cuándo se asignó una grúa
        fecha_inicio_servicio DATETIME NULL,                     -- Cuándo comenzó el servicio
        fecha_finalizacion    DATETIME NULL,                     -- Cuándo se finalizó
        -- Auditoría
        creado_por            INT NOT NULL,                      -- FK al usuario que registró la solicitud
        notas_internas        TEXT NULL,                         -- Notas internas del equipo
        CONSTRAINT FK_solicitudes_camion FOREIGN KEY (camion_id) REFERENCES camiones(id),
        CONSTRAINT FK_solicitudes_chofer FOREIGN KEY (chofer_id) REFERENCES usuarios(id),
        CONSTRAINT FK_solicitudes_creador FOREIGN KEY (creado_por) REFERENCES usuarios(id)
    );
END
GO

-- ============================================================================
-- DATOS SEMILLA (SEED DATA)
-- Inserta los datos iniciales necesarios para que el sistema funcione.
-- ============================================================================

-- Insertar roles del sistema
IF NOT EXISTS (SELECT * FROM roles WHERE nombre = 'Administrador')
BEGIN
    INSERT INTO roles (nombre, descripcion) VALUES
        ('Administrador', 'Acceso total al sistema. Gestiona usuarios, flota, solicitudes y reportes.'),
        ('Chofer', 'Puede ver sus servicios asignados, actualizar estados y registrar información de viajes.'),
        ('Logística', 'Gestiona solicitudes de servicio, asigna grúas y coordina operaciones.'),
        ('Técnico', 'Registra mantenimientos e inspecciones técnicas de las unidades.');
END
GO

-- Insertar tipos de grúa predeterminados
IF NOT EXISTS (SELECT * FROM tipos_grua WHERE nombre = 'Plataforma')
BEGIN
    INSERT INTO tipos_grua (nombre, descripcion) VALUES
        ('Plataforma', 'Grúa con plataforma plana para transportar vehículos sin contacto con el suelo.'),
        ('Arrastre', 'Grúa que remolca vehículos mediante un gancho o barra de arrastre.'),
        ('Elevación', 'Grúa con brazo hidráulico para elevar y mover cargas pesadas.');
END
GO

-- Insertar usuario administrador por defecto
-- Contraseña: admin123 (hash bcrypt generado con 10 rounds)
-- IMPORTANTE: Cambiar esta contraseña en producción
IF NOT EXISTS (SELECT * FROM usuarios WHERE email = 'admin@gruasheredianas.com')
BEGIN
    INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES
        ('Administrador', 'admin@gruasheredianas.com', '$2a$10$I1BIEUXcG12WPEX8m89PCe22o3/yRjz41OvswvmH.sCCI0l6EjQFO', 1);
END
GO

PRINT 'Base de datos inicializada correctamente.';
GO
