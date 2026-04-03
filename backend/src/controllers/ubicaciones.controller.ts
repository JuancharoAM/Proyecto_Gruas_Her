import { Request, Response } from 'express';
import * as ubicacionesService from '../services/ubicaciones.service';

export async function reportar(req: Request, res: Response): Promise<void> {
    try {
        const { camion_id, latitud, longitud } = req.body;
        if (!camion_id || latitud === undefined || longitud === undefined) {
            res.status(400).json({ success: false, message: 'Los campos camion_id, latitud y longitud son requeridos.' });
            return;
        }
        await ubicacionesService.reportarUbicacion({
            camion_id,
            chofer_id: req.user!.userId,
            latitud,
            longitud,
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error al reportar ubicacion:', error);
        res.status(500).json({ success: false, message: 'Error al reportar ubicación.' });
    }
}

export async function activas(req: Request, res: Response): Promise<void> {
    try {
        const data = await ubicacionesService.listarActivas();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error al obtener ubicaciones activas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener ubicaciones.' });
    }
}
