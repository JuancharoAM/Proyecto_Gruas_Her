import { Router } from 'express';
import * as facturasController from '../controllers/facturas.controller';
import { authMiddleware } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();

router.use(authMiddleware);
router.use(roleCheck(['Administrador']));

router.get('/resumen', facturasController.resumen);
router.get('/solicitudes-sin-factura', facturasController.solicitudesSinFactura);
router.get('/', facturasController.listar);
router.get('/:id', facturasController.obtenerPorId);
router.post('/', facturasController.crear);
router.put('/:id/pagar', facturasController.pagar);
router.put('/:id/anular', facturasController.anular);

export default router;
