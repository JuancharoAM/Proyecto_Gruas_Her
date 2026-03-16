/**
 * ============================================================================
 * Servicio de Notificaciones
 * ============================================================================
 *
 * Logica de negocio para el sistema de notificaciones internas.
 * Incluye: listar, crear, marcar como leida/todas leidas, contar no leidas.
 *
 * Tipos de notificacion:
 *   - info: informacion general
 *   - asignacion: se asigno un servicio al usuario
 *   - estado: cambio de estado en una solicitud
 *   - mantenimiento: evento de mantenimiento
 *   - alerta: alerta del sistema
 * ============================================================================
 */

import { getPool } from '../config/database';

/** Interfaz de una notificacion */
export interface Notificacion {
    id: number;
    usuario_id: number;
    titulo: string;
    mensaje: string;
    tipo: string;
    leida: boolean;
    referencia_tipo: string | null;
    referencia_id: number | null;
    fecha_creacion: Date;
}

/** Datos para crear una notificacion */
export interface CrearNotificacionDTO {
    usuario_id: number;
    titulo: string;
    mensaje: string;
    tipo?: string;
    referencia_tipo?: string;
    referencia_id?: number;
}

/**
 * Lista las notificaciones de un usuario, ordenadas por fecha (mas recientes primero).
 * Limite: ultimas 50 notificaciones.
 */
export async function listarPorUsuario(usuarioId: number): Promise<Notificacion[]> {
    const pool = await getPool();
    const result = await pool.request()
        .input('usuario_id', usuarioId)
        .query(`
            SELECT TOP 50 id, usuario_id, titulo, mensaje, tipo, leida,
                   referencia_tipo, referencia_id, fecha_creacion
            FROM notificaciones
            WHERE usuario_id = @usuario_id
            ORDER BY fecha_creacion DESC
        `);
    return result.recordset;
}

/**
 * Cuenta las notificaciones no leidas de un usuario.
 */
export async function contarNoLeidas(usuarioId: number): Promise<number> {
    const pool = await getPool();
    const result = await pool.request()
        .input('usuario_id', usuarioId)
        .query(`SELECT COUNT(*) AS total FROM notificaciones WHERE usuario_id = @usuario_id AND leida = 0`);
    return result.recordset[0].total;
}

/**
 * Crea una nueva notificacion para un usuario.
 */
export async function crearNotificacion(datos: CrearNotificacionDTO): Promise<Notificacion> {
    const pool = await getPool();
    const result = await pool.request()
        .input('usuario_id', datos.usuario_id)
        .input('titulo', datos.titulo)
        .input('mensaje', datos.mensaje)
        .input('tipo', datos.tipo || 'info')
        .input('referencia_tipo', datos.referencia_tipo || null)
        .input('referencia_id', datos.referencia_id || null)
        .query(`
            INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, referencia_tipo, referencia_id)
            OUTPUT INSERTED.*
            VALUES (@usuario_id, @titulo, @mensaje, @tipo, @referencia_tipo, @referencia_id)
        `);
    return result.recordset[0];
}

/**
 * Crea notificaciones para multiples usuarios a la vez.
 * Util para notificar a todos los admins/logistica de un evento.
 */
export async function crearParaRol(rolNombre: string, datos: Omit<CrearNotificacionDTO, 'usuario_id'>): Promise<void> {
    const pool = await getPool();
    await pool.request()
        .input('rol_nombre', rolNombre)
        .input('titulo', datos.titulo)
        .input('mensaje', datos.mensaje)
        .input('tipo', datos.tipo || 'info')
        .input('referencia_tipo', datos.referencia_tipo || null)
        .input('referencia_id', datos.referencia_id || null)
        .query(`
            INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, referencia_tipo, referencia_id)
            SELECT u.id, @titulo, @mensaje, @tipo, @referencia_tipo, @referencia_id
            FROM usuarios u
            INNER JOIN roles r ON u.rol_id = r.id
            WHERE r.nombre = @rol_nombre AND u.activo = 1
        `);
}

/**
 * Marca una notificacion como leida.
 */
export async function marcarLeida(id: number, usuarioId: number): Promise<boolean> {
    const pool = await getPool();
    const result = await pool.request()
        .input('id', id)
        .input('usuario_id', usuarioId)
        .query(`UPDATE notificaciones SET leida = 1 WHERE id = @id AND usuario_id = @usuario_id`);
    return result.rowsAffected[0] > 0;
}

/**
 * Marca todas las notificaciones de un usuario como leidas.
 */
export async function marcarTodasLeidas(usuarioId: number): Promise<number> {
    const pool = await getPool();
    const result = await pool.request()
        .input('usuario_id', usuarioId)
        .query(`UPDATE notificaciones SET leida = 1 WHERE usuario_id = @usuario_id AND leida = 0`);
    return result.rowsAffected[0];
}

/**
 * Elimina una notificacion.
 */
export async function eliminarNotificacion(id: number, usuarioId: number): Promise<boolean> {
    const pool = await getPool();
    const result = await pool.request()
        .input('id', id)
        .input('usuario_id', usuarioId)
        .query(`DELETE FROM notificaciones WHERE id = @id AND usuario_id = @usuario_id`);
    return result.rowsAffected[0] > 0;
}

/**
 * Elimina todas las notificaciones de un usuario.
 */
export async function eliminarTodas(usuarioId: number): Promise<number> {
    const pool = await getPool();
    const result = await pool.request()
        .input('usuario_id', usuarioId)
        .query(`DELETE FROM notificaciones WHERE usuario_id = @usuario_id`);
    return result.rowsAffected[0];
}
