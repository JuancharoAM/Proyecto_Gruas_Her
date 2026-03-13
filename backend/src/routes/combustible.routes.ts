/**
 * ============================================================================
 * Rutas de Combustible
 * ============================================================================
 * Define los endpoints para el registro de cargas de combustible.
 * Acceso: Administrador, Logistica
 * ============================================================================
 */

import { Router } from 'express';
import * as combustibleController from '../controllers/combustible.controller';
import { authMiddleware } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();

// Todas las rutas requieren autenticacion
router.use(authMiddleware);

// GET /api/combustible/resumen - Resumen de combustible
router.get('/resumen', roleCheck(['Administrador', 'Logística']), combustibleController.resumen);

// GET /api/combustible - Listar registros (con filtro opcional ?camion_id=X)
router.get('/', roleCheck(['Administrador', 'Logística']), combustibleController.listar);

// POST /api/combustible - Registrar nueva carga de combustible
router.post('/', roleCheck(['Administrador', 'Logística']), combustibleController.crear);

// DELETE /api/combustible/:id - Eliminar registro
router.delete('/:id', roleCheck(['Administrador']), combustibleController.eliminar);

export default router;
