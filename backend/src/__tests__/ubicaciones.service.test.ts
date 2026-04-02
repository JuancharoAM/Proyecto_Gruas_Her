/**
 * Pruebas unitarias — ubicaciones.service.ts
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

import * as ubicacionesService from '../services/ubicaciones.service';

const ubicacionEjemplo = {
    camion_id: 3,
    placa: 'GRU-001',
    chofer_nombre: 'Pedro Chofer',
    numero_servicio: 'SRV-2026-0001',
    cliente_nombre: 'Juan Cliente',
    latitud: 9.9281,
    longitud: -84.0907,
    fecha_reporte: new Date(),
};

describe('ubicaciones.service — reportarUbicacion', () => {
    beforeEach(() => {
        mockPool.request.mockReturnValue(mockRequest);
        mockRequest.input.mockReturnThis();
    });

    it('ejecuta MERGE sin lanzar error', async () => {
        mockQuery.mockResolvedValueOnce({ recordset: [] });

        await expect(
            ubicacionesService.reportarUbicacion({ camion_id: 3, chofer_id: 5, latitud: 9.9281, longitud: -84.0907 })
        ).resolves.not.toThrow();
    });

    it('invoca query con los cuatro parametros', async () => {
        mockQuery.mockResolvedValueOnce({ recordset: [] });

        await ubicacionesService.reportarUbicacion({ camion_id: 3, chofer_id: 5, latitud: 9.9281, longitud: -84.0907 });

        expect(mockRequest.input).toHaveBeenCalledWith('camion_id', 3);
        expect(mockRequest.input).toHaveBeenCalledWith('chofer_id', 5);
        expect(mockRequest.input).toHaveBeenCalledWith('latitud', 9.9281);
        expect(mockRequest.input).toHaveBeenCalledWith('longitud', -84.0907);
    });
});

describe('ubicaciones.service — listarActivas', () => {
    beforeEach(() => {
        mockPool.request.mockReturnValue(mockRequest);
        mockRequest.input.mockReturnThis();
    });

    it('retorna array vacio cuando no hay gruas activas', async () => {
        mockQuery.mockResolvedValueOnce({ recordset: [] });

        const resultado = await ubicacionesService.listarActivas();

        expect(resultado).toEqual([]);
    });

    it('retorna ubicaciones con la forma correcta', async () => {
        mockQuery.mockResolvedValueOnce({ recordset: [ubicacionEjemplo] });

        const resultado = await ubicacionesService.listarActivas();

        expect(resultado).toHaveLength(1);
        expect(resultado[0]).toMatchObject({
            camion_id: 3,
            placa: 'GRU-001',
            chofer_nombre: 'Pedro Chofer',
            numero_servicio: 'SRV-2026-0001',
            cliente_nombre: 'Juan Cliente',
        });
    });

    it('retorna multiples ubicaciones cuando hay varias gruas activas', async () => {
        mockQuery.mockResolvedValueOnce({
            recordset: [
                ubicacionEjemplo,
                { ...ubicacionEjemplo, camion_id: 4, placa: 'GRU-002' },
            ],
        });

        const resultado = await ubicacionesService.listarActivas();

        expect(resultado).toHaveLength(2);
    });
});
