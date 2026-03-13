/**
 * ============================================================================
 * Controlador de Combustible
 * ============================================================================
 *
 * Maneja las solicitudes HTTP para el registro de cargas de combustible.
 * Accesible por Administradores y Logistica.
 * ============================================================================
 */

import { Request, Response } from 'express';
import * as combustibleService from '../services/combustible.service';

/**
 * GET /api/combustible
 * Lista registros de combustible. Si se pasa ?camion_id=X, filtra por camion.
 */
export async function listar(req: Request, res: Response): Promise<void> {
    try {
        const camionId = req.query.camion_id ? parseInt(req.query.camion_id as string) : null;

        const registros = camionId
            ? await combustibleService.listarPorCamion(camionId)
            : await combustibleService.listarCombustible();

        res.json({ success: true, data: registros });
    } catch (error) {
        console.error('Error al listar combustible:', error);
        res.status(500).json({ success: false, message: 'Error al obtener registros de combustible.' });
    }
}

/**
 * POST /api/combustible
 * Registra una nueva carga de combustible.
 */
export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { camion_id, litros, costo } = req.body;

        if (!camion_id || !litros || !costo) {
            res.status(400).json({
                success: false,
                message: 'Los campos camion_id, litros y costo son requeridos.',
            });
            return;
        }

        const registro = await combustibleService.crearCombustible(req.body, req.user!.userId);
        res.status(201).json({ success: true, data: registro, message: 'Carga de combustible registrada exitosamente.' });
    } catch (error: any) {
        console.error('Error al registrar combustible:', error);
        res.status(500).json({ success: false, message: 'Error al registrar carga de combustible.' });
    }
}

/**
 * DELETE /api/combustible/:id
 * Elimina un registro de combustible.
 */
export async function eliminar(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const eliminado = await combustibleService.eliminarCombustible(id);

        if (!eliminado) {
            res.status(404).json({ success: false, message: 'Registro de combustible no encontrado.' });
            return;
        }

        res.json({ success: true, message: 'Registro de combustible eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar combustible:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar registro de combustible.' });
    }
}

/**
 * GET /api/combustible/resumen
 * Obtiene resumen de combustible.
 */
export async function resumen(req: Request, res: Response): Promise<void> {
    try {
        const data = await combustibleService.obtenerResumen();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error al obtener resumen:', error);
        res.status(500).json({ success: false, message: 'Error al obtener resumen de combustible.' });
    }
}
