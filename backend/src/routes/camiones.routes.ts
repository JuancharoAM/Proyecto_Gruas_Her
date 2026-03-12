/**
 * ============================================================================
 * Rutas de Camiones (Flota)
 * ============================================================================
 * Define los endpoints CRUD para gestión de la flota de camiones.
 * Accesible por Administradores y personal de Logística.
 * ============================================================================
 */

import { Router } from 'express';
import * as camionesController from '../controllers/camiones.controller';
import { authMiddleware } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// GET /api/camiones/tipos - Listar tipos de grúa (debe ir antes de /:id)
router.get('/tipos', roleCheck(['Administrador', 'Logística']), camionesController.listarTipos);

// GET /api/camiones - Listar todos los camiones
router.get('/', roleCheck(['Administrador', 'Logística']), camionesController.listar);

// GET /api/camiones/:id - Detalle de un camión (también accesible por choferes)
router.get('/:id', roleCheck(['Administrador', 'Logística', 'Chofer']), camionesController.obtenerPorId);

// POST /api/camiones - Registrar nuevo camión (solo Admin)
router.post('/', roleCheck(['Administrador']), camionesController.crear);

// PUT /api/camiones/:id - Editar camión (solo Admin)
router.put('/:id', roleCheck(['Administrador']), camionesController.actualizar);

export default router;
