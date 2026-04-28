import { Router } from 'express';
import { ExportOrderController } from '../controllers/ExportOrderController.js';
import { authenticate } from '../middlewares/Authenticate.js';
import { authorize } from '../middlewares/Authorization.js';

const router = Router();

// POST /api/export-orders — Tạo phiếu xuất (admin & warehouse_staff)
router.post(
  '/',
  authenticate,
  authorize('admin', 'warehouse_staff'),
  ExportOrderController.create
);

// PUT /api/export-orders/:id/confirm — Duyệt phiếu xuất (admin & warehouse_staff)
router.put(
  '/:id/confirm',
  authenticate,
  authorize('admin', 'warehouse_staff'),
  ExportOrderController.confirm
);

export default router;
