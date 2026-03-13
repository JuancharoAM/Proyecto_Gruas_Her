/**
 * ============================================================================
 * Rutas de Clientes
 * ============================================================================
 * Define los endpoints CRUD para gestión de clientes.
 * Todas las rutas requieren autenticación. Los permisos varían por rol:
 * - Administrador y Logística: acceso completo
 * - Cliente: solo puede ver su propio registro e historial
 * ============================================================================
 */

import { Router } from 'express';
import * as clientesController from '../controllers/clientes.controller';
import { authMiddleware } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();

// Todas las rutas de clientes requieren autenticación
router.use(authMiddleware);

// GET /api/clientes - Listar todos los clientes (Admin, Logística)
router.get('/', roleCheck(['Administrador', 'Logística']), clientesController.listar);

// GET /api/clientes/:id - Obtener cliente por ID (Admin, Logística, Cliente - solo el suyo)
router.get('/:id', roleCheck(['Administrador', 'Logística', 'Cliente']), clientesController.obtenerPorId);

// POST /api/clientes - Crear nuevo cliente (Admin, Logística)
router.post('/', roleCheck(['Administrador', 'Logística']), clientesController.crear);

// PUT /api/clientes/:id - Actualizar cliente (Admin, Logística)
router.put('/:id', roleCheck(['Administrador', 'Logística']), clientesController.actualizar);

// PUT /api/clientes/:id/activar - Activar cliente (Admin)
router.put('/:id/activar', roleCheck(['Administrador']), clientesController.activar);

// DELETE /api/clientes/:id - Desactivar cliente / borrado lógico (Admin)
router.delete('/:id', roleCheck(['Administrador']), clientesController.desactivar);

// GET /api/clientes/:id/historial - Historial de servicios del cliente (Admin, Logística, Cliente)
router.get('/:id/historial', roleCheck(['Administrador', 'Logística', 'Cliente']), clientesController.historial);

export default router;
