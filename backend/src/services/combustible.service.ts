/**
 * ============================================================================
 * Servicio de Combustible
 * ============================================================================
 *
 * Logica de negocio para el registro de cargas de combustible.
 * Incluye: listar, crear, eliminar y consultar por camion.
 * ============================================================================
 */

import { getPool } from '../config/database';

/** Interfaz de un registro de combustible */
export interface Combustible {
    id: number;
    camion_id: number;
    camion_placa: string;
    fecha: Date;
    litros: number;
    costo: number;
    kilometraje: number;
    estacion: string;
    registrado_por: number;
    registrado_por_nombre: string;
}

/** Datos para registrar una carga de combustible */
export interface CrearCombustibleDTO {
    camion_id: number;
    fecha?: string;
    litros: number;
    costo: number;
    kilometraje?: number;
    estacion?: string;
}

/**
 * Lista todos los registros de combustible.
 */
export async function listarCombustible(): Promise<Combustible[]> {
    const pool = await getPool();

    const result = await pool.request().query(`
        SELECT
            cb.id, cb.camion_id, c.placa AS camion_placa,
            cb.fecha, cb.litros, cb.costo, cb.kilometraje,
            cb.estacion, cb.registrado_por,
            u.nombre AS registrado_por_nombre
        FROM combustible cb
        INNER JOIN camiones c ON cb.camion_id = c.id
        INNER JOIN usuarios u ON cb.registrado_por = u.id
        ORDER BY cb.fecha DESC
    `);

    return result.recordset;
}

/**
 * Lista registros de combustible de un camion especifico.
 */
export async function listarPorCamion(camionId: number): Promise<Combustible[]> {
    const pool = await getPool();

    const result = await pool.request()
        .input('camion_id', camionId)
        .query(`
            SELECT
                cb.id, cb.camion_id, c.placa AS camion_placa,
                cb.fecha, cb.litros, cb.costo, cb.kilometraje,
                cb.estacion, cb.registrado_por,
                u.nombre AS registrado_por_nombre
            FROM combustible cb
            INNER JOIN camiones c ON cb.camion_id = c.id
            INNER JOIN usuarios u ON cb.registrado_por = u.id
            WHERE cb.camion_id = @camion_id
            ORDER BY cb.fecha DESC
        `);

    return result.recordset;
}

/**
 * Crea un nuevo registro de combustible.
 */
export async function crearCombustible(datos: CrearCombustibleDTO, userId: number): Promise<Combustible> {
    const pool = await getPool();

    const result = await pool.request()
        .input('camion_id', datos.camion_id)
        .input('fecha', datos.fecha || new Date())
        .input('litros', datos.litros)
        .input('costo', datos.costo)
        .input('kilometraje', datos.kilometraje || null)
        .input('estacion', datos.estacion || null)
        .input('registrado_por', userId)
        .query(`
            INSERT INTO combustible
                (camion_id, fecha, litros, costo, kilometraje, estacion, registrado_por)
            OUTPUT INSERTED.id
            VALUES
                (@camion_id, @fecha, @litros, @costo, @kilometraje, @estacion, @registrado_por)
        `);

    const nuevoId = result.recordset[0].id;

    // Obtener el registro recien creado con los JOINs
    const registro = await pool.request()
        .input('id', nuevoId)
        .query(`
            SELECT
                cb.id, cb.camion_id, c.placa AS camion_placa,
                cb.fecha, cb.litros, cb.costo, cb.kilometraje,
                cb.estacion, cb.registrado_por,
                u.nombre AS registrado_por_nombre
            FROM combustible cb
            INNER JOIN camiones c ON cb.camion_id = c.id
            INNER JOIN usuarios u ON cb.registrado_por = u.id
            WHERE cb.id = @id
        `);

    return registro.recordset[0];
}

/**
 * Elimina un registro de combustible.
 */
export async function eliminarCombustible(id: number): Promise<boolean> {
    const pool = await getPool();

    const result = await pool.request()
        .input('id', id)
        .query('DELETE FROM combustible WHERE id = @id');

    return result.rowsAffected[0] > 0;
}

/**
 * Obtiene un resumen de combustible.
 */
export async function obtenerResumen() {
    const pool = await getPool();

    const result = await pool.request().query(`
        SELECT
            COUNT(*) AS total_cargas,
            ISNULL(SUM(litros), 0) AS litros_total,
            ISNULL(SUM(costo), 0) AS costo_total
        FROM combustible
    `);

    return result.recordset[0];
}
