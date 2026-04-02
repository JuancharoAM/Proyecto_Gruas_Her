import { Request, Response } from 'express';
import * as facturasService from '../services/facturas.service';

export async function listar(req: Request, res: Response): Promise<void> {
    try {
        const estado = req.query.estado as string | undefined;
        const facturas = await facturasService.listarFacturas(estado);
        res.json({ success: true, data: facturas });
    } catch (error) {
        console.error('Error al listar facturas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener facturas.' });
    }
}

export async function resumen(req: Request, res: Response): Promise<void> {
    try {
        const data = await facturasService.obtenerResumen();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error al obtener resumen:', error);
        res.status(500).json({ success: false, message: 'Error al obtener resumen de facturas.' });
    }
}

export async function solicitudesSinFactura(req: Request, res: Response): Promise<void> {
    try {
        const data = await facturasService.listarSolicitudesSinFactura();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error al listar solicitudes:', error);
        res.status(500).json({ success: false, message: 'Error al obtener solicitudes.' });
    }
}

export async function obtenerPorId(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const factura = await facturasService.obtenerPorId(id);
        if (!factura) {
            res.status(404).json({ success: false, message: 'Factura no encontrada.' });
            return;
        }
        res.json({ success: true, data: factura });
    } catch (error) {
        console.error('Error al obtener factura:', error);
        res.status(500).json({ success: false, message: 'Error al obtener factura.' });
    }
}

export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { solicitud_id, subtotal } = req.body;
        if (!solicitud_id || subtotal === undefined || subtotal === null) {
            res.status(400).json({ success: false, message: 'Los campos solicitud_id y subtotal son requeridos.' });
            return;
        }
        if (typeof subtotal !== 'number' || subtotal <= 0) {
            res.status(400).json({ success: false, message: 'El subtotal debe ser un número mayor a 0.' });
            return;
        }
        const factura = await facturasService.crearFactura(req.body, req.user!.userId);
        res.status(201).json({ success: true, data: factura, message: 'Factura emitida exitosamente.' });
    } catch (error: any) {
        console.error('Error al crear factura:', error);
        const msg = error.message;
        if (msg?.includes('no encontrada') || msg?.includes('finalizadas') || msg?.includes('Ya existe')) {
            res.status(400).json({ success: false, message: msg });
            return;
        }
        res.status(500).json({ success: false, message: 'Error al emitir factura.' });
    }
}

export async function pagar(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const factura = await facturasService.marcarPagada(id);
        if (!factura) {
            res.status(404).json({ success: false, message: 'Factura no encontrada.' });
            return;
        }
        res.json({ success: true, data: factura, message: 'Factura marcada como pagada.' });
    } catch (error: any) {
        console.error('Error al pagar factura:', error);
        if (error.message?.includes('pendientes')) {
            res.status(400).json({ success: false, message: error.message });
            return;
        }
        res.status(500).json({ success: false, message: 'Error al marcar factura como pagada.' });
    }
}

export async function anular(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const factura = await facturasService.anularFactura(id);
        if (!factura) {
            res.status(404).json({ success: false, message: 'Factura no encontrada.' });
            return;
        }
        res.json({ success: true, data: factura, message: 'Factura anulada exitosamente.' });
    } catch (error: any) {
        console.error('Error al anular factura:', error);
        if (error.message?.includes('pendientes')) {
            res.status(400).json({ success: false, message: error.message });
            return;
        }
        res.status(500).json({ success: false, message: 'Error al anular factura.' });
    }
}
