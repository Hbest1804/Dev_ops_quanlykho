import { Router } from 'express';
import { ImportOrderController } from '../controllers/ImportOrderController.js';
import { authenticate } from '../middlewares/Authenticate.js';
import { authorize } from '../middlewares/Authorization.js';

const router = Router();

// POST /api/import-orders — Tạo phiếu nhập (admin & warehouse_staff)
router.post(
  '/',
  authenticate,
  authorize('admin', 'warehouse_staff'),
  ImportOrderController.create
);

export default router;
