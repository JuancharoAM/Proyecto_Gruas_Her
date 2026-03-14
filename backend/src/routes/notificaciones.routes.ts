/**
 * ============================================================================
 * Rutas de Notificaciones
 * ============================================================================
 * Define los endpoints para el sistema de notificaciones.
 * Acceso: Todos los usuarios autenticados (cada uno ve solo las suyas).
 * ============================================================================
 */

import { Router } from 'express';
import * as notificacionesController from '../controllers/notificaciones.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticacion
router.use(authMiddleware);

// GET /api/notificaciones/no-leidas - Contar no leidas (ANTES de /:id)
router.get('/no-leidas', notificacionesController.contarNoLeidas);

// PUT /api/notificaciones/leer-todas - Marcar todas como leidas (ANTES de /:id)
router.put('/leer-todas', notificacionesController.marcarTodasLeidas);

// DELETE /api/notificaciones/limpiar - Eliminar todas las notificaciones (ANTES de /:id)
router.delete('/limpiar', notificacionesController.eliminarTodas);

// GET /api/notificaciones - Listar notificaciones del usuario
router.get('/', notificacionesController.listar);

// PUT /api/notificaciones/:id/leer - Marcar una como leida
router.put('/:id/leer', notificacionesController.marcarLeida);

// DELETE /api/notificaciones/:id - Eliminar notificacion
router.delete('/:id', notificacionesController.eliminar);

export default router;
