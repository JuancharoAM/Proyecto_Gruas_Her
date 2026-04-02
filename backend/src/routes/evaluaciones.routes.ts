import { Router } from 'express';
import * as evaluacionesController from '../controllers/evaluaciones.controller';
import { authMiddleware } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();

router.use(authMiddleware);

router.post('/', roleCheck(['Cliente']), evaluacionesController.crear);
router.get('/promedios', roleCheck(['Administrador', 'Logística']), evaluacionesController.promedios);
router.get('/solicitud/:solicitudId', evaluacionesController.obtenerPorSolicitud);
router.get('/', roleCheck(['Administrador', 'Logística']), evaluacionesController.listar);

export default router;
