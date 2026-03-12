/**
 * ============================================================================
 * Controlador de Camiones (Flota)
 * ============================================================================
 * 
 * Maneja las solicitudes HTTP para la gestión de la flota de camiones.
 * Accesible por Administradores y Logística.
 * ============================================================================
 */

import { Request, Response } from 'express';
import * as camionesService from '../services/camiones.service';

/**
 * GET /api/camiones
 * Lista todos los camiones de la flota.
 */
export async function listar(req: Request, res: Response): Promise<void> {
    try {
        const camiones = await camionesService.listarCamiones();
        res.json({ success: true, data: camiones });
    } catch (error) {
        console.error('Error al listar camiones:', error);
        res.status(500).json({ success: false, message: 'Error al obtener camiones.' });
    }
}

/**
 * GET /api/camiones/:id
 * Obtiene el detalle de un camión específico.
 */
export async function obtenerPorId(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const camion = await camionesService.obtenerCamionPorId(id);

        if (!camion) {
            res.status(404).json({ success: false, message: 'Camión no encontrado.' });
            return;
        }

        res.json({ success: true, data: camion });
    } catch (error) {
        console.error('Error al obtener camión:', error);
        res.status(500).json({ success: false, message: 'Error al obtener camión.' });
    }
}

/**
 * POST /api/camiones
 * Registra un nuevo camión en la flota.
 * Campos requeridos: placa, tipo_grua_id
 */
export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { placa, tipo_grua_id } = req.body;

        if (!placa || !tipo_grua_id) {
            res.status(400).json({
                success: false,
                message: 'Los campos placa y tipo_grua_id son requeridos.',
            });
            return;
        }

        const camion = await camionesService.crearCamion(req.body);
        res.status(201).json({ success: true, data: camion, message: 'Camión registrado exitosamente.' });
    } catch (error: any) {
        console.error('Error al crear camión:', error);
        if (error.message.includes('placa')) {
            res.status(400).json({ success: false, message: error.message });
            return;
        }
        res.status(500).json({ success: false, message: 'Error al registrar camión.' });
    }
}

/**
 * PUT /api/camiones/:id
 * Actualiza los datos de un camión existente.
 */
export async function actualizar(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const camion = await camionesService.actualizarCamion(id, req.body);

        if (!camion) {
            res.status(404).json({ success: false, message: 'Camión no encontrado.' });
            return;
        }

        res.json({ success: true, data: camion, message: 'Camión actualizado exitosamente.' });
    } catch (error) {
        console.error('Error al actualizar camión:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar camión.' });
    }
}

/**
 * GET /api/camiones/tipos
 * Obtiene los tipos de grúa disponibles (para el selector en formulario).
 */
export async function listarTipos(req: Request, res: Response): Promise<void> {
    try {
        const tipos = await camionesService.listarTiposGrua();
        res.json({ success: true, data: tipos });
    } catch (error) {
        console.error('Error al listar tipos de grúa:', error);
        res.status(500).json({ success: false, message: 'Error al obtener tipos de grúa.' });
    }
}
