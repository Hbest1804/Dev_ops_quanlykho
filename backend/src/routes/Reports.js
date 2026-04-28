import express from 'express';
import { ReportController } from '../controllers/ReportController.js';
import { authenticate } from '../middlewares/Authenticate.js';
import { authorize } from '../middlewares/Authorization.js';

const router = express.Router();

// Chỉ Admin và Kế toán mới được xem báo cáo
router.get('/inventory', authenticate, authorize('admin', 'accountant'), ReportController.getInventory);

export default router;
