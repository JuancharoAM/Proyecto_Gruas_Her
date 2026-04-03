/**
 * Pruebas unitarias — facturas.service.ts
 *
 * Mockea getPool y notificaciones.service para probar la lógica de negocio
 * sin tocar la base de datos real.
 */

// Mock del pool de base de datos
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

jest.mock('../services/notificaciones.service', () => ({
    crearParaRol: jest.fn().mockResolvedValue(undefined),
    crearNotificacion: jest.fn().mockResolvedValue(undefined),
}));

import * as facturasService from '../services/facturas.service';

const ANIO = new Date().getFullYear();

// Factura de ejemplo para usar en pruebas
const facturaEjemplo = {
    id: 1,
    numero_factura: `FAC-${ANIO}-0001`,
    solicitud_id: 10,
    numero_servicio: 'SRV-2026-0001',
    cliente_nombre: 'Juan Pérez',
    cliente_telefono: '88001234',
    cliente_email: 'juan@test.com',
    subtotal: 50000,
    impuesto_pct: 13,
    impuesto_monto: 6500,
    total: 56500,
    estado: 'Pendiente',
    descripcion: 'Servicio de grúa',
    fecha_emision: new Date(),
    fecha_pago: null,
    creado_por: 1,
    notas: null,
};

describe('facturas.service — crearFactura', () => {
    beforeEach(() => {
        mockPool.request.mockReturnValue(mockRequest);
        mockRequest.input.mockReturnThis();
    });

    it('lanza error si la solicitud no existe', async () => {
        // Primera query: buscar solicitud → no encontrada
        mockQuery.mockResolvedValueOnce({ recordset: [] });

        await expect(
            facturasService.crearFactura({ solicitud_id: 99, subtotal: 10000 }, 1)
        ).rejects.toThrow('Solicitud no encontrada.');
    });

    it('lanza error si la solicitud no está Finalizada', async () => {
        mockQuery.mockResolvedValueOnce({
            recordset: [{ id: 10, estado: 'Pendiente', cliente_nombre: 'Test', cliente_telefono: null, cliente_email: null }],
        });

        await expect(
            facturasService.crearFactura({ solicitud_id: 10, subtotal: 10000 }, 1)
        ).rejects.toThrow('Solo se pueden facturar solicitudes finalizadas.');
    });

    it('lanza error si ya existe una factura para esa solicitud', async () => {
        // Solicitud encontrada y Finalizada
        mockQuery.mockResolvedValueOnce({
            recordset: [{ id: 10, estado: 'Finalizada', cliente_nombre: 'Test', cliente_telefono: null, cliente_email: null }],
        });
        // Ya existe factura
        mockQuery.mockResolvedValueOnce({ recordset: [{ id: 5 }] });

        await expect(
            facturasService.crearFactura({ solicitud_id: 10, subtotal: 10000 }, 1)
        ).rejects.toThrow('Ya existe una factura para esta solicitud.');
    });

    it('calcula correctamente el IVA del 13%', async () => {
        const subtotal = 100000;
        const expectedImpuesto = 13000;
        const expectedTotal = 113000;

        // Solicitud Finalizada
        mockQuery.mockResolvedValueOnce({
            recordset: [{ id: 10, estado: 'Finalizada', cliente_nombre: 'Test', cliente_telefono: null, cliente_email: null }],
        });
        // Sin factura previa
        mockQuery.mockResolvedValueOnce({ recordset: [] });
        // Sin facturas previas para generar número
        mockQuery.mockResolvedValueOnce({ recordset: [] });
        // INSERT → devuelve id
        mockQuery.mockResolvedValueOnce({ recordset: [{ id: 1 }] });
        // obtenerPorId (SELECT final)
        mockQuery.mockResolvedValueOnce({ recordset: [{ ...facturaEjemplo, subtotal, impuesto_monto: expectedImpuesto, total: expectedTotal }] });

        const factura = await facturasService.crearFactura({ solicitud_id: 10, subtotal }, 1);

        expect(factura.impuesto_monto).toBe(expectedImpuesto);
        expect(factura.total).toBe(expectedTotal);
    });

    it('el total es subtotal + impuesto', async () => {
        const subtotal = 75000;
        const impuesto = Math.round(subtotal * 0.13 * 100) / 100;
        const total = Math.round((subtotal + impuesto) * 100) / 100;

        mockQuery.mockResolvedValueOnce({
            recordset: [{ id: 10, estado: 'Finalizada', cliente_nombre: 'Test', cliente_telefono: null, cliente_email: null }],
        });
        mockQuery.mockResolvedValueOnce({ recordset: [] });
        mockQuery.mockResolvedValueOnce({ recordset: [] });
        mockQuery.mockResolvedValueOnce({ recordset: [{ id: 2 }] });
        mockQuery.mockResolvedValueOnce({ recordset: [{ ...facturaEjemplo, subtotal, impuesto_monto: impuesto, total }] });

        const factura = await facturasService.crearFactura({ solicitud_id: 10, subtotal }, 1);

        expect(factura.total).toBe(factura.subtotal + factura.impuesto_monto);
    });
});

describe('facturas.service — generarNumeroFactura (via crearFactura)', () => {
    it('genera FAC-YYYY-0001 cuando no hay facturas previas', async () => {
        mockQuery.mockResolvedValueOnce({
            recordset: [{ id: 10, estado: 'Finalizada', cliente_nombre: 'Test', cliente_telefono: null, cliente_email: null }],
        });
        mockQuery.mockResolvedValueOnce({ recordset: [] }); // sin factura previa
        mockQuery.mockResolvedValueOnce({ recordset: [] }); // sin facturas del año → secuencial = 1
        mockQuery.mockResolvedValueOnce({ recordset: [{ id: 1 }] });
        mockQuery.mockResolvedValueOnce({ recordset: [{ ...facturaEjemplo, numero_factura: `FAC-${ANIO}-0001` }] });

        const factura = await facturasService.crearFactura({ solicitud_id: 10, subtotal: 50000 }, 1);

        expect(factura.numero_factura).toBe(`FAC-${ANIO}-0001`);
    });

    it('incrementa el secuencial cuando ya existen facturas del año', async () => {
        mockQuery.mockResolvedValueOnce({
            recordset: [{ id: 10, estado: 'Finalizada', cliente_nombre: 'Test', cliente_telefono: null, cliente_email: null }],
        });
        mockQuery.mockResolvedValueOnce({ recordset: [] }); // sin factura previa para esta solicitud
        // Última factura del año es 0003 → siguiente debe ser 0004
        mockQuery.mockResolvedValueOnce({ recordset: [{ numero_factura: `FAC-${ANIO}-0003` }] });
        mockQuery.mockResolvedValueOnce({ recordset: [{ id: 2 }] });
        mockQuery.mockResolvedValueOnce({ recordset: [{ ...facturaEjemplo, numero_factura: `FAC-${ANIO}-0004` }] });

        const factura = await facturasService.crearFactura({ solicitud_id: 10, subtotal: 50000 }, 1);

        expect(factura.numero_factura).toBe(`FAC-${ANIO}-0004`);
    });
});

describe('facturas.service — marcarPagada', () => {
    it('retorna null si la factura no existe', async () => {
        // obtenerPorId → no encontrada
        mockQuery.mockResolvedValueOnce({ recordset: [] });

        const resultado = await facturasService.marcarPagada(999);

        expect(resultado).toBeNull();
    });

    it('lanza error si la factura no está en estado Pendiente', async () => {
        // obtenerPorId → factura Pagada
        mockQuery.mockResolvedValueOnce({ recordset: [{ ...facturaEjemplo, estado: 'Pagada' }] });

        await expect(facturasService.marcarPagada(1)).rejects.toThrow('Solo se pueden pagar facturas pendientes.');
    });
});

describe('facturas.service — anularFactura', () => {
    it('retorna null si la factura no existe', async () => {
        mockQuery.mockResolvedValueOnce({ recordset: [] });

        const resultado = await facturasService.anularFactura(999);

        expect(resultado).toBeNull();
    });

    it('lanza error si la factura no está en estado Pendiente', async () => {
        mockQuery.mockResolvedValueOnce({ recordset: [{ ...facturaEjemplo, estado: 'Anulada' }] });

        await expect(facturasService.anularFactura(1)).rejects.toThrow('Solo se pueden anular facturas pendientes.');
    });
});
