import { Router } from 'express';
import { ImportOrderController } from '../controllers/ImportOrderController.js';
import { authenticate }  from '../middlewares/Authenticate.js';
import { authorize }     from '../middlewares/Authorization.js';

const router = Router();

// Xem danh sách / chi tiết: mọi user đã đăng nhập
router.get('/',    authenticate, ImportOrderController.list);
router.get('/:id', authenticate, ImportOrderController.getById);

// Tạo / Xác nhận / Huỷ: chỉ admin & warehouse_staff
const canManage = authorize('admin', 'warehouse_staff');

router.post('/',            authenticate, canManage, ImportOrderController.create);
router.post('/:id/confirm', authenticate, canManage, ImportOrderController.confirm);
router.post('/:id/cancel',  authenticate, canManage, ImportOrderController.cancel);

export default router;
