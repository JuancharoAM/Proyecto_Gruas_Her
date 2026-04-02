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

export async function crearEvaluacion(datos: CrearEvaluacionDTO, userId: number): Promise<Evaluacion> {
    const pool = await getPool();

    const sol = await pool.request()
        .input('solicitud_id', datos.solicitud_id)
        .query(`SELECT id, estado, chofer_id, numero_servicio FROM solicitudes WHERE id = @solicitud_id`);

    if (sol.recordset.length === 0) throw new Error('Solicitud no encontrada.');
    if (sol.recordset[0].estado !== 'Finalizada') throw new Error('Solo se pueden evaluar solicitudes finalizadas.');
    if (!sol.recordset[0].chofer_id) throw new Error('La solicitud no tiene un chofer asignado.');

    const existe = await pool.request()
        .input('solicitud_id', datos.solicitud_id)
        .query(`SELECT id FROM evaluaciones WHERE solicitud_id = @solicitud_id`);

    if (existe.recordset.length > 0) throw new Error('Ya existe una evaluación para esta solicitud.');

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

export async function obtenerPorId(id: number): Promise<Evaluacion | null> {
    const pool = await getPool();
    const result = await pool.request()
        .input('id', id)
        .query(`${SELECT_QUERY} WHERE e.id = @id`);
    return result.recordset.length > 0 ? result.recordset[0] : null;
}

export async function obtenerPorSolicitud(solicitudId: number): Promise<Evaluacion | null> {
    const pool = await getPool();
    const result = await pool.request()
        .input('solicitud_id', solicitudId)
        .query(`${SELECT_QUERY} WHERE e.solicitud_id = @solicitud_id`);
    return result.recordset.length > 0 ? result.recordset[0] : null;
}

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
