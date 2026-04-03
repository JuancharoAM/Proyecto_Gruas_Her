/**
 * Pruebas unitarias — facturas.controller.ts
 */

jest.mock('../services/facturas.service');

import { Request, Response } from 'express';
import * as facturasController from '../controllers/facturas.controller';
import * as facturasService from '../services/facturas.service';

const mockRes = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockReq = (overrides: Partial<Request> = {}) =>
    ({ body: {}, params: {}, query: {}, user: { userId: 1, email: 'admin@test.com', rol: 'Administrador' }, ...overrides } as unknown as Request);

describe('facturas.controller — crear', () => {
    it('responde 400 si falta solicitud_id', async () => {
        const req = mockReq({ body: { subtotal: 50000 } });
        const res = mockRes();

        await facturasController.crear(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('responde 400 si falta subtotal', async () => {
        const req = mockReq({ body: { solicitud_id: 10 } });
        const res = mockRes();

        await facturasController.crear(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('responde 400 si subtotal es 0', async () => {
        const req = mockReq({ body: { solicitud_id: 10, subtotal: 0 } });
        const res = mockRes();

        await facturasController.crear(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'El subtotal debe ser un número mayor a 0.' })
        );
    });

    it('responde 400 si subtotal es negativo', async () => {
        const req = mockReq({ body: { solicitud_id: 10, subtotal: -500 } });
        const res = mockRes();

        await facturasController.crear(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responde 400 si el service lanza error de negocio conocido', async () => {
        (facturasService.crearFactura as jest.Mock).mockRejectedValueOnce(
            new Error('Solo se pueden facturar solicitudes finalizadas.')
        );
        const req = mockReq({ body: { solicitud_id: 10, subtotal: 50000 } });
        const res = mockRes();

        await facturasController.crear(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Solo se pueden facturar solicitudes finalizadas.' })
        );
    });
});

describe('facturas.controller — pagar', () => {
    it('responde 404 si la factura no existe', async () => {
        (facturasService.marcarPagada as jest.Mock).mockResolvedValueOnce(null);
        const req = mockReq({ params: { id: '999' } });
        const res = mockRes();

        await facturasController.pagar(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Factura no encontrada.' })
        );
    });

    it('responde 400 si el service lanza error de estado', async () => {
        (facturasService.marcarPagada as jest.Mock).mockRejectedValueOnce(
            new Error('Solo se pueden pagar facturas pendientes.')
        );
        const req = mockReq({ params: { id: '1' } });
        const res = mockRes();

        await facturasController.pagar(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Solo se pueden pagar facturas pendientes.' })
        );
    });
});

describe('facturas.controller — anular', () => {
    it('responde 404 si la factura no existe', async () => {
        (facturasService.anularFactura as jest.Mock).mockResolvedValueOnce(null);
        const req = mockReq({ params: { id: '999' } });
        const res = mockRes();

        await facturasController.anular(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Factura no encontrada.' })
        );
    });

    it('responde 400 si el service lanza error de estado', async () => {
        (facturasService.anularFactura as jest.Mock).mockRejectedValueOnce(
            new Error('Solo se pueden anular facturas pendientes.')
        );
        const req = mockReq({ params: { id: '1' } });
        const res = mockRes();

        await facturasController.anular(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Solo se pueden anular facturas pendientes.' })
        );
    });
});
