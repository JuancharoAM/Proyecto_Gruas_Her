# Facturacion + Evaluaciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add invoicing (Facturación) and post-service ratings (Evaluaciones) modules to the Grúas Heredianas fleet management system.

**Architecture:** Follow the existing MVC pattern: SQL table in `database/init.sql`, service (raw SQL via `mssql`), controller (HTTP handling), routes (Express Router with auth+role middleware). Frontend uses Next.js App Router with `"use client"` pages, centralized API wrapper, shared types. Notifications use `crearNotificacion` / `crearParaRol` from the existing notifications service.

**Tech Stack:** TypeScript, Express.js, mssql driver, Next.js 16 App Router, pure CSS, SQL Server 2022.

---

## File Map

### New files:
| File | Responsibility |
|------|----------------|
| `backend/src/services/facturas.service.ts` | SQL queries and business logic for invoices |
| `backend/src/controllers/facturas.controller.ts` | HTTP request/response handling for invoices |
| `backend/src/routes/facturas.routes.ts` | Route definitions with auth + roleCheck |
| `backend/src/services/evaluaciones.service.ts` | SQL queries and business logic for evaluations |
| `backend/src/controllers/evaluaciones.controller.ts` | HTTP request/response handling for evaluations |
| `backend/src/routes/evaluaciones.routes.ts` | Route definitions with mixed role checks |
| `frontend/src/app/dashboard/facturacion/page.tsx` | Invoice management page (Admin) |
| `frontend/src/app/dashboard/evaluaciones/page.tsx` | Evaluations review page (Admin/Logística) |
| `frontend/src/components/StarRating.tsx` | Reusable star rating component |

### Modified files:
| File | Changes |
|------|---------|
| `database/init.sql` | Add `facturas` and `evaluaciones` tables |
| `backend/src/app.ts` | Register facturas and evaluaciones routes |
| `frontend/src/types/index.ts` | Add Factura, ResumenFacturas, Evaluacion, PromedioChofer interfaces |
| `frontend/src/lib/api.ts` | Add API functions for facturas and evaluaciones |
| `frontend/src/components/Icon.tsx` | Add `invoice` and `star` icons |
| `frontend/src/app/dashboard/layout.tsx` | Add Facturación and Evaluaciones sidebar entries |
| `frontend/src/app/dashboard/mis-solicitudes/page.tsx` | Add evaluate button for finalized requests |

---

## Task 1: Database tables

**Files:**
- Modify: `database/init.sql:297` (before the final PRINT statement)

- [ ] **Step 1: Add facturas and evaluaciones tables to init.sql**

Insert the following SQL before the `PRINT 'Base de datos inicializada correctamente.';` line at the end of `database/init.sql`:

```sql
-- ============================================================================
-- TABLA: facturas
-- Registro de facturas emitidas por servicios de grua finalizados.
-- Numero auto-generado FAC-YYYY-NNNN. IVA 13% (Costa Rica).
-- Estados: Pendiente, Pagada, Anulada.
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'facturas')
BEGIN
    CREATE TABLE facturas (
        id                INT PRIMARY KEY IDENTITY(1,1),
        numero_factura    VARCHAR(20) NOT NULL UNIQUE,
        solicitud_id      INT NOT NULL,
        cliente_nombre    VARCHAR(100) NOT NULL,
        cliente_telefono  VARCHAR(20),
        cliente_email     VARCHAR(100),
        subtotal          DECIMAL(12,2) NOT NULL,
        impuesto_pct      DECIMAL(5,2) DEFAULT 13.00,
        impuesto_monto    DECIMAL(12,2) NOT NULL,
        total             DECIMAL(12,2) NOT NULL,
        estado            VARCHAR(20) DEFAULT 'Pendiente',
        descripcion       TEXT,
        fecha_emision     DATETIME DEFAULT GETDATE(),
        fecha_pago        DATETIME NULL,
        creado_por        INT NOT NULL,
        notas             TEXT NULL,
        CONSTRAINT FK_facturas_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id),
        CONSTRAINT FK_facturas_creador FOREIGN KEY (creado_por) REFERENCES usuarios(id)
    );
END
GO

-- ============================================================================
-- TABLA: evaluaciones
-- Calificaciones post-servicio. Un cliente evalua al chofer (1-5 estrellas).
-- Una sola evaluacion por solicitud (UNIQUE en solicitud_id).
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'evaluaciones')
BEGIN
    CREATE TABLE evaluaciones (
        id                INT PRIMARY KEY IDENTITY(1,1),
        solicitud_id      INT NOT NULL UNIQUE,
        chofer_id         INT NOT NULL,
        calificacion      INT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
        comentario        TEXT NULL,
        evaluado_por      INT NOT NULL,
        fecha_creacion    DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_evaluaciones_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id),
        CONSTRAINT FK_evaluaciones_chofer FOREIGN KEY (chofer_id) REFERENCES usuarios(id),
        CONSTRAINT FK_evaluaciones_evaluador FOREIGN KEY (evaluado_por) REFERENCES usuarios(id)
    );
END
GO
```

- [ ] **Step 2: Commit**

```bash
git add database/init.sql
git commit -m "feat(db): add facturas and evaluaciones tables"
```

---

## Task 2: Facturas backend service

**Files:**
- Create: `backend/src/services/facturas.service.ts`

- [ ] **Step 1: Create facturas service**

Create `backend/src/services/facturas.service.ts`:

```typescript
/**
 * ============================================================================
 * Servicio de Facturas
 * ============================================================================
 *
 * Logica de negocio para facturacion de servicios de grua.
 * Genera facturas desde solicitudes finalizadas con IVA 13%.
 * Numero auto-generado: FAC-YYYY-NNNN (secuencial por ano).
 * ============================================================================
 */

import { getPool } from '../config/database';
import * as notificacionesService from './notificaciones.service';

export interface Factura {
    id: number;
    numero_factura: string;
    solicitud_id: number;
    numero_servicio: string;
    cliente_nombre: string;
    cliente_telefono: string | null;
    cliente_email: string | null;
    subtotal: number;
    impuesto_pct: number;
    impuesto_monto: number;
    total: number;
    estado: string;
    descripcion: string | null;
    fecha_emision: Date;
    fecha_pago: Date | null;
    creado_por: number;
    notas: string | null;
}

export interface CrearFacturaDTO {
    solicitud_id: number;
    subtotal: number;
    descripcion?: string;
    notas?: string;
}

export interface ResumenFacturas {
    total_pendiente: number;
    total_pagado: number;
    cantidad_pendientes: number;
    cantidad_pagadas: number;
    cantidad_anuladas: number;
}

const SELECT_QUERY = `
    SELECT
        f.id, f.numero_factura, f.solicitud_id, s.numero_servicio,
        f.cliente_nombre, f.cliente_telefono, f.cliente_email,
        f.subtotal, f.impuesto_pct, f.impuesto_monto, f.total,
        f.estado, f.descripcion, f.fecha_emision, f.fecha_pago,
        f.creado_por, f.notas
    FROM facturas f
    INNER JOIN solicitudes s ON f.solicitud_id = s.id
`;

/**
 * Genera el siguiente numero de factura con formato FAC-YYYY-NNNN.
 */
async function generarNumeroFactura(): Promise<string> {
    const pool = await getPool();
    const anio = new Date().getFullYear();
    const prefix = `FAC-${anio}-`;
    const result = await pool.request()
        .input('prefix', `${prefix}%`)
        .query(`SELECT TOP 1 numero_factura FROM facturas WHERE numero_factura LIKE @prefix ORDER BY numero_factura DESC`);

    let secuencial = 1;
    if (result.recordset.length > 0) {
        const ultimo = result.recordset[0].numero_factura;
        secuencial = parseInt(ultimo.split('-')[2]) + 1;
    }
    return `${prefix}${secuencial.toString().padStart(4, '0')}`;
}

/**
 * Lista todas las facturas, con filtro opcional por estado.
 */
export async function listarFacturas(estado?: string): Promise<Factura[]> {
    const pool = await getPool();
    let query = SELECT_QUERY;
    const request = pool.request();

    if (estado) {
        query += ` WHERE f.estado = @estado`;
        request.input('estado', estado);
    }

    query += ` ORDER BY f.fecha_emision DESC`;
    const result = await request.query(query);
    return result.recordset;
}

/**
 * Obtiene una factura por su ID.
 */
export async function obtenerPorId(id: number): Promise<Factura | null> {
    const pool = await getPool();
    const result = await pool.request()
        .input('id', id)
        .query(`${SELECT_QUERY} WHERE f.id = @id`);
    return result.recordset.length > 0 ? result.recordset[0] : null;
}

/**
 * Crea una factura desde una solicitud finalizada.
 * Copia datos del cliente desde la solicitud, calcula IVA 13%.
 */
export async function crearFactura(datos: CrearFacturaDTO, userId: number): Promise<Factura> {
    const pool = await getPool();

    // Verificar que la solicitud existe y esta finalizada
    const sol = await pool.request()
        .input('solicitud_id', datos.solicitud_id)
        .query(`SELECT id, estado, cliente_nombre, cliente_telefono, cliente_email FROM solicitudes WHERE id = @solicitud_id`);

    if (sol.recordset.length === 0) {
        throw new Error('Solicitud no encontrada.');
    }
    if (sol.recordset[0].estado !== 'Finalizada') {
        throw new Error('Solo se pueden facturar solicitudes finalizadas.');
    }

    // Verificar que no exista factura para esta solicitud
    const existe = await pool.request()
        .input('solicitud_id', datos.solicitud_id)
        .query(`SELECT id FROM facturas WHERE solicitud_id = @solicitud_id`);

    if (existe.recordset.length > 0) {
        throw new Error('Ya existe una factura para esta solicitud.');
    }

    const solicitud = sol.recordset[0];
    const numeroFactura = await generarNumeroFactura();
    const impuestoPct = 13.00;
    const impuestoMonto = Math.round(datos.subtotal * (impuestoPct / 100) * 100) / 100;
    const total = Math.round((datos.subtotal + impuestoMonto) * 100) / 100;

    const result = await pool.request()
        .input('numero_factura', numeroFactura)
        .input('solicitud_id', datos.solicitud_id)
        .input('cliente_nombre', solicitud.cliente_nombre)
        .input('cliente_telefono', solicitud.cliente_telefono || null)
        .input('cliente_email', solicitud.cliente_email || null)
        .input('subtotal', datos.subtotal)
        .input('impuesto_pct', impuestoPct)
        .input('impuesto_monto', impuestoMonto)
        .input('total', total)
        .input('descripcion', datos.descripcion || null)
        .input('creado_por', userId)
        .input('notas', datos.notas || null)
        .query(`
            INSERT INTO facturas
                (numero_factura, solicitud_id, cliente_nombre, cliente_telefono, cliente_email,
                 subtotal, impuesto_pct, impuesto_monto, total, descripcion, creado_por, notas)
            OUTPUT INSERTED.id
            VALUES
                (@numero_factura, @solicitud_id, @cliente_nombre, @cliente_telefono, @cliente_email,
                 @subtotal, @impuesto_pct, @impuesto_monto, @total, @descripcion, @creado_por, @notas)
        `);

    const nuevoId = result.recordset[0].id;

    // Notificar a administradores
    await notificacionesService.crearParaRol('Administrador', {
        titulo: 'Nueva factura emitida',
        mensaje: `Se emitió la factura ${numeroFactura} por ₡${total.toLocaleString('es-CR')}`,
        tipo: 'info',
        referencia_tipo: 'factura',
        referencia_id: nuevoId,
    });

    return (await obtenerPorId(nuevoId))!;
}

/**
 * Marca una factura como pagada.
 */
export async function marcarPagada(id: number): Promise<Factura | null> {
    const pool = await getPool();
    const factura = await obtenerPorId(id);
    if (!factura) return null;
    if (factura.estado !== 'Pendiente') {
        throw new Error('Solo se pueden pagar facturas pendientes.');
    }

    await pool.request()
        .input('id', id)
        .input('fecha_pago', new Date())
        .query(`UPDATE facturas SET estado = 'Pagada', fecha_pago = @fecha_pago WHERE id = @id`);

    return obtenerPorId(id);
}

/**
 * Anula una factura pendiente.
 */
export async function anularFactura(id: number): Promise<Factura | null> {
    const pool = await getPool();
    const factura = await obtenerPorId(id);
    if (!factura) return null;
    if (factura.estado !== 'Pendiente') {
        throw new Error('Solo se pueden anular facturas pendientes.');
    }

    await pool.request()
        .input('id', id)
        .query(`UPDATE facturas SET estado = 'Anulada' WHERE id = @id`);

    return obtenerPorId(id);
}

/**
 * Obtiene resumen de facturas: totales y conteos por estado.
 */
export async function obtenerResumen(): Promise<ResumenFacturas> {
    const pool = await getPool();
    const result = await pool.request().query(`
        SELECT
            ISNULL(SUM(CASE WHEN estado = 'Pendiente' THEN total ELSE 0 END), 0) AS total_pendiente,
            ISNULL(SUM(CASE WHEN estado = 'Pagada' THEN total ELSE 0 END), 0) AS total_pagado,
            SUM(CASE WHEN estado = 'Pendiente' THEN 1 ELSE 0 END) AS cantidad_pendientes,
            SUM(CASE WHEN estado = 'Pagada' THEN 1 ELSE 0 END) AS cantidad_pagadas,
            SUM(CASE WHEN estado = 'Anulada' THEN 1 ELSE 0 END) AS cantidad_anuladas
        FROM facturas
    `);
    return result.recordset[0];
}

/**
 * Lista solicitudes finalizadas que aun no tienen factura.
 * Usado para el selector al crear una factura nueva.
 */
export async function listarSolicitudesSinFactura(): Promise<any[]> {
    const pool = await getPool();
    const result = await pool.request().query(`
        SELECT s.id, s.numero_servicio, s.cliente_nombre, s.cliente_telefono,
               s.cliente_email, s.descripcion_problema, s.fecha_finalizacion
        FROM solicitudes s
        LEFT JOIN facturas f ON s.id = f.solicitud_id
        WHERE s.estado = 'Finalizada' AND f.id IS NULL
        ORDER BY s.fecha_finalizacion DESC
    `);
    return result.recordset;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/facturas.service.ts
git commit -m "feat(backend): add facturas service with CRUD and invoice number generation"
```

---

## Task 3: Facturas backend controller + routes

**Files:**
- Create: `backend/src/controllers/facturas.controller.ts`
- Create: `backend/src/routes/facturas.routes.ts`

- [ ] **Step 1: Create facturas controller**

Create `backend/src/controllers/facturas.controller.ts`:

```typescript
/**
 * ============================================================================
 * Controlador de Facturas
 * ============================================================================
 *
 * Maneja las solicitudes HTTP para el modulo de facturacion.
 * Accesible solo por Administradores.
 * ============================================================================
 */

import { Request, Response } from 'express';
import * as facturasService from '../services/facturas.service';

/**
 * GET /api/facturas
 * Lista facturas con filtro opcional por estado.
 */
export async function listar(req: Request, res: Response): Promise<void> {
    try {
        const estado = req.query.estado as string | undefined;
        const facturas = await facturasService.listarFacturas(estado);
        res.json({ success: true, data: facturas });
    } catch (error) {
        console.error('Error al listar facturas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener facturas.' });
    }
}

/**
 * GET /api/facturas/resumen
 * Resumen de totales y conteos.
 */
export async function resumen(req: Request, res: Response): Promise<void> {
    try {
        const data = await facturasService.obtenerResumen();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error al obtener resumen:', error);
        res.status(500).json({ success: false, message: 'Error al obtener resumen de facturas.' });
    }
}

/**
 * GET /api/facturas/solicitudes-sin-factura
 * Lista solicitudes finalizadas sin factura (para el selector).
 */
export async function solicitudesSinFactura(req: Request, res: Response): Promise<void> {
    try {
        const data = await facturasService.listarSolicitudesSinFactura();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error al listar solicitudes:', error);
        res.status(500).json({ success: false, message: 'Error al obtener solicitudes.' });
    }
}

/**
 * GET /api/facturas/:id
 * Obtiene una factura por ID.
 */
export async function obtenerPorId(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const factura = await facturasService.obtenerPorId(id);

        if (!factura) {
            res.status(404).json({ success: false, message: 'Factura no encontrada.' });
            return;
        }

        res.json({ success: true, data: factura });
    } catch (error) {
        console.error('Error al obtener factura:', error);
        res.status(500).json({ success: false, message: 'Error al obtener factura.' });
    }
}

/**
 * POST /api/facturas
 * Crea una nueva factura.
 */
export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { solicitud_id, subtotal } = req.body;

        if (!solicitud_id || subtotal === undefined || subtotal === null) {
            res.status(400).json({
                success: false,
                message: 'Los campos solicitud_id y subtotal son requeridos.',
            });
            return;
        }

        if (typeof subtotal !== 'number' || subtotal <= 0) {
            res.status(400).json({
                success: false,
                message: 'El subtotal debe ser un número mayor a 0.',
            });
            return;
        }

        const factura = await facturasService.crearFactura(req.body, req.user!.userId);
        res.status(201).json({ success: true, data: factura, message: 'Factura emitida exitosamente.' });
    } catch (error: any) {
        console.error('Error al crear factura:', error);
        const msg = error.message;
        if (msg?.includes('no encontrada') || msg?.includes('finalizadas') || msg?.includes('Ya existe')) {
            res.status(400).json({ success: false, message: msg });
            return;
        }
        res.status(500).json({ success: false, message: 'Error al emitir factura.' });
    }
}

/**
 * PUT /api/facturas/:id/pagar
 * Marca una factura como pagada.
 */
export async function pagar(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const factura = await facturasService.marcarPagada(id);

        if (!factura) {
            res.status(404).json({ success: false, message: 'Factura no encontrada.' });
            return;
        }

        res.json({ success: true, data: factura, message: 'Factura marcada como pagada.' });
    } catch (error: any) {
        console.error('Error al pagar factura:', error);
        if (error.message?.includes('pendientes')) {
            res.status(400).json({ success: false, message: error.message });
            return;
        }
        res.status(500).json({ success: false, message: 'Error al marcar factura como pagada.' });
    }
}

/**
 * PUT /api/facturas/:id/anular
 * Anula una factura pendiente.
 */
export async function anular(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const factura = await facturasService.anularFactura(id);

        if (!factura) {
            res.status(404).json({ success: false, message: 'Factura no encontrada.' });
            return;
        }

        res.json({ success: true, data: factura, message: 'Factura anulada exitosamente.' });
    } catch (error: any) {
        console.error('Error al anular factura:', error);
        if (error.message?.includes('pendientes')) {
            res.status(400).json({ success: false, message: error.message });
            return;
        }
        res.status(500).json({ success: false, message: 'Error al anular factura.' });
    }
}
```

- [ ] **Step 2: Create facturas routes**

Create `backend/src/routes/facturas.routes.ts`:

```typescript
/**
 * ============================================================================
 * Rutas de Facturas
 * ============================================================================
 * Define los endpoints para el modulo de facturacion.
 * Acceso: Solo Administrador.
 * ============================================================================
 */

import { Router } from 'express';
import * as facturasController from '../controllers/facturas.controller';
import { authMiddleware } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();

// Todas las rutas requieren autenticacion + rol Administrador
router.use(authMiddleware);
router.use(roleCheck(['Administrador']));

// GET /api/facturas/resumen - Resumen de totales
router.get('/resumen', facturasController.resumen);

// GET /api/facturas/solicitudes-sin-factura - Solicitudes finalizadas sin factura
router.get('/solicitudes-sin-factura', facturasController.solicitudesSinFactura);

// GET /api/facturas - Listar facturas (con filtro opcional ?estado=X)
router.get('/', facturasController.listar);

// GET /api/facturas/:id - Detalle de una factura
router.get('/:id', facturasController.obtenerPorId);

// POST /api/facturas - Crear nueva factura
router.post('/', facturasController.crear);

// PUT /api/facturas/:id/pagar - Marcar como pagada
router.put('/:id/pagar', facturasController.pagar);

// PUT /api/facturas/:id/anular - Anular factura
router.put('/:id/anular', facturasController.anular);

export default router;
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/facturas.controller.ts backend/src/routes/facturas.routes.ts
git commit -m "feat(backend): add facturas controller and routes"
```

---

## Task 4: Evaluaciones backend service

**Files:**
- Create: `backend/src/services/evaluaciones.service.ts`

- [ ] **Step 1: Create evaluaciones service**

Create `backend/src/services/evaluaciones.service.ts`:

```typescript
/**
 * ============================================================================
 * Servicio de Evaluaciones
 * ============================================================================
 *
 * Logica de negocio para evaluaciones post-servicio.
 * Los clientes califican al chofer de 1 a 5 estrellas despues de un servicio
 * finalizado. Una sola evaluacion por solicitud (UNIQUE).
 * ============================================================================
 */

import { getPool } from '../config/database';
import * as notificacionesService from './notificaciones.service';

export interface Evaluacion {
    id: number;
    solicitud_id: number;
    numero_servicio: string;
    chofer_id: number;
    chofer_nombre: string;
    calificacion: number;
    comentario: string | null;
    evaluado_por: number;
    cliente_nombre: string;
    fecha_creacion: Date;
}

export interface CrearEvaluacionDTO {
    solicitud_id: number;
    calificacion: number;
    comentario?: string;
}

export interface PromedioChofer {
    chofer_id: number;
    chofer_nombre: string;
    promedio: number;
    total_evaluaciones: number;
}

const SELECT_QUERY = `
    SELECT
        e.id, e.solicitud_id, s.numero_servicio,
        e.chofer_id, uc.nombre AS chofer_nombre,
        e.calificacion, e.comentario,
        e.evaluado_por, ue.nombre AS cliente_nombre,
        e.fecha_creacion
    FROM evaluaciones e
    INNER JOIN solicitudes s ON e.solicitud_id = s.id
    INNER JOIN usuarios uc ON e.chofer_id = uc.id
    INNER JOIN usuarios ue ON e.evaluado_por = ue.id
`;

/**
 * Crea una evaluacion para una solicitud finalizada.
 * Valida: solicitud finalizada, sin evaluacion previa, obtiene chofer_id de la solicitud.
 */
export async function crearEvaluacion(datos: CrearEvaluacionDTO, userId: number): Promise<Evaluacion> {
    const pool = await getPool();

    // Verificar solicitud
    const sol = await pool.request()
        .input('solicitud_id', datos.solicitud_id)
        .query(`SELECT id, estado, chofer_id, numero_servicio FROM solicitudes WHERE id = @solicitud_id`);

    if (sol.recordset.length === 0) {
        throw new Error('Solicitud no encontrada.');
    }
    if (sol.recordset[0].estado !== 'Finalizada') {
        throw new Error('Solo se pueden evaluar solicitudes finalizadas.');
    }
    if (!sol.recordset[0].chofer_id) {
        throw new Error('La solicitud no tiene un chofer asignado.');
    }

    // Verificar que no exista evaluacion
    const existe = await pool.request()
        .input('solicitud_id', datos.solicitud_id)
        .query(`SELECT id FROM evaluaciones WHERE solicitud_id = @solicitud_id`);

    if (existe.recordset.length > 0) {
        throw new Error('Ya existe una evaluación para esta solicitud.');
    }

    const choferId = sol.recordset[0].chofer_id;

    const result = await pool.request()
        .input('solicitud_id', datos.solicitud_id)
        .input('chofer_id', choferId)
        .input('calificacion', datos.calificacion)
        .input('comentario', datos.comentario || null)
        .input('evaluado_por', userId)
        .query(`
            INSERT INTO evaluaciones (solicitud_id, chofer_id, calificacion, comentario, evaluado_por)
            OUTPUT INSERTED.id
            VALUES (@solicitud_id, @chofer_id, @calificacion, @comentario, @evaluado_por)
        `);

    const nuevoId = result.recordset[0].id;

    // Notificar al chofer
    const estrellas = '★'.repeat(datos.calificacion) + '☆'.repeat(5 - datos.calificacion);
    await notificacionesService.crearNotificacion({
        usuario_id: choferId,
        titulo: 'Nueva evaluación recibida',
        mensaje: `Recibiste una evaluación ${estrellas} (${datos.calificacion}/5) por el servicio ${sol.recordset[0].numero_servicio}.`,
        tipo: 'info',
        referencia_tipo: 'evaluacion',
        referencia_id: nuevoId,
    });

    return (await obtenerPorId(nuevoId))!;
}

/**
 * Obtiene una evaluacion por su ID.
 */
export async function obtenerPorId(id: number): Promise<Evaluacion | null> {
    const pool = await getPool();
    const result = await pool.request()
        .input('id', id)
        .query(`${SELECT_QUERY} WHERE e.id = @id`);
    return result.recordset.length > 0 ? result.recordset[0] : null;
}

/**
 * Obtiene la evaluacion de una solicitud especifica (si existe).
 */
export async function obtenerPorSolicitud(solicitudId: number): Promise<Evaluacion | null> {
    const pool = await getPool();
    const result = await pool.request()
        .input('solicitud_id', solicitudId)
        .query(`${SELECT_QUERY} WHERE e.solicitud_id = @solicitud_id`);
    return result.recordset.length > 0 ? result.recordset[0] : null;
}

/**
 * Lista evaluaciones, con filtro opcional por chofer.
 */
export async function listarEvaluaciones(choferId?: number): Promise<Evaluacion[]> {
    const pool = await getPool();
    let query = SELECT_QUERY;
    const request = pool.request();

    if (choferId) {
        query += ` WHERE e.chofer_id = @chofer_id`;
        request.input('chofer_id', choferId);
    }

    query += ` ORDER BY e.fecha_creacion DESC`;
    const result = await request.query(query);
    return result.recordset;
}

/**
 * Obtiene promedios de calificacion por chofer.
 */
export async function promediosPorChofer(): Promise<PromedioChofer[]> {
    const pool = await getPool();
    const result = await pool.request().query(`
        SELECT
            e.chofer_id,
            u.nombre AS chofer_nombre,
            CAST(AVG(CAST(e.calificacion AS DECIMAL(3,2))) AS DECIMAL(3,2)) AS promedio,
            COUNT(*) AS total_evaluaciones
        FROM evaluaciones e
        INNER JOIN usuarios u ON e.chofer_id = u.id
        GROUP BY e.chofer_id, u.nombre
        ORDER BY promedio DESC
    `);
    return result.recordset;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/evaluaciones.service.ts
git commit -m "feat(backend): add evaluaciones service with ratings and driver averages"
```

---

## Task 5: Evaluaciones backend controller + routes

**Files:**
- Create: `backend/src/controllers/evaluaciones.controller.ts`
- Create: `backend/src/routes/evaluaciones.routes.ts`

- [ ] **Step 1: Create evaluaciones controller**

Create `backend/src/controllers/evaluaciones.controller.ts`:

```typescript
/**
 * ============================================================================
 * Controlador de Evaluaciones
 * ============================================================================
 *
 * Maneja las solicitudes HTTP para evaluaciones post-servicio.
 * Crear: Solo Clientes. Consultar: Admin y Logistica.
 * ============================================================================
 */

import { Request, Response } from 'express';
import * as evaluacionesService from '../services/evaluaciones.service';

/**
 * POST /api/evaluaciones
 * Crea una evaluacion (solo clientes).
 */
export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { solicitud_id, calificacion } = req.body;

        if (!solicitud_id || calificacion === undefined) {
            res.status(400).json({
                success: false,
                message: 'Los campos solicitud_id y calificacion son requeridos.',
            });
            return;
        }

        if (typeof calificacion !== 'number' || calificacion < 1 || calificacion > 5) {
            res.status(400).json({
                success: false,
                message: 'La calificación debe ser un número entre 1 y 5.',
            });
            return;
        }

        const evaluacion = await evaluacionesService.crearEvaluacion(req.body, req.user!.userId);
        res.status(201).json({ success: true, data: evaluacion, message: 'Evaluación registrada exitosamente.' });
    } catch (error: any) {
        console.error('Error al crear evaluacion:', error);
        const msg = error.message;
        if (msg?.includes('no encontrada') || msg?.includes('finalizadas') || msg?.includes('Ya existe') || msg?.includes('chofer')) {
            res.status(400).json({ success: false, message: msg });
            return;
        }
        res.status(500).json({ success: false, message: 'Error al registrar evaluación.' });
    }
}

/**
 * GET /api/evaluaciones/solicitud/:solicitudId
 * Obtiene la evaluacion de una solicitud.
 */
export async function obtenerPorSolicitud(req: Request, res: Response): Promise<void> {
    try {
        const solicitudId = parseInt(req.params.solicitudId);
        const evaluacion = await evaluacionesService.obtenerPorSolicitud(solicitudId);

        // Retornar null (no 404) si no existe — el frontend necesita saber si existe o no
        res.json({ success: true, data: evaluacion });
    } catch (error) {
        console.error('Error al obtener evaluacion:', error);
        res.status(500).json({ success: false, message: 'Error al obtener evaluación.' });
    }
}

/**
 * GET /api/evaluaciones/promedios
 * Promedios de calificacion por chofer.
 */
export async function promedios(req: Request, res: Response): Promise<void> {
    try {
        const data = await evaluacionesService.promediosPorChofer();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error al obtener promedios:', error);
        res.status(500).json({ success: false, message: 'Error al obtener promedios.' });
    }
}

/**
 * GET /api/evaluaciones
 * Lista todas las evaluaciones, con filtro opcional por chofer.
 */
export async function listar(req: Request, res: Response): Promise<void> {
    try {
        const choferId = req.query.chofer_id ? parseInt(req.query.chofer_id as string) : undefined;
        const evaluaciones = await evaluacionesService.listarEvaluaciones(choferId);
        res.json({ success: true, data: evaluaciones });
    } catch (error) {
        console.error('Error al listar evaluaciones:', error);
        res.status(500).json({ success: false, message: 'Error al obtener evaluaciones.' });
    }
}
```

- [ ] **Step 2: Create evaluaciones routes**

Create `backend/src/routes/evaluaciones.routes.ts`:

```typescript
/**
 * ============================================================================
 * Rutas de Evaluaciones
 * ============================================================================
 * Define los endpoints para evaluaciones post-servicio.
 * Crear: Cliente. Consultar: Administrador, Logistica. Por solicitud: cualquier autenticado.
 * ============================================================================
 */

import { Router } from 'express';
import * as evaluacionesController from '../controllers/evaluaciones.controller';
import { authMiddleware } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();

// Todas las rutas requieren autenticacion
router.use(authMiddleware);

// POST /api/evaluaciones - Crear evaluacion (solo clientes)
router.post('/', roleCheck(['Cliente']), evaluacionesController.crear);

// GET /api/evaluaciones/promedios - Promedios por chofer (Admin, Logistica)
router.get('/promedios', roleCheck(['Administrador', 'Logística']), evaluacionesController.promedios);

// GET /api/evaluaciones/solicitud/:solicitudId - Evaluacion de una solicitud (cualquier autenticado)
router.get('/solicitud/:solicitudId', evaluacionesController.obtenerPorSolicitud);

// GET /api/evaluaciones - Listar evaluaciones (Admin, Logistica)
router.get('/', roleCheck(['Administrador', 'Logística']), evaluacionesController.listar);

export default router;
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/evaluaciones.controller.ts backend/src/routes/evaluaciones.routes.ts
git commit -m "feat(backend): add evaluaciones controller and routes"
```

---

## Task 6: Register routes in app.ts

**Files:**
- Modify: `backend/src/app.ts:31` (imports) and `backend/src/app.ts:77` (route mounting)

- [ ] **Step 1: Add imports to app.ts**

Add these two import lines after line 31 (`import reportesRoutes from './routes/reportes.routes';`):

```typescript
import facturasRoutes from './routes/facturas.routes';
import evaluacionesRoutes from './routes/evaluaciones.routes';
```

- [ ] **Step 2: Mount routes in app.ts**

Add these two lines after line 77 (`app.use('/api/reportes', reportesRoutes);`):

```typescript
app.use('/api/facturas', facturasRoutes);             // Facturación
app.use('/api/evaluaciones', evaluacionesRoutes);     // Evaluaciones post-servicio
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/app.ts
git commit -m "feat(backend): register facturas and evaluaciones routes in app.ts"
```

---

## Task 7: Frontend types and API functions

**Files:**
- Modify: `frontend/src/types/index.ts:220` (before ApiResponse)
- Modify: `frontend/src/lib/api.ts:13` (import line) and end of file (new functions)

- [ ] **Step 1: Add types to index.ts**

Add these interfaces before the `ApiResponse` interface (before line 222 `/** Respuesta genérica de la API */`):

```typescript
/** Factura emitida */
export interface Factura {
    id: number;
    numero_factura: string;
    solicitud_id: number;
    numero_servicio?: string;
    cliente_nombre: string;
    cliente_telefono?: string;
    cliente_email?: string;
    subtotal: number;
    impuesto_pct: number;
    impuesto_monto: number;
    total: number;
    estado: string;
    descripcion?: string;
    fecha_emision: string;
    fecha_pago?: string;
    creado_por: number;
    notas?: string;
}

/** Resumen de facturas para dashboard */
export interface ResumenFacturas {
    total_pendiente: number;
    total_pagado: number;
    cantidad_pendientes: number;
    cantidad_pagadas: number;
    cantidad_anuladas: number;
}

/** Solicitud disponible para facturar */
export interface SolicitudFacturable {
    id: number;
    numero_servicio: string;
    cliente_nombre: string;
    cliente_telefono?: string;
    cliente_email?: string;
    descripcion_problema?: string;
    fecha_finalizacion: string;
}

/** Evaluacion post-servicio */
export interface Evaluacion {
    id: number;
    solicitud_id: number;
    numero_servicio?: string;
    chofer_id: number;
    chofer_nombre?: string;
    calificacion: number;
    comentario?: string;
    evaluado_por: number;
    cliente_nombre?: string;
    fecha_creacion: string;
}

/** Promedio de calificacion por chofer */
export interface PromedioChofer {
    chofer_id: number;
    chofer_nombre: string;
    promedio: number;
    total_evaluaciones: number;
}
```

- [ ] **Step 2: Update api.ts import line**

Replace the import line at line 13 of `frontend/src/lib/api.ts`:

Old:
```typescript
import { ApiResponse, LoginResponse, Usuario, UsuarioCompleto, Rol, Camion, TipoGrua, Solicitud, DashboardStats, Mantenimiento, Combustible, Cliente, Notificacion, ReporteSolicitudes, ReporteFlota, ReporteOperativo } from '@/types';
```

New:
```typescript
import { ApiResponse, LoginResponse, Usuario, UsuarioCompleto, Rol, Camion, TipoGrua, Solicitud, DashboardStats, Mantenimiento, Combustible, Cliente, Notificacion, ReporteSolicitudes, ReporteFlota, ReporteOperativo, Factura, ResumenFacturas, SolicitudFacturable, Evaluacion, PromedioChofer } from '@/types';
```

- [ ] **Step 3: Add API functions to api.ts**

Append these sections at the end of `frontend/src/lib/api.ts`:

```typescript

// ============================================================================
// FACTURAS
// ============================================================================

/** Listar facturas con filtro opcional por estado */
export async function listarFacturas(estado?: string): Promise<ApiResponse<Factura[]>> {
    const query = estado ? `?estado=${encodeURIComponent(estado)}` : '';
    return fetchAPI<Factura[]>(`/api/facturas${query}`);
}

/** Obtener una factura por ID */
export async function obtenerFactura(id: number): Promise<ApiResponse<Factura>> {
    return fetchAPI<Factura>(`/api/facturas/${id}`);
}

/** Crear una nueva factura */
export async function crearFactura(datos: { solicitud_id: number; subtotal: number; descripcion?: string; notas?: string }): Promise<ApiResponse<Factura>> {
    return fetchAPI<Factura>('/api/facturas', {
        method: 'POST',
        body: JSON.stringify(datos),
    });
}

/** Marcar factura como pagada */
export async function marcarFacturaPagada(id: number): Promise<ApiResponse<Factura>> {
    return fetchAPI<Factura>(`/api/facturas/${id}/pagar`, { method: 'PUT' });
}

/** Anular una factura */
export async function anularFactura(id: number): Promise<ApiResponse<Factura>> {
    return fetchAPI<Factura>(`/api/facturas/${id}/anular`, { method: 'PUT' });
}

/** Obtener resumen de facturas */
export async function obtenerResumenFacturas(): Promise<ApiResponse<ResumenFacturas>> {
    return fetchAPI<ResumenFacturas>('/api/facturas/resumen');
}

/** Listar solicitudes finalizadas sin factura */
export async function listarSolicitudesSinFactura(): Promise<ApiResponse<SolicitudFacturable[]>> {
    return fetchAPI<SolicitudFacturable[]>('/api/facturas/solicitudes-sin-factura');
}

// ============================================================================
// EVALUACIONES
// ============================================================================

/** Crear una evaluacion (solo clientes) */
export async function crearEvaluacion(datos: { solicitud_id: number; calificacion: number; comentario?: string }): Promise<ApiResponse<Evaluacion>> {
    return fetchAPI<Evaluacion>('/api/evaluaciones', {
        method: 'POST',
        body: JSON.stringify(datos),
    });
}

/** Obtener evaluacion de una solicitud */
export async function obtenerEvaluacionPorSolicitud(solicitudId: number): Promise<ApiResponse<Evaluacion>> {
    return fetchAPI<Evaluacion>(`/api/evaluaciones/solicitud/${solicitudId}`);
}

/** Listar evaluaciones con filtro opcional por chofer */
export async function listarEvaluaciones(choferId?: number): Promise<ApiResponse<Evaluacion[]>> {
    const query = choferId ? `?chofer_id=${choferId}` : '';
    return fetchAPI<Evaluacion[]>(`/api/evaluaciones${query}`);
}

/** Obtener promedios de calificacion por chofer */
export async function obtenerPromediosChoferes(): Promise<ApiResponse<PromedioChofer[]>> {
    return fetchAPI<PromedioChofer[]>('/api/evaluaciones/promedios');
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts
git commit -m "feat(frontend): add types and API functions for facturas and evaluaciones"
```

---

## Task 8: Icons and sidebar

**Files:**
- Modify: `frontend/src/components/Icon.tsx` (add `invoice` and `star` icons to the icons map)
- Modify: `frontend/src/app/dashboard/layout.tsx:22-43` (add menu entries)

- [ ] **Step 1: Add icons to Icon.tsx**

Find the icons map object in `Icon.tsx` and add these two entries. Add them before the closing of the `icons` Record. The exact insertion point is after the last icon entry (before the closing `};` or `}` of the icons map).

`invoice` icon (document with lines):
```typescript
    invoice: (
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 9H7v-2h6v2zm4-4H7V5h6v2h4zm-4 8H7v-2h6v2z" />
    ),
```

`star` icon (5-point star):
```typescript
    star: (
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    ),
```

- [ ] **Step 2: Add sidebar entries to layout.tsx**

In the `menuItems` array in `layout.tsx`, add two new entries. Insert them after the Reportes entry and before the Usuarios entry:

```typescript
    { href: "/dashboard/facturacion", label: "Facturación", icon: "invoice",
      roles: ["Administrador"] },
    { href: "/dashboard/evaluaciones", label: "Evaluaciones", icon: "star",
      roles: ["Administrador", "Logística"] },
```

The order should be: ... Mantenimiento, Reportes, **Facturación**, **Evaluaciones**, Usuarios, Mis Servicios, Mis Solicitudes.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Icon.tsx frontend/src/app/dashboard/layout.tsx
git commit -m "feat(frontend): add invoice/star icons and sidebar entries for facturacion/evaluaciones"
```

---

## Task 9: StarRating component

**Files:**
- Create: `frontend/src/components/StarRating.tsx`

- [ ] **Step 1: Create StarRating component**

Create `frontend/src/components/StarRating.tsx`:

```typescript
"use client";

/**
 * ============================================================================
 * Componente StarRating — Calificacion con estrellas
 * ============================================================================
 * Muestra estrellas de 1 a 5. Modo interactivo (hover + click) o solo lectura.
 * Sin dependencias externas — SVG inline + CSS puro.
 * ============================================================================
 */

import { useState } from "react";

interface StarRatingProps {
    value: number;
    onChange?: (value: number) => void;
    readonly?: boolean;
    size?: number;
}

export default function StarRating({ value, onChange, readonly = false, size = 24 }: StarRatingProps) {
    const [hoverValue, setHoverValue] = useState(0);

    const displayValue = hoverValue || value;

    return (
        <div
            style={{ display: "inline-flex", gap: "2px", cursor: readonly ? "default" : "pointer" }}
            onMouseLeave={() => !readonly && setHoverValue(0)}
        >
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    width={size}
                    height={size}
                    viewBox="0 0 24 24"
                    fill={star <= displayValue ? "#f5a623" : "var(--border-color, #ccc)"}
                    style={{ transition: "fill 0.15s ease" }}
                    onMouseEnter={() => !readonly && setHoverValue(star)}
                    onClick={() => !readonly && onChange?.(star)}
                >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            ))}
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/StarRating.tsx
git commit -m "feat(frontend): add reusable StarRating component"
```

---

## Task 10: Facturacion frontend page

**Files:**
- Create: `frontend/src/app/dashboard/facturacion/page.tsx`

- [ ] **Step 1: Create facturacion page**

Create `frontend/src/app/dashboard/facturacion/page.tsx`:

```typescript
"use client";

/**
 * ============================================================================
 * Página de Facturación
 * ============================================================================
 * Gestión de facturas: crear desde solicitudes finalizadas, marcar pagadas,
 * anular, exportar PDF. Solo accesible por Administradores.
 * ============================================================================
 */

import { useEffect, useState } from "react";
import {
    listarFacturas, crearFactura, marcarFacturaPagada, anularFactura,
    obtenerResumenFacturas, listarSolicitudesSinFactura
} from "@/lib/api";
import { Factura, ResumenFacturas, SolicitudFacturable } from "@/types";
import Icon from "@/components/Icon";

export default function FacturacionPage() {
    const [facturas, setFacturas] = useState<Factura[]>([]);
    const [resumen, setResumen] = useState<ResumenFacturas | null>(null);
    const [loading, setLoading] = useState(true);
    const [filtroEstado, setFiltroEstado] = useState("");
    const [modalCrear, setModalCrear] = useState(false);
    const [solicitudesDisponibles, setSolicitudesDisponibles] = useState<SolicitudFacturable[]>([]);
    const [form, setForm] = useState({ solicitud_id: 0, subtotal: "", descripcion: "", notas: "" });
    const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudFacturable | null>(null);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    async function cargarDatos() {
        setLoading(true);
        try {
            const [resFact, resResumen] = await Promise.all([
                listarFacturas(filtroEstado || undefined),
                obtenerResumenFacturas(),
            ]);
            if (resFact.success && resFact.data) setFacturas(resFact.data);
            if (resResumen.success && resResumen.data) setResumen(resResumen.data);
        } catch { setError("Error al cargar datos."); }
        setLoading(false);
    }

    useEffect(() => { cargarDatos(); }, [filtroEstado]);

    async function abrirModalCrear() {
        setError("");
        try {
            const res = await listarSolicitudesSinFactura();
            if (res.success && res.data) setSolicitudesDisponibles(res.data);
        } catch { /* empty */ }
        setForm({ solicitud_id: 0, subtotal: "", descripcion: "", notas: "" });
        setSolicitudSeleccionada(null);
        setModalCrear(true);
    }

    function seleccionarSolicitud(id: number) {
        const sol = solicitudesDisponibles.find(s => s.id === id) || null;
        setSolicitudSeleccionada(sol);
        setForm({ ...form, solicitud_id: id, descripcion: sol?.descripcion_problema || "" });
    }

    async function handleCrear() {
        setError("");
        if (!form.solicitud_id) { setError("Seleccione una solicitud."); return; }
        const subtotal = parseFloat(form.subtotal);
        if (isNaN(subtotal) || subtotal <= 0) { setError("Ingrese un subtotal válido."); return; }

        try {
            const res = await crearFactura({
                solicitud_id: form.solicitud_id,
                subtotal,
                descripcion: form.descripcion || undefined,
                notas: form.notas || undefined,
            });
            if (res.success) {
                setMensaje("Factura emitida exitosamente.");
                setModalCrear(false);
                cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            } else { setError(res.message || "Error al crear factura."); }
        } catch { setError("Error de conexión."); }
    }

    async function handlePagar(id: number) {
        if (!confirm("¿Marcar esta factura como pagada?")) return;
        try {
            const res = await marcarFacturaPagada(id);
            if (res.success) {
                setMensaje("Factura marcada como pagada.");
                cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            } else { setError(res.message || "Error."); }
        } catch { setError("Error de conexión."); }
    }

    async function handleAnular(id: number) {
        if (!confirm("¿Anular esta factura? Esta acción no se puede deshacer.")) return;
        try {
            const res = await anularFactura(id);
            if (res.success) {
                setMensaje("Factura anulada.");
                cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            } else { setError(res.message || "Error."); }
        } catch { setError("Error de conexión."); }
    }

    function exportarPDF(factura: Factura) {
        const w = window.open("", "_blank");
        if (!w) return;
        w.document.write(`
<!DOCTYPE html>
<html><head><title>Factura ${factura.numero_factura}</title>
<style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #FA8112; padding-bottom: 20px; margin-bottom: 30px; }
    .company h1 { margin: 0; color: #FA8112; font-size: 22px; }
    .company p { margin: 2px 0; font-size: 12px; color: #666; }
    .factura-info { text-align: right; }
    .factura-info h2 { margin: 0; font-size: 18px; }
    .factura-info p { margin: 2px 0; font-size: 13px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .badge-pendiente { background: #fff3cd; color: #856404; }
    .badge-pagada { background: #d4edda; color: #155724; }
    .badge-anulada { background: #f8d7da; color: #721c24; }
    .seccion { margin-bottom: 25px; }
    .seccion h3 { font-size: 14px; color: #666; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px; }
    .totales { border-top: 2px solid #333; margin-top: 20px; padding-top: 15px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .total-row.grand { font-size: 18px; font-weight: bold; color: #FA8112; border-top: 1px solid #ccc; padding-top: 8px; margin-top: 8px; }
    .notas { background: #f9f9f9; padding: 12px; border-radius: 6px; font-size: 13px; margin-top: 20px; }
    @media print { body { padding: 20px; } }
</style></head><body>
<div class="header">
    <div class="company">
        <h1>Grúas Heredianas Gimome S.A.</h1>
        <p>Cédula Jurídica: 3-101-000000</p>
        <p>Heredia, Costa Rica</p>
        <p>Tel: (506) 2222-0000</p>
    </div>
    <div class="factura-info">
        <h2>${factura.numero_factura}</h2>
        <p>Fecha: ${new Date(factura.fecha_emision).toLocaleDateString("es-CR")}</p>
        <p><span class="badge badge-${factura.estado.toLowerCase()}">${factura.estado}</span></p>
    </div>
</div>

<div class="seccion">
    <h3>Datos del Cliente</h3>
    <div class="grid">
        <div><strong>Nombre:</strong> ${factura.cliente_nombre}</div>
        <div><strong>Teléfono:</strong> ${factura.cliente_telefono || "—"}</div>
        <div><strong>Email:</strong> ${factura.cliente_email || "—"}</div>
        <div><strong>Solicitud:</strong> ${factura.numero_servicio || "—"}</div>
    </div>
</div>

<div class="seccion">
    <h3>Detalle del Servicio</h3>
    <p style="font-size:14px">${factura.descripcion || "Servicio de grúa"}</p>
</div>

<div class="totales">
    <div class="total-row"><span>Subtotal</span><span>₡${factura.subtotal.toLocaleString("es-CR", { minimumFractionDigits: 2 })}</span></div>
    <div class="total-row"><span>IVA (${factura.impuesto_pct}%)</span><span>₡${factura.impuesto_monto.toLocaleString("es-CR", { minimumFractionDigits: 2 })}</span></div>
    <div class="total-row grand"><span>Total</span><span>₡${factura.total.toLocaleString("es-CR", { minimumFractionDigits: 2 })}</span></div>
</div>

${factura.fecha_pago ? `<p style="font-size:13px;color:#155724;margin-top:15px"><strong>Pagada el:</strong> ${new Date(factura.fecha_pago).toLocaleDateString("es-CR")}</p>` : ""}
${factura.notas ? `<div class="notas"><strong>Notas:</strong> ${factura.notas}</div>` : ""}

<script>window.onload = function() { window.print(); }</script>
</body></html>`);
        w.document.close();
    }

    function formatFecha(fecha: string | null): string {
        if (!fecha) return "—";
        return new Date(fecha).toLocaleDateString("es-CR", { day: "2-digit", month: "short", year: "numeric" });
    }

    function formatMoneda(monto: number): string {
        return "₡" + monto.toLocaleString("es-CR", { minimumFractionDigits: 2 });
    }

    function getBadgeEstado(estado: string) {
        const map: Record<string, string> = {
            "Pendiente": "badge-warning", "Pagada": "badge-disponible", "Anulada": "badge-danger",
        };
        return map[estado] || "badge-info";
    }

    const subtotalNum = parseFloat(form.subtotal) || 0;
    const impuestoCalc = Math.round(subtotalNum * 0.13 * 100) / 100;
    const totalCalc = Math.round((subtotalNum + impuestoCalc) * 100) / 100;

    return (
        <div className="page-enter">
            {mensaje && <div className="alert alert-success">{mensaje}</div>}
            {error && !modalCrear && <div className="alert alert-error">{error}</div>}

            {/* Resumen */}
            {resumen && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                    <div className="glass-panel" style={{ padding: "16px", textAlign: "center" }}>
                        <div className="text-muted" style={{ fontSize: "13px" }}>Pendiente de cobro</div>
                        <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-warning, #e6a817)" }}>{formatMoneda(resumen.total_pendiente)}</div>
                        <div className="text-muted" style={{ fontSize: "12px" }}>{resumen.cantidad_pendientes} facturas</div>
                    </div>
                    <div className="glass-panel" style={{ padding: "16px", textAlign: "center" }}>
                        <div className="text-muted" style={{ fontSize: "13px" }}>Total cobrado</div>
                        <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-success, #28a745)" }}>{formatMoneda(resumen.total_pagado)}</div>
                        <div className="text-muted" style={{ fontSize: "12px" }}>{resumen.cantidad_pagadas} facturas</div>
                    </div>
                    <div className="glass-panel" style={{ padding: "16px", textAlign: "center" }}>
                        <div className="text-muted" style={{ fontSize: "13px" }}>Anuladas</div>
                        <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-danger, #dc3545)" }}>{resumen.cantidad_anuladas}</div>
                    </div>
                </div>
            )}

            <div className="glass-panel" style={{ padding: "20px" }}>
                <div className="panel-header">
                    <h3 className="panel-title">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                            <Icon name="invoice" size={22} /> Facturación
                        </span>
                    </h3>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <select className="form-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                            style={{ minWidth: "140px" }}>
                            <option value="">Todas</option>
                            <option value="Pendiente">Pendiente</option>
                            <option value="Pagada">Pagada</option>
                            <option value="Anulada">Anulada</option>
                        </select>
                        <button className="btn btn-primary" onClick={abrirModalCrear}>
                            <Icon name="add" size={18} /> Nueva Factura
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">Cargando...</div>
                ) : facturas.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">
                        No hay facturas registradas.
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>N° Factura</th><th>Fecha</th><th>Cliente</th>
                                    <th>Descripción</th><th>Total</th><th>Estado</th><th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {facturas.map(f => (
                                    <tr key={f.id}>
                                        <td style={{ fontWeight: 500 }}>{f.numero_factura}</td>
                                        <td className="text-muted">{formatFecha(f.fecha_emision)}</td>
                                        <td>{f.cliente_nombre}</td>
                                        <td className="text-muted" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {f.descripcion || "—"}
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{formatMoneda(f.total)}</td>
                                        <td>
                                            <span className={`badge ${getBadgeEstado(f.estado)}`}>{f.estado}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: "4px" }}>
                                                {f.estado === "Pendiente" && (
                                                    <>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handlePagar(f.id)} title="Marcar pagada">
                                                            <Icon name="check" size={14} /> Pagar
                                                        </button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleAnular(f.id)} title="Anular">
                                                            <Icon name="close" size={14} /> Anular
                                                        </button>
                                                    </>
                                                )}
                                                <button className="btn btn-ghost btn-sm" onClick={() => exportarPDF(f)} title="Exportar PDF">
                                                    <Icon name="chart" size={14} /> PDF
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal: Nueva Factura */}
            {modalCrear && (
                <div className="modal-overlay" onClick={() => setModalCrear(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Nueva Factura</h3>
                            <button className="modal-close" onClick={() => setModalCrear(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        {error && <div className="alert alert-error">{error}</div>}

                        <div className="form-group">
                            <label className="form-label">Solicitud finalizada *</label>
                            <select className="form-select" value={form.solicitud_id}
                                onChange={e => seleccionarSolicitud(parseInt(e.target.value))}>
                                <option value={0}>Seleccione una solicitud...</option>
                                {solicitudesDisponibles.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.numero_servicio} — {s.cliente_nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {solicitudSeleccionada && (
                            <div className="glass-panel" style={{ padding: "12px", marginBottom: "12px", fontSize: "13px" }}>
                                <div><strong>Cliente:</strong> {solicitudSeleccionada.cliente_nombre}</div>
                                <div><strong>Teléfono:</strong> {solicitudSeleccionada.cliente_telefono || "—"}</div>
                                <div><strong>Email:</strong> {solicitudSeleccionada.cliente_email || "—"}</div>
                                <div><strong>Finalizada:</strong> {formatFecha(solicitudSeleccionada.fecha_finalizacion)}</div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Subtotal (₡) *</label>
                            <input className="form-input" type="number" min="0" step="0.01"
                                value={form.subtotal} placeholder="Monto del servicio"
                                onChange={e => setForm({ ...form, subtotal: e.target.value })} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Descripción</label>
                            <textarea className="form-input" rows={2} value={form.descripcion}
                                placeholder="Descripción del servicio facturado"
                                onChange={e => setForm({ ...form, descripcion: e.target.value })} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notas</label>
                            <textarea className="form-input" rows={2} value={form.notas}
                                placeholder="Notas adicionales (opcional)"
                                onChange={e => setForm({ ...form, notas: e.target.value })} />
                        </div>

                        {subtotalNum > 0 && (
                            <div className="glass-panel" style={{ padding: "12px", marginBottom: "12px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                                    <span>Subtotal</span><span>{formatMoneda(subtotalNum)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                                    <span>IVA (13%)</span><span>{formatMoneda(impuestoCalc)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 700, borderTop: "1px solid var(--border-color)", paddingTop: "8px", marginTop: "8px", color: "var(--color-primary)" }}>
                                    <span>Total</span><span>{formatMoneda(totalCalc)}</span>
                                </div>
                            </div>
                        )}

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalCrear(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleCrear}>Emitir Factura</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/dashboard/facturacion/page.tsx
git commit -m "feat(frontend): add facturacion page with CRUD, filters, and PDF export"
```

---

## Task 11: Evaluaciones frontend page

**Files:**
- Create: `frontend/src/app/dashboard/evaluaciones/page.tsx`

- [ ] **Step 1: Create evaluaciones page**

Create `frontend/src/app/dashboard/evaluaciones/page.tsx`:

```typescript
"use client";

/**
 * ============================================================================
 * Página de Evaluaciones (Admin / Logística)
 * ============================================================================
 * Vista de consulta de todas las evaluaciones post-servicio.
 * Muestra promedios por chofer y tabla detallada con filtro por chofer.
 * ============================================================================
 */

import { useEffect, useState } from "react";
import { listarEvaluaciones, obtenerPromediosChoferes } from "@/lib/api";
import { Evaluacion, PromedioChofer } from "@/types";
import Icon from "@/components/Icon";
import StarRating from "@/components/StarRating";

export default function EvaluacionesPage() {
    const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
    const [promedios, setPromedios] = useState<PromedioChofer[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroChofer, setFiltroChofer] = useState<number | undefined>(undefined);
    const [error, setError] = useState("");

    async function cargarDatos() {
        setLoading(true);
        try {
            const [resEval, resProm] = await Promise.all([
                listarEvaluaciones(filtroChofer),
                obtenerPromediosChoferes(),
            ]);
            if (resEval.success && resEval.data) setEvaluaciones(resEval.data);
            if (resProm.success && resProm.data) setPromedios(resProm.data);
        } catch { setError("Error al cargar datos."); }
        setLoading(false);
    }

    useEffect(() => { cargarDatos(); }, [filtroChofer]);

    function formatFecha(fecha: string): string {
        return new Date(fecha).toLocaleDateString("es-CR", {
            day: "2-digit", month: "short", year: "numeric"
        });
    }

    return (
        <div className="page-enter">
            {error && <div className="alert alert-error">{error}</div>}

            {/* Promedios por chofer */}
            {promedios.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                    {promedios.map(p => (
                        <div key={p.chofer_id} className="glass-panel" style={{ padding: "16px", textAlign: "center", cursor: "pointer", border: filtroChofer === p.chofer_id ? "2px solid var(--color-primary)" : "2px solid transparent" }}
                            onClick={() => setFiltroChofer(filtroChofer === p.chofer_id ? undefined : p.chofer_id)}>
                            <div style={{ fontWeight: 600, marginBottom: "6px" }}>{p.chofer_nombre}</div>
                            <StarRating value={Math.round(p.promedio)} readonly size={20} />
                            <div style={{ fontSize: "13px", marginTop: "4px" }}>
                                <span style={{ fontWeight: 600 }}>{p.promedio.toFixed(1)}</span>
                                <span className="text-muted"> / 5 — {p.total_evaluaciones} evaluación{p.total_evaluaciones !== 1 ? "es" : ""}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="glass-panel" style={{ padding: "20px" }}>
                <div className="panel-header">
                    <h3 className="panel-title">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                            <Icon name="star" size={22} /> Evaluaciones
                        </span>
                    </h3>
                    {filtroChofer && (
                        <button className="btn btn-ghost" onClick={() => setFiltroChofer(undefined)}>
                            <Icon name="close" size={16} /> Quitar filtro
                        </button>
                    )}
                </div>

                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">Cargando...</div>
                ) : evaluaciones.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">
                        No hay evaluaciones registradas.
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th><th>Solicitud</th><th>Chofer</th>
                                    <th>Cliente</th><th>Calificación</th><th>Comentario</th>
                                </tr>
                            </thead>
                            <tbody>
                                {evaluaciones.map(ev => (
                                    <tr key={ev.id}>
                                        <td className="text-muted">{formatFecha(ev.fecha_creacion)}</td>
                                        <td style={{ fontWeight: 500 }}>{ev.numero_servicio}</td>
                                        <td>{ev.chofer_nombre}</td>
                                        <td>{ev.cliente_nombre}</td>
                                        <td><StarRating value={ev.calificacion} readonly size={18} /></td>
                                        <td className="text-muted" style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {ev.comentario || "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/dashboard/evaluaciones/page.tsx
git commit -m "feat(frontend): add evaluaciones page with driver averages and rating table"
```

---

## Task 12: Add evaluate button to Mis Solicitudes

**Files:**
- Modify: `frontend/src/app/dashboard/mis-solicitudes/page.tsx`

- [ ] **Step 1: Add evaluation imports and state**

At the top of `mis-solicitudes/page.tsx`, update the imports:

Add to the `@/lib/api` import: `crearEvaluacion, obtenerEvaluacionPorSolicitud`

Add to the `@/types` import: `Evaluacion`

Add a new import: `import StarRating from "@/components/StarRating";`

Add new state variables inside the component, after the existing state declarations:

```typescript
    const [modalEvaluar, setModalEvaluar] = useState(false);
    const [solicitudEvaluar, setSolicitudEvaluar] = useState<Solicitud | null>(null);
    const [evaluaciones, setEvaluaciones] = useState<Record<number, Evaluacion>>({});
    const [calificacion, setCalificacion] = useState(0);
    const [comentario, setComentario] = useState("");
```

- [ ] **Step 2: Add evaluation data loading**

After the `cargarSolicitudes` function, add a function to load evaluations for finalized requests:

```typescript
    async function cargarEvaluaciones(solicitudes: Solicitud[]) {
        const finalizadas = solicitudes.filter(s => s.estado === "Finalizada");
        const evals: Record<number, Evaluacion> = {};
        for (const s of finalizadas) {
            try {
                const res = await obtenerEvaluacionPorSolicitud(s.id);
                if (res.success && res.data) {
                    evals[s.id] = res.data;
                }
            } catch { /* empty */ }
        }
        setEvaluaciones(evals);
    }
```

Modify the `cargarSolicitudes` function: after `setSolicitudes(res.data);` add `cargarEvaluaciones(res.data);`

- [ ] **Step 3: Add evaluation submission handler**

Add after `cargarEvaluaciones`:

```typescript
    function abrirModalEvaluar(s: Solicitud) {
        setSolicitudEvaluar(s);
        setCalificacion(0);
        setComentario("");
        setError("");
        setModalEvaluar(true);
    }

    async function handleEvaluar() {
        setError("");
        if (!solicitudEvaluar) return;
        if (calificacion === 0) { setError("Seleccione una calificación."); return; }

        try {
            const res = await crearEvaluacion({
                solicitud_id: solicitudEvaluar.id,
                calificacion,
                comentario: comentario || undefined,
            });
            if (res.success) {
                setMensaje("¡Evaluación enviada! Gracias por su calificación.");
                setModalEvaluar(false);
                cargarSolicitudes();
                setTimeout(() => setMensaje(""), 3000);
            } else { setError(res.message || "Error al enviar evaluación."); }
        } catch { setError("Error de conexión."); }
    }
```

- [ ] **Step 4: Add evaluate button/indicator in the table**

In the table body, inside the `<td>` for Acciones (the last `<td>` in each row), add before the existing Detalle button:

```typescript
{s.estado === "Finalizada" && !evaluaciones[s.id] && (
    <button className="btn btn-ghost btn-sm" onClick={() => abrirModalEvaluar(s)}
        style={{ color: "#f5a623" }}>
        <Icon name="star" size={14} /> Evaluar
    </button>
)}
{s.estado === "Finalizada" && evaluaciones[s.id] && (
    <span style={{ marginRight: "4px" }}>
        <StarRating value={evaluaciones[s.id].calificacion} readonly size={14} />
    </span>
)}
```

- [ ] **Step 5: Add evaluation modal**

After the existing detail modal's closing `)}`, add the evaluation modal:

```typescript
            {/* Modal: Evaluar Servicio */}
            {modalEvaluar && solicitudEvaluar && (
                <div className="modal-overlay" onClick={() => setModalEvaluar(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Evaluar Servicio {solicitudEvaluar.numero_servicio}</h3>
                            <button className="modal-close" onClick={() => setModalEvaluar(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        {error && <div className="alert alert-error">{error}</div>}

                        <div style={{ textAlign: "center", margin: "20px 0" }}>
                            <p className="text-muted" style={{ marginBottom: "12px" }}>¿Cómo fue su experiencia?</p>
                            <StarRating value={calificacion} onChange={setCalificacion} size={36} />
                            <p style={{ marginTop: "8px", fontWeight: 600, fontSize: "14px" }}>
                                {calificacion === 0 ? "" : ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][calificacion]}
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Comentario (opcional)</label>
                            <textarea className="form-input" rows={3} value={comentario}
                                placeholder="Cuéntenos sobre su experiencia..."
                                onChange={e => setComentario(e.target.value)} />
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalEvaluar(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleEvaluar} disabled={calificacion === 0}>
                                Enviar Evaluación
                            </button>
                        </div>
                    </div>
                </div>
            )}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/dashboard/mis-solicitudes/page.tsx
git commit -m "feat(frontend): add evaluate button to mis-solicitudes for finalized requests"
```

---

## Task 13: Build and verify with Docker

**Files:** No file changes — verification only.

- [ ] **Step 1: Build all containers**

```bash
docker compose build frontend backend
```

Expected: Both images build successfully without TypeScript errors.

- [ ] **Step 2: Restart services**

```bash
docker compose down && docker compose up -d
```

Expected: All three services (frontend, backend, db) start and reach healthy state.

- [ ] **Step 3: Verify database tables**

Wait ~15 seconds for SQL Server to initialize, then check:

```bash
docker compose exec db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P '$DB_PASSWORD' -d gruas_heredianas -C -Q "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME IN ('facturas', 'evaluaciones')"
```

Expected: Both tables listed.

- [ ] **Step 4: Verify API health**

```bash
curl -s http://localhost:4000/api/health | jq
```

Expected: `{ "status": "ok", ... }`

- [ ] **Step 5: Final commit (if any Docker/build fixes were needed)**

Only if fixes were applied during verification.
