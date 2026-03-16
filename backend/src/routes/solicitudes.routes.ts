/**
 * ============================================================================
 * Rutas de Solicitudes de Servicio
 * ============================================================================
 * Define los endpoints para gestión de solicitudes y estadísticas del dashboard.
 * ============================================================================
 */

import { Router } from 'express';
import * as solicitudesController from '../controllers/solicitudes.controller';
import { authMiddleware } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// GET /api/dashboard/stats - Estadísticas para el dashboard
router.get('/dashboard/stats', roleCheck(['Administrador', 'Logística']), solicitudesController.obtenerEstadisticas);

// GET /api/solicitudes - Listar solicitudes (con filtro opcional por estado)
router.get('/', roleCheck(['Administrador', 'Logística']), solicitudesController.listar);

// GET /api/solicitudes/mis-servicios - Listar solicitudes del chofer
router.get('/mis-servicios', roleCheck(['Chofer']), solicitudesController.listarMisServicios);

// GET /api/solicitudes/mis-solicitudes - Listar solicitudes del cliente
router.get('/mis-solicitudes', roleCheck(['Cliente']), solicitudesController.listarMisSolicitudes);

// GET /api/solicitudes/:id - Detalle de una solicitud
router.get('/:id', roleCheck(['Administrador', 'Logística', 'Chofer', 'Cliente']), solicitudesController.obtenerPorId);

// POST /api/solicitudes - Crear nueva solicitud
router.post('/', roleCheck(['Administrador', 'Logística', 'Cliente']), solicitudesController.crear);

// PUT /api/solicitudes/:id - Editar datos de una solicitud
router.put('/:id', roleCheck(['Administrador', 'Logística']), solicitudesController.actualizar);

// PUT /api/solicitudes/:id/asignar - Asignar grúa a solicitud
router.put('/:id/asignar', roleCheck(['Administrador', 'Logística']), solicitudesController.asignar);

// PUT /api/solicitudes/:id/reasignar - Reasignar grúa/chofer en solicitud activa
router.put('/:id/reasignar', roleCheck(['Administrador', 'Logística']), solicitudesController.reasignar);

// PUT /api/solicitudes/:id/estado - Actualizar estado de solicitud
router.put('/:id/estado', roleCheck(['Administrador', 'Logística', 'Chofer']), solicitudesController.actualizarEstado);

// DELETE /api/solicitudes/:id - Eliminar solicitud (solo Administrador)
router.delete('/:id', roleCheck(['Administrador']), solicitudesController.eliminar);

export default router;
