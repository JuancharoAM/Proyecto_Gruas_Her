/**
 * ============================================================================
 * Controlador de Solicitudes de Servicio
 * ============================================================================
 * 
 * Maneja las solicitudes HTTP para la gestión de solicitudes de grúa.
 * Incluye el flujo de asignación de grúa a solicitudes pendientes.
 * ============================================================================
 */

import { Request, Response } from 'express';
import * as solicitudesService from '../services/solicitudes.service';
import * as notificacionesService from '../services/notificaciones.service';

/**
 * GET /api/solicitudes
 * Lista las solicitudes de servicio. Acepta filtro por estado vía query string.
 * Ejemplo: GET /api/solicitudes?estado=Pendiente
 */
export async function listar(req: Request, res: Response): Promise<void> {
    try {
        const filtroEstado = req.query.estado as string | undefined;
        const solicitudes = await solicitudesService.listarSolicitudes(filtroEstado);
        res.json({ success: true, data: solicitudes });
    } catch (error) {
        console.error('Error al listar solicitudes:', error);
        res.status(500).json({ success: false, message: 'Error al obtener solicitudes.' });
    }
}

/**
 * GET /api/solicitudes/mis-servicios
 * Obtiene la lista de solicitudes asignadas al chofer autenticado.
 */
export async function listarMisServicios(req: Request, res: Response): Promise<void> {
    try {
        const userId = req.user!.userId;
        const solicitudes = await solicitudesService.listarServiciosChofer(userId);
        res.json({ success: true, data: solicitudes });
    } catch (error) {
        console.error('Error al listar mis servicios:', error);
        res.status(500).json({ success: false, message: 'Error al obtener mis servicios.' });
    }
}

/**
 * GET /api/solicitudes/mis-solicitudes
 * Obtiene la lista de solicitudes creadas por el cliente autenticado.
 */
export async function listarMisSolicitudes(req: Request, res: Response): Promise<void> {
    try {
        const userId = req.user!.userId;
        const solicitudes = await solicitudesService.listarSolicitudesCliente(userId);
        res.json({ success: true, data: solicitudes });
    } catch (error) {
        console.error('Error al listar solicitudes del cliente:', error);
        res.status(500).json({ success: false, message: 'Error al obtener sus solicitudes.' });
    }
}

/**
 * GET /api/solicitudes/:id
 * Obtiene el detalle completo de una solicitud.
 */
export async function obtenerPorId(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const solicitud = await solicitudesService.obtenerSolicitudPorId(id);

        if (!solicitud) {
            res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
            return;
        }

        res.json({ success: true, data: solicitud });
    } catch (error) {
        console.error('Error al obtener solicitud:', error);
        res.status(500).json({ success: false, message: 'Error al obtener solicitud.' });
    }
}

/**
 * POST /api/solicitudes
 * Crea una nueva solicitud de servicio de grúa.
 * Campos requeridos: cliente_nombre, ubicacion_origen
 * El número de servicio se genera automáticamente.
 */
export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { cliente_nombre, ubicacion_origen } = req.body;

        if (!cliente_nombre || !ubicacion_origen) {
            res.status(400).json({
                success: false,
                message: 'Los campos cliente_nombre y ubicacion_origen son requeridos.',
            });
            return;
        }

        // Si es un cliente, validar que no tenga una solicitud activa
        if (req.user!.rol === 'Cliente') {
            const tieneActiva = await solicitudesService.clienteTieneSolicitudActiva(req.user!.userId);
            if (tieneActiva) {
                res.status(400).json({
                    success: false,
                    message: 'Ya tiene una solicitud en curso. Debe esperar a que finalice o sea cancelada antes de crear otra.',
                });
                return;
            }
        }

        // Agregar el ID del usuario que crea la solicitud
        const datos = {
            ...req.body,
            creado_por: req.user!.userId,
        };

        const solicitud = await solicitudesService.crearSolicitud(datos);
        res.status(201).json({
            success: true,
            data: solicitud,
            message: `Solicitud ${solicitud.numero_servicio} creada exitosamente.`,
        });
    } catch (error) {
        console.error('Error al crear solicitud:', error);
        res.status(500).json({ success: false, message: 'Error al crear solicitud.' });
    }
}

/**
 * PUT /api/solicitudes/:id/asignar
 * Asigna una grúa y chofer a una solicitud pendiente.
 * Campos requeridos: camion_id, chofer_id
 * 
 * Este endpoint:
 * 1. Cambia el estado de la solicitud a "Asignada"
 * 2. Cambia el estado del camión a "En servicio"
 */
export async function asignar(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const { camion_id, chofer_id } = req.body;

        if (!camion_id || !chofer_id) {
            res.status(400).json({
                success: false,
                message: 'Los campos camion_id y chofer_id son requeridos para la asignación.',
            });
            return;
        }

        const solicitud = await solicitudesService.asignarGrua(id, { camion_id, chofer_id });

        // Notificar al chofer asignado
        try {
            await notificacionesService.crearNotificacion({
                usuario_id: chofer_id,
                titulo: `Servicio asignado: ${solicitud.numero_servicio}`,
                mensaje: `Se te ha asignado el servicio ${solicitud.numero_servicio}. Cliente: ${solicitud.cliente_nombre}. Origen: ${solicitud.ubicacion_origen}.`,
                tipo: 'asignacion',
                referencia_tipo: 'solicitud',
                referencia_id: solicitud.id,
            });
        } catch (e) { console.error('Error al crear notificacion de asignacion:', e); }

        res.json({
            success: true,
            data: solicitud,
            message: 'Grúa asignada exitosamente a la solicitud.',
        });
    } catch (error: any) {
        console.error('Error al asignar grúa:', error);
        // Si es un error de validación de negocio, retornar 400
        if (error.message.includes('no encontrad') || error.message.includes('no está') || error.message.includes('Solo se pueden')) {
            res.status(400).json({ success: false, message: error.message });
            return;
        }
        res.status(500).json({ success: false, message: 'Error al asignar grúa.' });
    }
}

/**
 * PUT /api/solicitudes/:id/reasignar
 * Reasigna grua y chofer a una solicitud que ya esta Asignada, En camino o Atendiendo.
 * Campos requeridos: camion_id, chofer_id
 */
export async function reasignar(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const { camion_id, chofer_id } = req.body;

        if (!camion_id || !chofer_id) {
            res.status(400).json({
                success: false,
                message: 'Los campos camion_id y chofer_id son requeridos para la reasignacion.',
            });
            return;
        }

        const solicitud = await solicitudesService.reasignarGrua(id, { camion_id, chofer_id });

        // Notificar al nuevo chofer
        try {
            await notificacionesService.crearNotificacion({
                usuario_id: chofer_id,
                titulo: `Servicio reasignado: ${solicitud.numero_servicio}`,
                mensaje: `Se te ha reasignado el servicio ${solicitud.numero_servicio}. Cliente: ${solicitud.cliente_nombre}. Origen: ${solicitud.ubicacion_origen}.`,
                tipo: 'asignacion',
                referencia_tipo: 'solicitud',
                referencia_id: solicitud.id,
            });
        } catch (e) { console.error('Error al crear notificacion de reasignacion:', e); }

        res.json({
            success: true,
            data: solicitud,
            message: 'Grua y chofer reasignados exitosamente.',
        });
    } catch (error: any) {
        console.error('Error al reasignar grua:', error);
        if (error.message.includes('no encontrad') || error.message.includes('no esta') || error.message.includes('Solo se puede')) {
            res.status(400).json({ success: false, message: error.message });
            return;
        }
        res.status(500).json({ success: false, message: 'Error al reasignar grua.' });
    }
}

/**
 * PUT /api/solicitudes/:id
 * Edita los datos de una solicitud existente.
 * Permite modificar datos del cliente, ubicaciones, descripción, prioridad, etc.
 */
export async function actualizar(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const solicitud = await solicitudesService.actualizarSolicitud(id, req.body);

        if (!solicitud) {
            res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
            return;
        }

        res.json({ success: true, data: solicitud, message: 'Solicitud actualizada exitosamente.' });
    } catch (error) {
        console.error('Error al actualizar solicitud:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar solicitud.' });
    }
}

/**
 * DELETE /api/solicitudes/:id
 * Elimina una solicitud de servicio de forma permanente.
 * Solo accesible por Administradores.
 * Si la solicitud tiene camión asignado activo, lo libera.
 */
export async function eliminar(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const eliminado = await solicitudesService.eliminarSolicitud(id);

        if (!eliminado) {
            res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
            return;
        }

        res.json({ success: true, message: 'Solicitud eliminada exitosamente.' });
    } catch (error: any) {
        console.error('Error al eliminar solicitud:', error);
        if (error.message.includes('No se puede eliminar')) {
            res.status(400).json({ success: false, message: error.message });
            return;
        }
        res.status(500).json({ success: false, message: 'Error al eliminar solicitud.' });
    }
}

/**
 * PUT /api/solicitudes/:id/estado
 * Actualiza el estado de una solicitud (ej. En camino, Atendiendo, Finalizada).
 * Valida reglas de negocio según el ciclo de vida y el rol del usuario.
 */
export async function actualizarEstado(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const { estado } = req.body;
        const userId = req.user!.userId;
        const rol = req.user!.rol;

        if (!estado) {
            res.status(400).json({
                success: false,
                message: 'El campo estado es requerido.',
            });
            return;
        }

        const solicitud = await solicitudesService.actualizarEstadoSolicitud(id, estado, userId, rol);

        // Notificar cambio de estado a usuarios relevantes
        try {
            // Notificar a admins y logistica del cambio
            await notificacionesService.crearParaRol('Administrador', {
                titulo: `${solicitud.numero_servicio} → ${estado}`,
                mensaje: `La solicitud ${solicitud.numero_servicio} cambio a estado "${estado}". Cliente: ${solicitud.cliente_nombre}.`,
                tipo: 'estado',
                referencia_tipo: 'solicitud',
                referencia_id: solicitud.id,
            });
            await notificacionesService.crearParaRol('Logística', {
                titulo: `${solicitud.numero_servicio} → ${estado}`,
                mensaje: `La solicitud ${solicitud.numero_servicio} cambio a estado "${estado}". Cliente: ${solicitud.cliente_nombre}.`,
                tipo: 'estado',
                referencia_tipo: 'solicitud',
                referencia_id: solicitud.id,
            });
            // Si hay chofer asignado y no es el que hizo el cambio, notificarlo
            if (solicitud.chofer_id && solicitud.chofer_id !== userId) {
                await notificacionesService.crearNotificacion({
                    usuario_id: solicitud.chofer_id,
                    titulo: `${solicitud.numero_servicio} → ${estado}`,
                    mensaje: `Tu servicio ${solicitud.numero_servicio} cambio a estado "${estado}".`,
                    tipo: 'estado',
                    referencia_tipo: 'solicitud',
                    referencia_id: solicitud.id,
                });
            }
        } catch (e) { console.error('Error al crear notificacion de estado:', e); }

        res.json({
            success: true,
            data: solicitud,
            message: `Estado actualizado a '${estado}' exitosamente.`,
        });
    } catch (error: any) {
        console.error('Error al actualizar estado:', error);
        // Errores de validación controlados por el sistema
        if (error.message.includes('No tienes permiso') || error.message.includes('Transición inválida') || error.message.includes('ya se encuentra') || error.message.includes('no encontrada')) {
            res.status(400).json({ success: false, message: error.message });
            return;
        }
        res.status(500).json({ success: false, message: 'Error al actualizar el estado de la solicitud.' });
    }
}

/**
 * GET /api/dashboard/stats
 * Obtiene estadísticas generales para el dashboard principal.
 * Combina estadísticas de solicitudes y de la flota.
 */
export async function obtenerEstadisticas(req: Request, res: Response): Promise<void> {
    try {
        // Importar servicio de camiones para estadísticas de flota
        const camionesService = require('../services/camiones.service');

        const [solicitudesStats, flotaStats] = await Promise.all([
            solicitudesService.obtenerEstadisticasSolicitudes(),
            camionesService.obtenerEstadisticasFlota(),
        ]);

        res.json({
            success: true,
            data: {
                solicitudes: solicitudesStats,
                flota: flotaStats,
            },
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas.' });
    }
}
