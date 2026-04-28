import { Router } from 'express';
import { ReportController } from '../controllers/ReportController.js';
import { authenticate } from '../middlewares/Authenticate.js';
import { authorize } from '../middlewares/Authorization.js';

const router = Router();

router.get('/summary',      authenticate, authorize('admin', 'accountant'), ReportController.getSummary);
router.get('/top-products', authenticate, authorize('admin', 'accountant'), ReportController.getTopProducts);

export default router;
