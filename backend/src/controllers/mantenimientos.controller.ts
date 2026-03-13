/**
 * ============================================================================
 * Controlador de Mantenimientos
 * ============================================================================
 *
 * Maneja las solicitudes HTTP para la gestion de mantenimientos.
 * Accesible por Administradores y Tecnicos.
 * ============================================================================
 */

import { Request, Response } from 'express';
import * as mantenimientosService from '../services/mantenimientos.service';

/**
 * GET /api/mantenimientos
 * Lista todos los mantenimientos. Si se pasa ?camion_id=X, filtra por camion.
 */
export async function listar(req: Request, res: Response): Promise<void> {
    try {
        const camionId = req.query.camion_id ? parseInt(req.query.camion_id as string) : null;

        const mantenimientos = camionId
            ? await mantenimientosService.listarPorCamion(camionId)
            : await mantenimientosService.listarMantenimientos();

        res.json({ success: true, data: mantenimientos });
    } catch (error) {
        console.error('Error al listar mantenimientos:', error);
        res.status(500).json({ success: false, message: 'Error al obtener mantenimientos.' });
    }
}

/**
 * GET /api/mantenimientos/:id
 * Obtiene el detalle de un mantenimiento.
 */
export async function obtenerPorId(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const mantenimiento = await mantenimientosService.obtenerPorId(id);

        if (!mantenimiento) {
            res.status(404).json({ success: false, message: 'Mantenimiento no encontrado.' });
            return;
        }

        res.json({ success: true, data: mantenimiento });
    } catch (error) {
        console.error('Error al obtener mantenimiento:', error);
        res.status(500).json({ success: false, message: 'Error al obtener mantenimiento.' });
    }
}

/**
 * POST /api/mantenimientos
 * Registra un nuevo mantenimiento.
 */
export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { camion_id, tipo, descripcion } = req.body;

        if (!camion_id || !tipo || !descripcion) {
            res.status(400).json({
                success: false,
                message: 'Los campos camion_id, tipo y descripcion son requeridos.',
            });
            return;
        }

        if (!['Preventivo', 'Correctivo'].includes(tipo)) {
            res.status(400).json({
                success: false,
                message: 'El tipo debe ser Preventivo o Correctivo.',
            });
            return;
        }

        const mantenimiento = await mantenimientosService.crearMantenimiento(req.body, req.user!.userId);
        res.status(201).json({ success: true, data: mantenimiento, message: 'Mantenimiento registrado exitosamente.' });
    } catch (error: any) {
        console.error('Error al crear mantenimiento:', error);
        res.status(500).json({ success: false, message: 'Error al registrar mantenimiento.' });
    }
}

/**
 * PUT /api/mantenimientos/:id
 * Actualiza un mantenimiento existente.
 */
export async function actualizar(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const mantenimiento = await mantenimientosService.actualizarMantenimiento(id, req.body);

        if (!mantenimiento) {
            res.status(404).json({ success: false, message: 'Mantenimiento no encontrado.' });
            return;
        }

        res.json({ success: true, data: mantenimiento, message: 'Mantenimiento actualizado exitosamente.' });
    } catch (error) {
        console.error('Error al actualizar mantenimiento:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar mantenimiento.' });
    }
}

/**
 * PUT /api/mantenimientos/:id/completar
 * Marca un mantenimiento como completado y restaura la grua a Disponible.
 */
export async function completar(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const mantenimiento = await mantenimientosService.completarMantenimiento(id);

        if (!mantenimiento) {
            res.status(404).json({ success: false, message: 'Mantenimiento no encontrado.' });
            return;
        }

        res.json({ success: true, data: mantenimiento, message: 'Mantenimiento completado. Grúa disponible nuevamente.' });
    } catch (error: any) {
        console.error('Error al completar mantenimiento:', error);
        if (error.message?.includes('ya fue completado')) {
            res.status(400).json({ success: false, message: error.message });
            return;
        }
        res.status(500).json({ success: false, message: 'Error al completar mantenimiento.' });
    }
}

/**
 * DELETE /api/mantenimientos/:id
 * Elimina un registro de mantenimiento.
 */
export async function eliminar(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const eliminado = await mantenimientosService.eliminarMantenimiento(id);

        if (!eliminado) {
            res.status(404).json({ success: false, message: 'Mantenimiento no encontrado.' });
            return;
        }

        res.json({ success: true, message: 'Mantenimiento eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar mantenimiento:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar mantenimiento.' });
    }
}

/**
 * GET /api/mantenimientos/resumen
 * Obtiene resumen de mantenimientos para dashboard.
 */
export async function resumen(req: Request, res: Response): Promise<void> {
    try {
        const data = await mantenimientosService.obtenerResumen();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error al obtener resumen:', error);
        res.status(500).json({ success: false, message: 'Error al obtener resumen de mantenimientos.' });
    }
}
