import { Router } from 'express';
import { ExportOrderController } from '../controllers/ExportOrderController.js';
import { authenticate } from '../middlewares/Authenticate.js';
import { authorize } from '../middlewares/Authorization.js';

const router = Router();

router.get('/', authenticate, ExportOrderController.getAll);
router.get('/:id', authenticate, ExportOrderController.getById);

router.post(
  '/',
  authenticate,
  authorize('admin', 'warehouse_staff'),
  ExportOrderController.create
);

router.put(
  '/:id/confirm',
  authenticate,
  authorize('admin', 'warehouse_staff'),
  ExportOrderController.confirm
);

router.post(
  '/:id/cancel',
  authenticate,
  authorize('admin', 'warehouse_staff'),
  ExportOrderController.cancel
);

export default router;
