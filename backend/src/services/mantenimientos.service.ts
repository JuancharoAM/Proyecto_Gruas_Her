/**
 * ============================================================================
 * Servicio de Mantenimientos
 * ============================================================================
 *
 * Logica de negocio para la gestion de mantenimientos de la flota.
 * Incluye: listar, crear, completar, eliminar, obtener por camion y resumen.
 *
 * Flujo de estados:
 *   Crear mantenimiento > camion pasa a estado 'Mantenimiento'
 *   Completar mantenimiento > camion vuelve a estado 'Disponible'
 * ============================================================================
 */

import { getPool } from '../config/database';

/** Interfaz de un registro de mantenimiento */
export interface Mantenimiento {
    id: number;
    camion_id: number;
    camion_placa: string;
    tipo: string;
    estado: string;
    descripcion: string;
    fecha_mantenimiento: Date;
    fecha_completado: Date | null;
    costo: number;
    kilometraje_actual: number;
    fecha_proximo: Date | null;
    realizado_por: number;
    realizado_por_nombre: string;
    notas: string;
}

/** Datos para crear un mantenimiento */
export interface CrearMantenimientoDTO {
    camion_id: number;
    tipo: string;
    descripcion: string;
    fecha_mantenimiento?: string;
    costo?: number;
    kilometraje_actual?: number;
    fecha_proximo?: string;
    notas?: string;
    bloquear_grua?: boolean;
}

/** Datos para actualizar un mantenimiento */
export interface ActualizarMantenimientoDTO {
    tipo?: string;
    descripcion?: string;
    costo?: number;
    kilometraje_actual?: number;
    fecha_proximo?: string;
    notas?: string;
}

/** Query base SELECT para mantenimientos con JOINs */
const SELECT_QUERY = `
    SELECT
        m.id, m.camion_id, c.placa AS camion_placa,
        m.tipo, m.estado, m.descripcion, m.fecha_mantenimiento,
        m.fecha_completado, m.costo, m.kilometraje_actual, m.fecha_proximo,
        m.realizado_por, u.nombre AS realizado_por_nombre,
        m.notas
    FROM mantenimientos m
    INNER JOIN camiones c ON m.camion_id = c.id
    INNER JOIN usuarios u ON m.realizado_por = u.id
`;

/**
 * Lista todos los mantenimientos con datos del camion y usuario.
 */
export async function listarMantenimientos(): Promise<Mantenimiento[]> {
    const pool = await getPool();
    const result = await pool.request().query(`${SELECT_QUERY} ORDER BY m.fecha_mantenimiento DESC`);
    return result.recordset;
}

/**
 * Lista mantenimientos de un camion especifico.
 */
export async function listarPorCamion(camionId: number): Promise<Mantenimiento[]> {
    const pool = await getPool();
    const result = await pool.request()
        .input('camion_id', camionId)
        .query(`${SELECT_QUERY} WHERE m.camion_id = @camion_id ORDER BY m.fecha_mantenimiento DESC`);
    return result.recordset;
}

/**
 * Obtiene un mantenimiento por su ID.
 */
export async function obtenerPorId(id: number): Promise<Mantenimiento | null> {
    const pool = await getPool();
    const result = await pool.request()
        .input('id', id)
        .query(`${SELECT_QUERY} WHERE m.id = @id`);
    return result.recordset.length > 0 ? result.recordset[0] : null;
}

/**
 * Crea un nuevo registro de mantenimiento.
 * Si bloquear_grua es true, cambia el estado del camion a 'Mantenimiento'.
 */
export async function crearMantenimiento(datos: CrearMantenimientoDTO, userId: number): Promise<Mantenimiento> {
    const pool = await getPool();

    // Si bloquear_grua, poner el camion en estado Mantenimiento
    if (datos.bloquear_grua) {
        await pool.request()
            .input('camion_id', datos.camion_id)
            .query(`UPDATE camiones SET estado = 'Mantenimiento' WHERE id = @camion_id`);
    }

    const estado = datos.bloquear_grua ? 'En proceso' : 'Completado';

    const result = await pool.request()
        .input('camion_id', datos.camion_id)
        .input('tipo', datos.tipo)
        .input('estado', estado)
        .input('descripcion', datos.descripcion)
        .input('fecha_mantenimiento', datos.fecha_mantenimiento || new Date())
        .input('fecha_completado', estado === 'Completado' ? new Date() : null)
        .input('costo', datos.costo || 0)
        .input('kilometraje_actual', datos.kilometraje_actual || null)
        .input('fecha_proximo', datos.fecha_proximo || null)
        .input('realizado_por', userId)
        .input('notas', datos.notas || null)
        .query(`
            INSERT INTO mantenimientos
                (camion_id, tipo, estado, descripcion, fecha_mantenimiento, fecha_completado,
                 costo, kilometraje_actual, fecha_proximo, realizado_por, notas)
            OUTPUT INSERTED.id
            VALUES
                (@camion_id, @tipo, @estado, @descripcion, @fecha_mantenimiento, @fecha_completado,
                 @costo, @kilometraje_actual, @fecha_proximo, @realizado_por, @notas)
        `);

    const nuevoId = result.recordset[0].id;
    return (await obtenerPorId(nuevoId))!;
}

/**
 * Completa un mantenimiento en proceso.
 * Cambia el estado del mantenimiento a 'Completado' y el camion a 'Disponible'.
 */
export async function completarMantenimiento(id: number): Promise<Mantenimiento | null> {
    const pool = await getPool();

    // Obtener el mantenimiento
    const mant = await obtenerPorId(id);
    if (!mant) return null;
    if (mant.estado === 'Completado') {
        throw new Error('Este mantenimiento ya fue completado.');
    }

    // Marcar mantenimiento como completado
    await pool.request()
        .input('id', id)
        .input('fecha_completado', new Date())
        .query(`UPDATE mantenimientos SET estado = 'Completado', fecha_completado = @fecha_completado WHERE id = @id`);

    // Verificar si hay otros mantenimientos en proceso para ese camion
    const otros = await pool.request()
        .input('camion_id', mant.camion_id)
        .input('mant_id', id)
        .query(`SELECT COUNT(*) AS pendientes FROM mantenimientos WHERE camion_id = @camion_id AND estado = 'En proceso' AND id != @mant_id`);

    // Solo restaurar el camion a Disponible si no hay otros mantenimientos en proceso
    if (otros.recordset[0].pendientes === 0) {
        await pool.request()
            .input('camion_id', mant.camion_id)
            .query(`UPDATE camiones SET estado = 'Disponible' WHERE id = @camion_id AND estado = 'Mantenimiento'`);
    }

    return obtenerPorId(id);
}

/**
 * Actualiza un mantenimiento existente.
 */
export async function actualizarMantenimiento(id: number, datos: ActualizarMantenimientoDTO): Promise<Mantenimiento | null> {
    const pool = await getPool();

    const campos: string[] = [];
    const request = pool.request().input('id', id);

    if (datos.tipo !== undefined) { campos.push('tipo = @tipo'); request.input('tipo', datos.tipo); }
    if (datos.descripcion !== undefined) { campos.push('descripcion = @descripcion'); request.input('descripcion', datos.descripcion); }
    if (datos.costo !== undefined) { campos.push('costo = @costo'); request.input('costo', datos.costo); }
    if (datos.kilometraje_actual !== undefined) { campos.push('kilometraje_actual = @km'); request.input('km', datos.kilometraje_actual); }
    if (datos.fecha_proximo !== undefined) { campos.push('fecha_proximo = @fecha_proximo'); request.input('fecha_proximo', datos.fecha_proximo); }
    if (datos.notas !== undefined) { campos.push('notas = @notas'); request.input('notas', datos.notas); }

    if (campos.length === 0) {
        return obtenerPorId(id);
    }

    await request.query(`UPDATE mantenimientos SET ${campos.join(', ')} WHERE id = @id`);
    return obtenerPorId(id);
}

/**
 * Elimina un registro de mantenimiento.
 * Si estaba en proceso, restaura el camion a Disponible.
 */
export async function eliminarMantenimiento(id: number): Promise<boolean> {
    const pool = await getPool();

    // Verificar si estaba en proceso para restaurar el camion
    const mant = await obtenerPorId(id);
    if (!mant) return false;

    const result = await pool.request()
        .input('id', id)
        .query('DELETE FROM mantenimientos WHERE id = @id');

    if (result.rowsAffected[0] > 0 && mant.estado === 'En proceso') {
        // Verificar si hay otros mantenimientos en proceso
        const otros = await pool.request()
            .input('camion_id', mant.camion_id)
            .query(`SELECT COUNT(*) AS pendientes FROM mantenimientos WHERE camion_id = @camion_id AND estado = 'En proceso'`);

        if (otros.recordset[0].pendientes === 0) {
            await pool.request()
                .input('camion_id', mant.camion_id)
                .query(`UPDATE camiones SET estado = 'Disponible' WHERE id = @camion_id AND estado = 'Mantenimiento'`);
        }
    }

    return result.rowsAffected[0] > 0;
}

/**
 * Obtiene un resumen de mantenimientos para el dashboard.
 */
export async function obtenerResumen() {
    const pool = await getPool();

    const result = await pool.request().query(`
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN tipo = 'Preventivo' THEN 1 ELSE 0 END) AS preventivos,
            SUM(CASE WHEN tipo = 'Correctivo' THEN 1 ELSE 0 END) AS correctivos,
            SUM(CASE WHEN estado = 'En proceso' THEN 1 ELSE 0 END) AS en_proceso,
            SUM(costo) AS costo_total,
            (SELECT COUNT(*) FROM mantenimientos
             WHERE fecha_proximo IS NOT NULL AND fecha_proximo <= DATEADD(DAY, 7, GETDATE())
            ) AS proximos_vencer
        FROM mantenimientos
    `);

    return result.recordset[0];
}
