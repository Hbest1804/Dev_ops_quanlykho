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

export default router;
