/**
 * ============================================================================
 * Rutas de Autenticación
 * ============================================================================
 * Define los endpoints para login y obtención del perfil del usuario.
 * ============================================================================
 */

import { Router } from 'express';
import { login, obtenerPerfilActual } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/auth/login - Iniciar sesión (no requiere autenticación)
router.post('/login', login);

// GET /api/auth/me - Obtener datos del usuario autenticado (requiere token)
router.get('/me', authMiddleware, obtenerPerfilActual);

export default router;
