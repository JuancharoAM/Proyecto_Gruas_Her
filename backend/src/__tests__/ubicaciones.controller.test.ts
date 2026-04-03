/**
 * Pruebas unitarias — ubicaciones.controller.ts
 */

jest.mock('../services/ubicaciones.service');

import { Request, Response } from 'express';
import * as ubicacionesController from '../controllers/ubicaciones.controller';
import * as ubicacionesService from '../services/ubicaciones.service';

const mockRes = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockReq = (overrides: Partial<Request> = {}) =>
    ({ body: {}, params: {}, query: {}, user: { userId: 5, email: 'chofer@test.com', rol: 'Chofer' }, ...overrides } as unknown as Request);

describe('ubicaciones.controller — reportar', () => {
    it('responde 200 cuando el service ejecuta correctamente', async () => {
        (ubicacionesService.reportarUbicacion as jest.Mock).mockResolvedValueOnce(undefined);

        const req = mockReq({
            body: { camion_id: 3, latitud: 9.9281, longitud: -84.0907 },
        });
        const res = mockRes();

        await ubicacionesController.reportar(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('pasa chofer_id del token al service', async () => {
        (ubicacionesService.reportarUbicacion as jest.Mock).mockResolvedValueOnce(undefined);

        const req = mockReq({
            body: { camion_id: 3, latitud: 9.9281, longitud: -84.0907 },
        });
        const res = mockRes();

        await ubicacionesController.reportar(req, res);

        expect(ubicacionesService.reportarUbicacion).toHaveBeenCalledWith(
            expect.objectContaining({ chofer_id: 5 })
        );
    });

    it('responde 400 si falta camion_id', async () => {
        const req = mockReq({ body: { latitud: 9.9281, longitud: -84.0907 } });
        const res = mockRes();

        await ubicacionesController.reportar(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('responde 400 si falta latitud', async () => {
        const req = mockReq({ body: { camion_id: 3, longitud: -84.0907 } });
        const res = mockRes();

        await ubicacionesController.reportar(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe('ubicaciones.controller — activas', () => {
    it('responde 200 con array de ubicaciones', async () => {
        const ubicacionesMock = [
            { camion_id: 3, placa: 'GRU-001', chofer_nombre: 'Pedro', numero_servicio: 'SRV-001', cliente_nombre: 'Juan', latitud: 9.9, longitud: -84.0, fecha_reporte: new Date() },
        ];
        (ubicacionesService.listarActivas as jest.Mock).mockResolvedValueOnce(ubicacionesMock);

        const req = mockReq();
        const res = mockRes();

        await ubicacionesController.activas(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, data: ubicacionesMock })
        );
    });

    it('responde 200 con array vacio cuando no hay gruas activas', async () => {
        (ubicacionesService.listarActivas as jest.Mock).mockResolvedValueOnce([]);

        const req = mockReq();
        const res = mockRes();

        await ubicacionesController.activas(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, data: [] })
        );
    });
});
