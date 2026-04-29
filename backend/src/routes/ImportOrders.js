import { Router } from 'express';
import { ImportOrderController } from '../controllers/ImportOrderController.js';
import { authenticate } from '../middlewares/Authenticate.js';
import { authorize } from '../middlewares/Authorization.js';

const router = Router();

// All routes require authentication
// Confirm/Cancel restricted to admin & warehouse_staff
const canManage = authorize('admin', 'warehouse_staff');

router.get('/',           authenticate, ImportOrderController.list);
router.get('/:id',        authenticate, ImportOrderController.getById);
router.post('/',          authenticate, canManage, ImportOrderController.create);
router.post('/:id/confirm', authenticate, canManage, ImportOrderController.confirm);
router.post('/:id/cancel',  authenticate, canManage, ImportOrderController.cancel);

export default router;
