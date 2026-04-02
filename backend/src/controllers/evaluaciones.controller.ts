import { Request, Response } from 'express';
import * as evaluacionesService from '../services/evaluaciones.service';

export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { solicitud_id, calificacion } = req.body;
        if (!solicitud_id || calificacion === undefined) {
            res.status(400).json({ success: false, message: 'Los campos solicitud_id y calificacion son requeridos.' });
            return;
        }
        if (typeof calificacion !== 'number' || calificacion < 1 || calificacion > 5) {
            res.status(400).json({ success: false, message: 'La calificación debe ser un número entre 1 y 5.' });
            return;
        }
        const evaluacion = await evaluacionesService.crearEvaluacion(req.body, req.user!.userId);
        res.status(201).json({ success: true, data: evaluacion, message: 'Evaluación registrada exitosamente.' });
    } catch (error: any) {
        console.error('Error al crear evaluacion:', error);
        const msg = error.message;
        if (msg?.includes('no encontrada') || msg?.includes('finalizadas') || msg?.includes('Ya existe') || msg?.includes('chofer')) {
            res.status(400).json({ success: false, message: msg });
            return;
        }
        res.status(500).json({ success: false, message: 'Error al registrar evaluación.' });
    }
}

export async function obtenerPorSolicitud(req: Request, res: Response): Promise<void> {
    try {
        const solicitudId = parseInt(req.params.solicitudId);
        const evaluacion = await evaluacionesService.obtenerPorSolicitud(solicitudId);
        res.json({ success: true, data: evaluacion });
    } catch (error) {
        console.error('Error al obtener evaluacion:', error);
        res.status(500).json({ success: false, message: 'Error al obtener evaluación.' });
    }
}

export async function promedios(req: Request, res: Response): Promise<void> {
    try {
        const data = await evaluacionesService.promediosPorChofer();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error al obtener promedios:', error);
        res.status(500).json({ success: false, message: 'Error al obtener promedios.' });
    }
}

export async function listar(req: Request, res: Response): Promise<void> {
    try {
        const choferId = req.query.chofer_id ? parseInt(req.query.chofer_id as string) : undefined;
        const evaluaciones = await evaluacionesService.listarEvaluaciones(choferId);
        res.json({ success: true, data: evaluaciones });
    } catch (error) {
        console.error('Error al listar evaluaciones:', error);
        res.status(500).json({ success: false, message: 'Error al obtener evaluaciones.' });
    }
}
