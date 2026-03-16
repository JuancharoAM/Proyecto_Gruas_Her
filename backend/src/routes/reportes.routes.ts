/**
 * ============================================================================
 * Rutas de Reportes
 * ============================================================================
 * Acceso: Administrador y Logistica.
 * ============================================================================
 */

import { Router } from 'express';
import * as reportesController from '../controllers/reportes.controller';
import { authMiddleware } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();

router.use(authMiddleware);

// GET /api/reportes/solicitudes?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/solicitudes', roleCheck(['Administrador', 'Logística']), reportesController.reporteSolicitudes);

// GET /api/reportes/flota
router.get('/flota', roleCheck(['Administrador', 'Logística']), reportesController.reporteFlota);

// GET /api/reportes/operativo
router.get('/operativo', roleCheck(['Administrador', 'Logística']), reportesController.reporteOperativo);

export default router;
