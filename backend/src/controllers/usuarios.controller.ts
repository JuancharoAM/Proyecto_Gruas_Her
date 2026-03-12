/**
 * ============================================================================
 * Controlador de Usuarios
 * ============================================================================
 * 
 * Maneja las solicitudes HTTP para la gestión de usuarios.
 * Solo accesible por usuarios con rol 'Administrador'.
 * ============================================================================
 */

import { Request, Response } from 'express';
import * as usuariosService from '../services/usuarios.service';

/**
 * GET /api/usuarios
 * Obtiene la lista de todos los usuarios del sistema.
 */
export async function listar(req: Request, res: Response): Promise<void> {
    try {
        const usuarios = await usuariosService.listarUsuarios();
        res.json({ success: true, data: usuarios });
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        res.status(500).json({ success: false, message: 'Error al obtener usuarios.' });
    }
}

/**
 * GET /api/usuarios/:id
 * Obtiene un usuario específico por su ID.
 */
export async function obtenerPorId(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const usuario = await usuariosService.obtenerUsuarioPorId(id);

        if (!usuario) {
            res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
            return;
        }

        res.json({ success: true, data: usuario });
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ success: false, message: 'Error al obtener usuario.' });
    }
}

/**
 * POST /api/usuarios
 * Crea un nuevo usuario en el sistema.
 * Campos requeridos: nombre, email, password, rol_id
 */
export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { nombre, email, password, rol_id } = req.body;

        // Validaciones básicas
        if (!nombre || !email || !password || !rol_id) {
            res.status(400).json({
                success: false,
                message: 'Los campos nombre, email, password y rol_id son requeridos.',
            });
            return;
        }

        const usuario = await usuariosService.crearUsuario({ nombre, email, password, rol_id });
        res.status(201).json({ success: true, data: usuario, message: 'Usuario creado exitosamente.' });
    } catch (error: any) {
        console.error('Error al crear usuario:', error);
        // Si es un error de negocio (email duplicado), retornar 400
        if (error.message.includes('ya está registrado')) {
            res.status(400).json({ success: false, message: error.message });
            return;
        }
        res.status(500).json({ success: false, message: 'Error al crear usuario.' });
    }
}

/**
 * POST /api/usuarios/choferes
 * Crea un usuario asignándole automáticamente el rol de 'Chofer'.
 * Usado para un flujo rápido de registro desde el frontend.
 */
export async function crearChofer(req: Request, res: Response): Promise<void> {
    try {
        const { nombre, email, password } = req.body;

        if (!nombre || !email || !password) {
            res.status(400).json({
                success: false,
                message: 'Los campos nombre, email y password son requeridos.',
            });
            return;
        }

        // Buscar el ID del rol 'Chofer'
        const roles = await usuariosService.listarRoles();
        const rolChofer = roles.find(r => r.nombre === 'Chofer');

        if (!rolChofer) {
            res.status(500).json({ success: false, message: 'Rol Chofer no encontrado en el sistema.' });
            return;
        }

        const usuario = await usuariosService.crearUsuario({ nombre, email, password, rol_id: rolChofer.id });
        res.status(201).json({ success: true, data: usuario, message: 'Chofer registrado exitosamente.' });
    } catch (error: any) {
        console.error('Error al registrar chofer:', error);
        if (error.message.includes('ya está registrado')) {
            res.status(400).json({ success: false, message: error.message });
            return;
        }
        res.status(500).json({ success: false, message: 'Error al registrar chofer.' });
    }
}

/**
 * PUT /api/usuarios/:id
 * Actualiza los datos de un usuario existente.
 * Solo se actualizan los campos proporcionados en el body.
 */
export async function actualizar(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const usuario = await usuariosService.actualizarUsuario(id, req.body);

        if (!usuario) {
            res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
            return;
        }

        res.json({ success: true, data: usuario, message: 'Usuario actualizado exitosamente.' });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar usuario.' });
    }
}

/**
 * DELETE /api/usuarios/:id
 * Desactiva un usuario (no lo elimina físicamente).
 * Esto evita perder relaciones con solicitudes y otros registros.
 */
export async function desactivar(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const usuario = await usuariosService.actualizarUsuario(id, { activo: false });

        if (!usuario) {
            res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
            return;
        }

        res.json({ success: true, message: 'Usuario desactivado exitosamente.' });
    } catch (error) {
        console.error('Error al desactivar usuario:', error);
        res.status(500).json({ success: false, message: 'Error al desactivar usuario.' });
    }
}

/**
 * GET /api/usuarios/roles
 * Obtiene la lista de roles disponibles.
 * Se usa para llenar el selector de roles en el formulario de usuarios.
 */
export async function listarRoles(req: Request, res: Response): Promise<void> {
    try {
        const roles = await usuariosService.listarRoles();
        res.json({ success: true, data: roles });
    } catch (error) {
        console.error('Error al listar roles:', error);
        res.status(500).json({ success: false, message: 'Error al obtener roles.' });
    }
}
