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

export async function obtenerPorId(id: number): Promise<Factura | null> {
    const pool = await getPool();
    const result = await pool.request()
        .input('id', id)
        .query(`${SELECT_QUERY} WHERE f.id = @id`);
    return result.recordset.length > 0 ? result.recordset[0] : null;
}

export async function crearFactura(datos: CrearFacturaDTO, userId: number): Promise<Factura> {
    const pool = await getPool();

    const sol = await pool.request()
        .input('solicitud_id', datos.solicitud_id)
        .query(`SELECT id, estado, cliente_nombre, cliente_telefono, cliente_email FROM solicitudes WHERE id = @solicitud_id`);

    if (sol.recordset.length === 0) throw new Error('Solicitud no encontrada.');
    if (sol.recordset[0].estado !== 'Finalizada') throw new Error('Solo se pueden facturar solicitudes finalizadas.');

    const existe = await pool.request()
        .input('solicitud_id', datos.solicitud_id)
        .query(`SELECT id FROM facturas WHERE solicitud_id = @solicitud_id`);

    if (existe.recordset.length > 0) throw new Error('Ya existe una factura para esta solicitud.');

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

    await notificacionesService.crearParaRol('Administrador', {
        titulo: 'Nueva factura emitida',
        mensaje: `Se emitió la factura ${numeroFactura} por ₡${total.toLocaleString('es-CR')}`,
        tipo: 'info',
        referencia_tipo: 'factura',
        referencia_id: nuevoId,
    });

    return (await obtenerPorId(nuevoId))!;
}

export async function marcarPagada(id: number): Promise<Factura | null> {
    const pool = await getPool();
    const factura = await obtenerPorId(id);
    if (!factura) return null;
    if (factura.estado !== 'Pendiente') throw new Error('Solo se pueden pagar facturas pendientes.');

    await pool.request()
        .input('id', id)
        .input('fecha_pago', new Date())
        .query(`UPDATE facturas SET estado = 'Pagada', fecha_pago = @fecha_pago WHERE id = @id`);

    return obtenerPorId(id);
}

export async function anularFactura(id: number): Promise<Factura | null> {
    const pool = await getPool();
    const factura = await obtenerPorId(id);
    if (!factura) return null;
    if (factura.estado !== 'Pendiente') throw new Error('Solo se pueden anular facturas pendientes.');

    await pool.request()
        .input('id', id)
        .query(`UPDATE facturas SET estado = 'Anulada' WHERE id = @id`);

    return obtenerPorId(id);
}

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
