/**
 * ============================================================================
 * Controlador de Clientes
 * ============================================================================
 *
 * Maneja las solicitudes HTTP para la gestión de clientes.
 * Accesible por usuarios con roles Administrador, Logística y Cliente
 * (según la ruta y permisos definidos en el router).
 * ============================================================================
 */

import { Request, Response } from 'express';
import * as clientesService from '../services/clientes.service';

/**
 * GET /api/clientes
 * Obtiene la lista de todos los clientes del sistema.
 */
export async function listar(req: Request, res: Response): Promise<void> {
    try {
        const clientes = await clientesService.listarClientes();
        res.json({ success: true, data: clientes });
    } catch (error) {
        console.error('Error al listar clientes:', error);
        res.status(500).json({ success: false, message: 'Error al obtener clientes.' });
    }
}

/**
 * GET /api/clientes/:id
 * Obtiene un cliente específico por su ID.
 */
export async function obtenerPorId(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const cliente = await clientesService.obtenerClientePorId(id);

        if (!cliente) {
            res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
            return;
        }

        res.json({ success: true, data: cliente });
    } catch (error) {
        console.error('Error al obtener cliente:', error);
        res.status(500).json({ success: false, message: 'Error al obtener cliente.' });
    }
}

/**
 * POST /api/clientes
 * Crea un nuevo cliente en el sistema.
 * Campos requeridos: cedula, nombre, apellido.
 * Opcionales: telefono, correo, notas, crear_usuario, password.
 * Si crear_usuario es true, password es obligatorio.
 */
export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { cedula, nombre, apellido, telefono, correo, notas, crear_usuario, password } = req.body;

        // Validaciones básicas de campos requeridos
        if (!cedula || !nombre || !apellido) {
            res.status(400).json({
                success: false,
                message: 'Los campos cédula, nombre y apellido son requeridos.',
            });
            return;
        }

        // Si se desea crear usuario, la contraseña es obligatoria
        if (crear_usuario && !password) {
            res.status(400).json({
                success: false,
                message: 'Para crear un usuario vinculado se requiere una contraseña.',
            });
            return;
        }

        const cliente = await clientesService.crearCliente({
            cedula, nombre, apellido, telefono, correo, notas, crear_usuario, password,
        });

        res.status(201).json({ success: true, data: cliente, message: 'Cliente creado exitosamente.' });
    } catch (error: any) {
        console.error('Error al crear cliente:', error);
        // Errores de negocio (cédula duplicada, correo duplicado, rol faltante)
        if (error.message.includes('ya está registrad') || error.message.includes('se requiere')) {
            res.status(400).json({ success: false, message: error.message });
            return;
        }
        res.status(500).json({ success: false, message: 'Error al crear cliente.' });
    }
}

/**
 * PUT /api/clientes/:id
 * Actualiza los datos de un cliente existente.
 * Solo se actualizan los campos proporcionados en el body.
 */
export async function actualizar(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const cliente = await clientesService.actualizarCliente(id, req.body);

        if (!cliente) {
            res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
            return;
        }

        res.json({ success: true, data: cliente, message: 'Cliente actualizado exitosamente.' });
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar cliente.' });
    }
}

/**
 * DELETE /api/clientes/:id
 * Desactiva un cliente (borrado lógico, no elimina el registro).
 * Esto evita perder relaciones con solicitudes y otros registros.
 */
export async function desactivar(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const cliente = await clientesService.actualizarCliente(id, { activo: false });

        if (!cliente) {
            res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
            return;
        }

        res.json({ success: true, message: 'Cliente desactivado exitosamente.' });
    } catch (error) {
        console.error('Error al desactivar cliente:', error);
        res.status(500).json({ success: false, message: 'Error al desactivar cliente.' });
    }
}

/**
 * PUT /api/clientes/:id/activar
 * Reactiva un cliente previamente desactivado.
 */
export async function activar(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const cliente = await clientesService.actualizarCliente(id, { activo: true });

        if (!cliente) {
            res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
            return;
        }

        res.json({ success: true, data: cliente, message: 'Cliente activado exitosamente.' });
    } catch (error) {
        console.error('Error al activar cliente:', error);
        res.status(500).json({ success: false, message: 'Error al activar cliente.' });
    }
}

/**
 * GET /api/clientes/:id/historial
 * Obtiene el historial de solicitudes de servicio de un cliente.
 */
export async function historial(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);

        // Verificar que el cliente existe antes de buscar su historial
        const cliente = await clientesService.obtenerClientePorId(id);
        if (!cliente) {
            res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
            return;
        }

        const solicitudes = await clientesService.obtenerHistorialSolicitudes(id);
        res.json({ success: true, data: solicitudes });
    } catch (error) {
        console.error('Error al obtener historial del cliente:', error);
        res.status(500).json({ success: false, message: 'Error al obtener historial del cliente.' });
    }
}
