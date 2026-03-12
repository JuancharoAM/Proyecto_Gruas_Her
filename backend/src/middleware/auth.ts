/**
 * ============================================================================
 * Middleware de Autenticación (JWT)
 * ============================================================================
 * 
 * Este middleware verifica que cada solicitud HTTP protegida incluya
 * un token JWT válido en el header 'Authorization'.
 * 
 * Funcionamiento:
 * 1. Extrae el token del header: "Bearer <token>"
 * 2. Verifica la firma y expiración del token
 * 3. Agrega los datos del usuario decodificado al objeto 'request'
 * 4. Si el token es inválido, responde con error 401
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Interfaz que define la estructura de los datos almacenados en el JWT.
 * Estos datos se adjuntan al request después de verificar el token.
 */
export interface JwtPayload {
    userId: number;      // ID del usuario en la base de datos
    email: string;       // Email del usuario
    rol: string;         // Nombre del rol (ej: 'Administrador')
    rolId: number;       // ID del rol
}

/**
 * Extensión del tipo Request de Express para incluir los datos del usuario.
 * Esto permite acceder a `req.user` en los controladores.
 */
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

/**
 * Middleware que verifica el token JWT en cada solicitud protegida.
 * 
 * Uso en rutas:
 * ```typescript
 * router.get('/ruta-protegida', authMiddleware, controlador);
 * ```
 * 
 * @param req - Objeto Request de Express
 * @param res - Objeto Response de Express
 * @param next - Función para continuar al siguiente middleware
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Obtener el header de autorización
    const authHeader = req.headers.authorization;

    // Verificar que el header existe y tiene el formato correcto
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            message: 'Acceso denegado. No se proporcionó un token de autenticación.',
        });
        return;
    }

    // Extraer el token (quitar "Bearer " del inicio)
    const token = authHeader.split(' ')[1];

    try {
        // Verificar y decodificar el token usando la clave secreta
        const secret = process.env.JWT_SECRET || 'default_secret';
        const decoded = jwt.verify(token, secret) as JwtPayload;

        // Adjuntar los datos del usuario al request para uso posterior
        req.user = decoded;

        // Continuar al siguiente middleware o controlador
        next();
    } catch (error) {
        // El token es inválido o ha expirado
        res.status(401).json({
            success: false,
            message: 'Token inválido o expirado. Por favor, inicie sesión nuevamente.',
        });
    }
}
