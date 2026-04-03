/**
 * Pruebas unitarias — evaluaciones.controller.ts
 */

jest.mock('../services/evaluaciones.service');

import { Request, Response } from 'express';
import * as evaluacionesController from '../controllers/evaluaciones.controller';
import * as evaluacionesService from '../services/evaluaciones.service';

const mockRes = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockReq = (overrides: Partial<Request> = {}) =>
    ({ body: {}, params: {}, query: {}, user: { userId: 20, email: 'cliente@test.com', rol: 'Cliente' }, ...overrides } as unknown as Request);

describe('evaluaciones.controller — crear', () => {
    it('responde 400 si falta solicitud_id', async () => {
        const req = mockReq({ body: { calificacion: 4 } });
        const res = mockRes();

        await evaluacionesController.crear(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('responde 400 si falta calificacion', async () => {
        const req = mockReq({ body: { solicitud_id: 10 } });
        const res = mockRes();

        await evaluacionesController.crear(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('responde 400 si calificacion es 0', async () => {
        const req = mockReq({ body: { solicitud_id: 10, calificacion: 0 } });
        const res = mockRes();

        await evaluacionesController.crear(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'La calificación debe ser un número entre 1 y 5.' })
        );
    });

    it('responde 400 si calificacion es 6', async () => {
        const req = mockReq({ body: { solicitud_id: 10, calificacion: 6 } });
        const res = mockRes();

        await evaluacionesController.crear(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'La calificación debe ser un número entre 1 y 5.' })
        );
    });

    it('responde 400 si calificacion no es número', async () => {
        const req = mockReq({ body: { solicitud_id: 10, calificacion: 'cinco' } });
        const res = mockRes();

        await evaluacionesController.crear(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responde 201 cuando el service crea la evaluación correctamente', async () => {
        const evaluacionMock = { id: 1, solicitud_id: 10, calificacion: 4, chofer_id: 5 };
        (evaluacionesService.crearEvaluacion as jest.Mock).mockResolvedValueOnce(evaluacionMock);

        const req = mockReq({ body: { solicitud_id: 10, calificacion: 4 } });
        const res = mockRes();

        await evaluacionesController.crear(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, data: evaluacionMock })
        );
    });

    it('responde 400 si el service lanza error de negocio conocido', async () => {
        (evaluacionesService.crearEvaluacion as jest.Mock).mockRejectedValueOnce(
            new Error('Solo se pueden evaluar solicitudes finalizadas.')
        );
        const req = mockReq({ body: { solicitud_id: 10, calificacion: 3 } });
        const res = mockRes();

        await evaluacionesController.crear(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Solo se pueden evaluar solicitudes finalizadas.' })
        );
    });

    it('responde 400 si el service lanza error de evaluación duplicada', async () => {
        (evaluacionesService.crearEvaluacion as jest.Mock).mockRejectedValueOnce(
            new Error('Ya existe una evaluación para esta solicitud.')
        );
        const req = mockReq({ body: { solicitud_id: 10, calificacion: 5 } });
        const res = mockRes();

        await evaluacionesController.crear(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Ya existe una evaluación para esta solicitud.' })
        );
    });
});
