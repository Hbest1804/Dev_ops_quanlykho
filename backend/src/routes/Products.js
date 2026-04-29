import { Router } from 'express';
import { ProductController } from '../controllers/productController.js';
import { authenticate } from '../middlewares/Authenticate.js';
import { authorize } from '../middlewares/Authorization.js';

const router = Router();

// GET /api/products  — Lấy danh sách (tất cả role đã đăng nhập)
// Query: ?search=&category=&status=&page=1&limit=20
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

// PUT /api/products/:id  — Cập nhật (chỉ admin & warehouse_staff)
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'warehouse_staff'),
  ProductController.update
);

// DELETE /api/products/:id  — Xoá (chỉ admin)
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  ProductController.delete
);

export default router;
