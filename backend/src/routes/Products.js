import { Router } from 'express';
import { ProductController } from '../controllers/productController.js';
import { authenticate } from '../middlewares/Authenticate.js';
import { authorize } from '../middlewares/Authorization.js';

const router = Router();

// GET /api/products  — Lấy danh sách (tất cả role đã đăng nhập)
router.get(
  '/',
  authenticate,
  ProductController.list
);

// GET /api/products/:id  — Lấy chi tiết (tất cả role đã đăng nhập)
router.get(
  '/:id',
  authenticate,
  ProductController.getById
);

// POST /api/products  — Tạo mới (chỉ admin & warehouse_staff)
router.post(
  '/',
  authenticate,
  authorize('admin', 'warehouse_staff'),
  ProductController.create
);

export default router;
