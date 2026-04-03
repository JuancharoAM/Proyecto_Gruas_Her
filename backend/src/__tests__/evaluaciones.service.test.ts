/**
 * Pruebas unitarias — evaluaciones.service.ts
 */

const mockQuery = jest.fn();
const mockRequest = {
    input: jest.fn().mockReturnThis(),
    query: mockQuery,
};
const mockPool = {
    request: jest.fn().mockReturnValue(mockRequest),
};

jest.mock('../config/database', () => ({
    getPool: jest.fn().mockResolvedValue(mockPool),
}));

const mockCrearNotificacion = jest.fn().mockResolvedValue(undefined);
jest.mock('../services/notificaciones.service', () => ({
    crearNotificacion: mockCrearNotificacion,
    crearParaRol: jest.fn().mockResolvedValue(undefined),
}));

import * as evaluacionesService from '../services/evaluaciones.service';

const evaluacionEjemplo = {
    id: 1,
    solicitud_id: 10,
    numero_servicio: 'SRV-2026-0001',
    chofer_id: 5,
    chofer_nombre: 'Pedro Chofer',
    calificacion: 4,
    comentario: 'Excelente servicio',
    evaluado_por: 20,
    cliente_nombre: 'Juan Cliente',
    fecha_creacion: new Date(),
};

describe('evaluaciones.service — crearEvaluacion', () => {
    beforeEach(() => {
        mockPool.request.mockReturnValue(mockRequest);
        mockRequest.input.mockReturnThis();
        mockCrearNotificacion.mockClear();
    });

    it('lanza error si la solicitud no existe', async () => {
        mockQuery.mockResolvedValueOnce({ recordset: [] });

        await expect(
            evaluacionesService.crearEvaluacion({ solicitud_id: 99, calificacion: 4 }, 20)
        ).rejects.toThrow('Solicitud no encontrada.');
    });

    it('lanza error si la solicitud no está Finalizada', async () => {
        mockQuery.mockResolvedValueOnce({
            recordset: [{ id: 10, estado: 'En camino', chofer_id: 5, numero_servicio: 'SRV-2026-0001' }],
        });

        await expect(
            evaluacionesService.crearEvaluacion({ solicitud_id: 10, calificacion: 3 }, 20)
        ).rejects.toThrow('Solo se pueden evaluar solicitudes finalizadas.');
    });

    it('lanza error si la solicitud no tiene chofer asignado', async () => {
        mockQuery.mockResolvedValueOnce({
            recordset: [{ id: 10, estado: 'Finalizada', chofer_id: null, numero_servicio: 'SRV-2026-0001' }],
        });

        await expect(
            evaluacionesService.crearEvaluacion({ solicitud_id: 10, calificacion: 5 }, 20)
        ).rejects.toThrow('La solicitud no tiene un chofer asignado.');
    });

    it('lanza error si ya existe una evaluación para esa solicitud', async () => {
        mockQuery.mockResolvedValueOnce({
            recordset: [{ id: 10, estado: 'Finalizada', chofer_id: 5, numero_servicio: 'SRV-2026-0001' }],
        });
        // evaluación ya existe
        mockQuery.mockResolvedValueOnce({ recordset: [{ id: 3 }] });

        await expect(
            evaluacionesService.crearEvaluacion({ solicitud_id: 10, calificacion: 4 }, 20)
        ).rejects.toThrow('Ya existe una evaluación para esta solicitud.');
    });

    it('notifica al chofer con el usuario_id correcto', async () => {
        const choferId = 5;
        mockQuery.mockResolvedValueOnce({
            recordset: [{ id: 10, estado: 'Finalizada', chofer_id: choferId, numero_servicio: 'SRV-2026-0001' }],
        });
        mockQuery.mockResolvedValueOnce({ recordset: [] }); // sin evaluación previa
        mockQuery.mockResolvedValueOnce({ recordset: [{ id: 1 }] }); // INSERT
        mockQuery.mockResolvedValueOnce({ recordset: [evaluacionEjemplo] }); // obtenerPorId

        await evaluacionesService.crearEvaluacion({ solicitud_id: 10, calificacion: 4 }, 20);

        expect(mockCrearNotificacion).toHaveBeenCalledWith(
            expect.objectContaining({ usuario_id: choferId })
        );
    });

    it('el mensaje de notificación contiene las estrellas correctas para calificación 4', async () => {
        mockQuery.mockResolvedValueOnce({
            recordset: [{ id: 10, estado: 'Finalizada', chofer_id: 5, numero_servicio: 'SRV-2026-0001' }],
        });
        mockQuery.mockResolvedValueOnce({ recordset: [] });
        mockQuery.mockResolvedValueOnce({ recordset: [{ id: 1 }] });
        mockQuery.mockResolvedValueOnce({ recordset: [evaluacionEjemplo] });

        await evaluacionesService.crearEvaluacion({ solicitud_id: 10, calificacion: 4 }, 20);

        const llamada = mockCrearNotificacion.mock.calls[0][0];
        expect(llamada.mensaje).toContain('★★★★☆');
        expect(llamada.mensaje).toContain('4/5');
    });

    it('el mensaje de notificación contiene las estrellas correctas para calificación 1', async () => {
        mockQuery.mockResolvedValueOnce({
            recordset: [{ id: 10, estado: 'Finalizada', chofer_id: 5, numero_servicio: 'SRV-2026-0001' }],
        });
        mockQuery.mockResolvedValueOnce({ recordset: [] });
        mockQuery.mockResolvedValueOnce({ recordset: [{ id: 1 }] });
        mockQuery.mockResolvedValueOnce({ recordset: [{ ...evaluacionEjemplo, calificacion: 1 }] });

        await evaluacionesService.crearEvaluacion({ solicitud_id: 10, calificacion: 1 }, 20);

        const llamada = mockCrearNotificacion.mock.calls[0][0];
        expect(llamada.mensaje).toContain('★☆☆☆☆');
        expect(llamada.mensaje).toContain('1/5');
    });
});
