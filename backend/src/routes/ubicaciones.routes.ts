import { Router } from 'express';
import * as ubicacionesController from '../controllers/ubicaciones.controller';
import { authMiddleware } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();

router.use(authMiddleware);

router.post('/', roleCheck(['Chofer']), ubicacionesController.reportar);
router.get('/activas', roleCheck(['Administrador', 'Logística']), ubicacionesController.activas);

export default router;
