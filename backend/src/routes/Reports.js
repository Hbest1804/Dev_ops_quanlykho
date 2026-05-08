import { Router } from 'express';
import { ReportController } from '../controllers/ReportController.js';
import { authenticate } from '../middlewares/Authenticate.js';
import { authorize } from '../middlewares/Authorization.js';

const router = Router();

router.get('/summary', authenticate, authorize('admin', 'accountant'), ReportController.getSummary);

export default router;
