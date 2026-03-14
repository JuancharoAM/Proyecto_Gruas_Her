/**
 * ============================================================================
 * Controlador de Notificaciones
 * ============================================================================
 * Maneja las peticiones HTTP para el sistema de notificaciones.
 * Cada usuario solo puede acceder a sus propias notificaciones.
 * ============================================================================
 */

import { Request, Response } from 'express';
import * as notificacionesService from '../services/notificaciones.service';

/**
 * GET /api/notificaciones
 * Lista las notificaciones del usuario autenticado.
 */
export async function listar(req: Request, res: Response): Promise<void> {
    try {
        const userId = req.user!.userId;
        const notificaciones = await notificacionesService.listarPorUsuario(userId);
        res.json({ success: true, data: notificaciones });
    } catch (error) {
        console.error('Error al listar notificaciones:', error);
        res.status(500).json({ success: false, message: 'Error al obtener notificaciones.' });
    }
}

/**
 * GET /api/notificaciones/no-leidas
 * Retorna la cantidad de notificaciones no leidas del usuario.
 */
export async function contarNoLeidas(req: Request, res: Response): Promise<void> {
    try {
        const userId = req.user!.userId;
        const total = await notificacionesService.contarNoLeidas(userId);
        res.json({ success: true, data: { total } });
    } catch (error) {
        console.error('Error al contar notificaciones:', error);
        res.status(500).json({ success: false, message: 'Error al contar notificaciones.' });
    }
}

/**
 * PUT /api/notificaciones/:id/leer
 * Marca una notificacion como leida.
 */
export async function marcarLeida(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const userId = req.user!.userId;
        const actualizado = await notificacionesService.marcarLeida(id, userId);

        if (!actualizado) {
            res.status(404).json({ success: false, message: 'Notificacion no encontrada.' });
            return;
        }

        res.json({ success: true, message: 'Notificacion marcada como leida.' });
    } catch (error) {
        console.error('Error al marcar notificacion:', error);
        res.status(500).json({ success: false, message: 'Error al marcar notificacion.' });
    }
}

/**
 * PUT /api/notificaciones/leer-todas
 * Marca todas las notificaciones del usuario como leidas.
 */
export async function marcarTodasLeidas(req: Request, res: Response): Promise<void> {
    try {
        const userId = req.user!.userId;
        const cantidad = await notificacionesService.marcarTodasLeidas(userId);
        res.json({ success: true, message: `${cantidad} notificaciones marcadas como leidas.` });
    } catch (error) {
        console.error('Error al marcar notificaciones:', error);
        res.status(500).json({ success: false, message: 'Error al marcar notificaciones.' });
    }
}

/**
 * DELETE /api/notificaciones/:id
 * Elimina una notificacion del usuario.
 */
export async function eliminar(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const userId = req.user!.userId;
        const eliminado = await notificacionesService.eliminarNotificacion(id, userId);

        if (!eliminado) {
            res.status(404).json({ success: false, message: 'Notificacion no encontrada.' });
            return;
        }

        res.json({ success: true, message: 'Notificacion eliminada.' });
    } catch (error) {
        console.error('Error al eliminar notificacion:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar notificacion.' });
    }
}

/**
 * DELETE /api/notificaciones/limpiar
 * Elimina todas las notificaciones del usuario.
 */
export async function eliminarTodas(req: Request, res: Response): Promise<void> {
    try {
        const userId = req.user!.userId;
        const cantidad = await notificacionesService.eliminarTodas(userId);
        res.json({ success: true, message: `${cantidad} notificaciones eliminadas.` });
    } catch (error) {
        console.error('Error al limpiar notificaciones:', error);
        res.status(500).json({ success: false, message: 'Error al limpiar notificaciones.' });
    }
}
