/**
 * ============================================================================
 * Controlador de Autenticación
 * ============================================================================
 * 
 * Maneja las solicitudes HTTP relacionadas con el inicio y cierre de sesión.
 * Conecta las rutas HTTP con el servicio de autenticación.
 * ============================================================================
 */

import { Request, Response } from 'express';
import * as authService from '../services/auth.service';

/**
 * POST /api/auth/login
 * Inicia sesión con email y contraseña.
 * Retorna un token JWT y los datos del usuario.
 */
export async function login(req: Request, res: Response): Promise<void> {
    try {
        const { email, password } = req.body;

        // Validar que se proporcionaron las credenciales
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: 'El correo electrónico y la contraseña son requeridos.',
            });
            return;
        }

        // Intentar autenticar al usuario
        const resultado = await authService.loginUsuario(email, password);

        if (!resultado) {
            res.status(401).json({
                success: false,
                message: 'Credenciales inválidas. Verifique su correo y contraseña.',
            });
            return;
        }

        // Login exitoso
        res.json({
            success: true,
            message: 'Inicio de sesión exitoso.',
            data: resultado,
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al iniciar sesión.',
        });
    }
}

/**
 * GET /api/auth/me
 * Obtiene los datos del usuario actualmente autenticado.
 * Requiere un token JWT válido en el header Authorization.
 */
export async function obtenerPerfilActual(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'No autenticado.' });
            return;
        }

        const usuario = await authService.obtenerUsuarioPorId(req.user.userId);

        if (!usuario) {
            res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
            return;
        }

        res.json({
            success: true,
            data: usuario,
        });
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
}
