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

// Todas las rutas de usuarios requieren autenticación y rol de Administrador
router.use(authMiddleware);
router.use(roleCheck(['Administrador']));

// GET /api/usuarios/roles - Listar roles disponibles (debe ir antes de /:id)
router.get('/roles', usuariosController.listarRoles);

// GET /api/usuarios - Listar todos los usuarios
router.get('/', usuariosController.listar);

// GET /api/usuarios/:id - Obtener usuario por ID
router.get('/:id', usuariosController.obtenerPorId);

// POST /api/usuarios - Crear nuevo usuario
router.post('/', usuariosController.crear);

// POST /api/usuarios/choferes - Crear nuevo chofer directamente
router.post('/choferes', usuariosController.crearChofer);

// PUT /api/usuarios/:id - Actualizar usuario
router.put('/:id', usuariosController.actualizar);

// DELETE /api/usuarios/:id - Desactivar usuario (borrado lógico)
router.delete('/:id', usuariosController.desactivar);

export default router;
