import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authenticate } from '../middlewares/Authenticate.js';

const router = Router();

router.post('/login',   AuthController.login);
router.get('/me',      authenticate, AuthController.me);
router.post('/refresh', AuthController.refresh);
router.post('/logout',  authenticate, AuthController.logout);

export default router;
