-- ============================================================================
-- Datos de Prueba — Sistema Gruas Heredianas
-- ============================================================================
-- Este script inserta datos de ejemplo para agilizar las pruebas.
-- Se ejecuta despues de init.sql. Usa IF NOT EXISTS para ser idempotente.
-- Password de todos los usuarios de prueba: admin123
-- ============================================================================

USE gruas_heredianas;
GO

-- ============================================================================
-- USUARIOS DE PRUEBA
-- Hash bcrypt de 'admin123' (mismo del admin en init.sql)
-- ============================================================================
DECLARE @hash VARCHAR(255) = '$2a$10$I1BIEUXcG12WPEX8m89PCe22o3/yRjz41OvswvmH.sCCI0l6EjQFO';

-- Chofer 1
IF NOT EXISTS (SELECT * FROM usuarios WHERE email = 'chofer1@gruasheredianas.com')
BEGIN
    INSERT INTO usuarios (nombre, email, password_hash, rol_id)
    VALUES ('Carlos Ramirez', 'chofer1@gruasheredianas.com', @hash,
        (SELECT id FROM roles WHERE nombre = 'Chofer'));
END

-- Chofer 2
IF NOT EXISTS (SELECT * FROM usuarios WHERE email = 'chofer2@gruasheredianas.com')
BEGIN
    INSERT INTO usuarios (nombre, email, password_hash, rol_id)
    VALUES ('Maria Lopez', 'chofer2@gruasheredianas.com', @hash,
        (SELECT id FROM roles WHERE nombre = 'Chofer'));
END

-- Tecnico
IF NOT EXISTS (SELECT * FROM usuarios WHERE email = 'tecnico@gruasheredianas.com')
BEGIN
    INSERT INTO usuarios (nombre, email, password_hash, rol_id)
    VALUES ('Jose Mendez', 'tecnico@gruasheredianas.com', @hash,
        (SELECT id FROM roles WHERE nombre = 'Técnico'));
END

-- Logistica
IF NOT EXISTS (SELECT * FROM usuarios WHERE email = 'logistica@gruasheredianas.com')
BEGIN
    INSERT INTO usuarios (nombre, email, password_hash, rol_id)
    VALUES ('Ana Vargas', 'logistica@gruasheredianas.com', @hash,
        (SELECT id FROM roles WHERE nombre = 'Logística'));
END
GO

-- ============================================================================
-- CAMIONES DE PRUEBA
-- ============================================================================

-- Camion 1: con chofer asignado (Chofer 1)
IF NOT EXISTS (SELECT * FROM camiones WHERE placa = 'GH-001')
BEGIN
    INSERT INTO camiones (placa, marca, modelo, anio, color, tipo_grua_id, estado, kilometraje, capacidad_toneladas, chofer_asignado_id)
    VALUES ('GH-001', 'Hino', '500 Series', 2022, 'Blanco',
        (SELECT TOP 1 id FROM tipos_grua WHERE nombre = 'Plataforma'),
        'Disponible', 45200.50, 8.5,
        (SELECT id FROM usuarios WHERE email = 'chofer1@gruasheredianas.com'));
END

-- Camion 2: sin chofer
IF NOT EXISTS (SELECT * FROM camiones WHERE placa = 'GH-002')
BEGIN
    INSERT INTO camiones (placa, marca, modelo, anio, color, tipo_grua_id, estado, kilometraje, capacidad_toneladas)
    VALUES ('GH-002', 'Isuzu', 'NPR', 2023, 'Rojo',
        (SELECT TOP 1 id FROM tipos_grua WHERE nombre = 'Arrastre'),
        'Disponible', 12800.00, 5.0);
END
GO

-- ============================================================================
-- SOLICITUDES DE PRUEBA
-- ============================================================================

-- Solicitud 1: Pendiente (sin asignar)
IF NOT EXISTS (SELECT * FROM solicitudes WHERE numero_servicio = 'SRV-2026-0001')
BEGIN
    INSERT INTO solicitudes (numero_servicio, cliente_nombre, cliente_telefono, cliente_email,
        ubicacion_origen, ubicacion_destino, descripcion_problema, tipo_servicio,
        estado, prioridad, creado_por)
    VALUES ('SRV-2026-0001', 'Juan Perez', '8888-1111', 'juan@email.com',
        'San Jose, Barrio Escalante', 'Heredia Centro',
        'Vehiculo con falla mecanica en la via, no enciende.',
        'Estándar', 'Pendiente', 'Normal',
        (SELECT id FROM usuarios WHERE email = 'admin@gruasheredianas.com'));
END

-- Solicitud 2: Finalizada (con camion y chofer asignado)
IF NOT EXISTS (SELECT * FROM solicitudes WHERE numero_servicio = 'SRV-2026-0002')
BEGIN
    INSERT INTO solicitudes (numero_servicio, cliente_nombre, cliente_telefono, cliente_email,
        ubicacion_origen, ubicacion_destino, descripcion_problema, tipo_servicio,
        estado, prioridad, camion_id, chofer_id,
        fecha_asignacion, fecha_inicio_servicio, fecha_finalizacion, creado_por)
    VALUES ('SRV-2026-0002', 'Laura Solis', '8888-2222', 'laura@email.com',
        'Alajuela, Centro', 'Heredia, Mercedes Norte',
        'Vehiculo chocado necesita traslado al taller.',
        'Urgente', 'Finalizada', 'Alta',
        (SELECT id FROM camiones WHERE placa = 'GH-001'),
        (SELECT id FROM usuarios WHERE email = 'chofer1@gruasheredianas.com'),
        DATEADD(DAY, -2, GETDATE()),
        DATEADD(DAY, -2, GETDATE()),
        DATEADD(DAY, -1, GETDATE()),
        (SELECT id FROM usuarios WHERE email = 'logistica@gruasheredianas.com'));
END
GO

-- ============================================================================
-- MANTENIMIENTOS DE PRUEBA
-- ============================================================================

-- Mantenimiento 1: Preventivo en Camion 1
IF NOT EXISTS (SELECT * FROM mantenimientos m INNER JOIN camiones c ON m.camion_id = c.id
    WHERE c.placa = 'GH-001' AND m.tipo = 'Preventivo' AND m.descripcion LIKE '%Cambio de aceite%')
BEGIN
    INSERT INTO mantenimientos (camion_id, tipo, estado, descripcion, fecha_completado, costo, kilometraje_actual, fecha_proximo, realizado_por, notas)
    VALUES (
        (SELECT id FROM camiones WHERE placa = 'GH-001'),
        'Preventivo', 'Completado',
        'Cambio de aceite y filtros. Revision general de frenos.',
        DATEADD(DAY, -1, GETDATE()),
        85000.00, 45200.50,
        DATEADD(MONTH, 3, GETDATE()),
        (SELECT id FROM usuarios WHERE email = 'tecnico@gruasheredianas.com'),
        'Proximo cambio a los 50,000 km o 3 meses.');
END

-- Mantenimiento 2: Correctivo en Camion 2 (En proceso — grua en mantenimiento)
IF NOT EXISTS (SELECT * FROM mantenimientos m INNER JOIN camiones c ON m.camion_id = c.id
    WHERE c.placa = 'GH-002' AND m.tipo = 'Correctivo')
BEGIN
    INSERT INTO mantenimientos (camion_id, tipo, estado, descripcion, costo, kilometraje_actual, realizado_por, notas)
    VALUES (
        (SELECT id FROM camiones WHERE placa = 'GH-002'),
        'Correctivo', 'En proceso',
        'Reemplazo de bomba de agua por fuga detectada.',
        120000.00, 12800.00,
        (SELECT id FROM usuarios WHERE email = 'tecnico@gruasheredianas.com'),
        'Se recomienda revisar mangueras en el proximo preventivo.');
    -- Poner camion GH-002 en estado Mantenimiento
    UPDATE camiones SET estado = 'Mantenimiento' WHERE placa = 'GH-002';
END
GO

-- ============================================================================
-- COMBUSTIBLE DE PRUEBA
-- ============================================================================

-- Carga 1: Camion 1
IF NOT EXISTS (SELECT * FROM combustible cb INNER JOIN camiones c ON cb.camion_id = c.id
    WHERE c.placa = 'GH-001' AND cb.estacion = 'Gasolinera Total Heredia')
BEGIN
    INSERT INTO combustible (camion_id, litros, costo, kilometraje, estacion, registrado_por)
    VALUES (
        (SELECT id FROM camiones WHERE placa = 'GH-001'),
        65.50, 45500.00, 45200.50, 'Gasolinera Total Heredia',
        (SELECT id FROM usuarios WHERE email = 'logistica@gruasheredianas.com'));
END

-- Carga 2: Camion 2
IF NOT EXISTS (SELECT * FROM combustible cb INNER JOIN camiones c ON cb.camion_id = c.id
    WHERE c.placa = 'GH-002' AND cb.estacion = 'Bomba Shell Alajuela')
BEGIN
    INSERT INTO combustible (camion_id, litros, costo, kilometraje, estacion, registrado_por)
    VALUES (
        (SELECT id FROM camiones WHERE placa = 'GH-002'),
        45.00, 31200.00, 12800.00, 'Bomba Shell Alajuela',
        (SELECT id FROM usuarios WHERE email = 'logistica@gruasheredianas.com'));
END
GO

PRINT 'Datos de prueba insertados correctamente.';
GO
