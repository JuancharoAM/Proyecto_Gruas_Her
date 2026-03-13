/**
 * ============================================================================
 * Rutas de Mantenimientos
 * ============================================================================
 * Define los endpoints para la gestion de mantenimientos de la flota.
 * Acceso: Administrador, Tecnico
 * ============================================================================
 */

import { Router } from 'express';
import * as mantenimientosController from '../controllers/mantenimientos.controller';
import { authMiddleware } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();

// Todas las rutas requieren autenticacion
router.use(authMiddleware);

// GET /api/mantenimientos/resumen - Resumen para dashboard
router.get('/resumen', roleCheck(['Administrador', 'Técnico']), mantenimientosController.resumen);

// GET /api/mantenimientos - Listar mantenimientos (con filtro opcional ?camion_id=X)
router.get('/', roleCheck(['Administrador', 'Técnico']), mantenimientosController.listar);

// GET /api/mantenimientos/:id - Detalle de un mantenimiento
router.get('/:id', roleCheck(['Administrador', 'Técnico']), mantenimientosController.obtenerPorId);

// POST /api/mantenimientos - Registrar nuevo mantenimiento
router.post('/', roleCheck(['Administrador', 'Técnico']), mantenimientosController.crear);

// PUT /api/mantenimientos/:id/completar - Completar mantenimiento y liberar grua
router.put('/:id/completar', roleCheck(['Administrador', 'Técnico']), mantenimientosController.completar);

// PUT /api/mantenimientos/:id - Actualizar mantenimiento
router.put('/:id', roleCheck(['Administrador', 'Técnico']), mantenimientosController.actualizar);

// DELETE /api/mantenimientos/:id - Eliminar mantenimiento
router.delete('/:id', roleCheck(['Administrador']), mantenimientosController.eliminar);

export default router;
