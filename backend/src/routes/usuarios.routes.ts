/**
 * ============================================================================
 * Rutas de Usuarios
 * ============================================================================
 * Define los endpoints CRUD para gestión de usuarios.
 * Todas las rutas requieren autenticación y rol de Administrador.
 * ============================================================================
 */

import { Router } from 'express';
import * as usuariosController from '../controllers/usuarios.controller';
import { authMiddleware } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// GET /api/usuarios/roles - Listar roles disponibles (debe ir antes de /:id)
router.get('/roles', roleCheck(['Administrador', 'Logística']), usuariosController.listarRoles);

// GET /api/usuarios - Listar todos los usuarios (Logística necesita ver los choferes)
router.get('/', roleCheck(['Administrador', 'Logística']), usuariosController.listar);

// GET /api/usuarios/:id - Obtener usuario por ID
router.get('/:id', roleCheck(['Administrador', 'Logística']), usuariosController.obtenerPorId);

// POST /api/usuarios - Crear nuevo usuario
router.post('/', roleCheck(['Administrador']), usuariosController.crear);

// POST /api/usuarios/choferes - Crear nuevo chofer directamente
router.post('/choferes', roleCheck(['Administrador', 'Logística']), usuariosController.crearChofer);

// PUT /api/usuarios/:id - Actualizar usuario
router.put('/:id', roleCheck(['Administrador']), usuariosController.actualizar);

// DELETE /api/usuarios/:id - Desactivar usuario (borrado lógico)
router.delete('/:id', roleCheck(['Administrador']), usuariosController.desactivar);

export default router;
