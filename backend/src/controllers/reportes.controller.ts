/**
 * ============================================================================
 * Controlador de Reportes
 * ============================================================================
 * Maneja las peticiones HTTP para la generacion de reportes.
 * Acceso: Administrador y Logistica.
 * ============================================================================
 */

import { Request, Response } from 'express';
import * as reportesService from '../services/reportes.service';

/**
 * GET /api/reportes/solicitudes
 * Reporte de solicitudes con filtro opcional de fechas.
 */
export async function reporteSolicitudes(req: Request, res: Response): Promise<void> {
    try {
        const { desde, hasta } = req.query;
        const data = await reportesService.reporteSolicitudes(
            desde as string | undefined,
            hasta as string | undefined
        );
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error en reporte de solicitudes:', error);
        res.status(500).json({ success: false, message: 'Error al generar reporte de solicitudes.' });
    }
}

/**
 * GET /api/reportes/flota
 * Reporte de flota (camiones, mantenimiento, combustible).
 */
export async function reporteFlota(req: Request, res: Response): Promise<void> {
    try {
        const data = await reportesService.reporteFlota();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error en reporte de flota:', error);
        res.status(500).json({ success: false, message: 'Error al generar reporte de flota.' });
    }
}

/**
 * GET /api/reportes/operativo
 * Reporte operativo (choferes, tiempos, costos).
 */
export async function reporteOperativo(req: Request, res: Response): Promise<void> {
    try {
        const data = await reportesService.reporteOperativo();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error en reporte operativo:', error);
        res.status(500).json({ success: false, message: 'Error al generar reporte operativo.' });
    }
}
