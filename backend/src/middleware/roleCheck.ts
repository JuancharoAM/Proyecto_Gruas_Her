/**
 * ============================================================================
 * Middleware de Verificación de Roles
 * ============================================================================
 * 
 * Este middleware restringe el acceso a rutas específicas según el rol
 * del usuario autenticado. Debe usarse DESPUÉS del middleware de
 * autenticación (authMiddleware).
 * 
 * Ejemplo de uso:
 *   router.get('/usuarios', authMiddleware, roleCheck(['Administrador']), controller);
 *   router.get('/camiones', authMiddleware, roleCheck(['Administrador', 'Logística']), controller);
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Crea un middleware que verifica si el usuario tiene uno de los roles permitidos.
 * 
 * @param rolesPermitidos - Array con los nombres de los roles que pueden acceder
 * @returns Middleware de Express que valida el rol
 * 
 * @example
 * // Solo administradores pueden acceder
 * router.delete('/usuarios/:id', authMiddleware, roleCheck(['Administrador']), deleteUser);
 * 
 * // Administradores y logística pueden acceder
 * router.get('/solicitudes', authMiddleware, roleCheck(['Administrador', 'Logística']), listSolicitudes);
 */
export function roleCheck(rolesPermitidos: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        // Verificar que el usuario está autenticado (el middleware auth debe ejecutarse antes)
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado.',
            });
            return;
        }

        // Verificar si el rol del usuario está en la lista de roles permitidos
        if (!rolesPermitidos.includes(req.user.rol)) {
            res.status(403).json({
                success: false,
                message: `Acceso denegado. Se requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}.`,
            });
            return;
        }

        // El usuario tiene el rol correcto, continuar
        next();
    };
}
