import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authenticate } from '../middlewares/Authenticate.js';
import { authorize } from '../middlewares/Authorization.js';

const router = Router();

router.post('/login',                                          AuthController.login);
router.get('/me',         authenticate,                        AuthController.me);
router.post('/refresh',                                        AuthController.refresh);
router.post('/logout',    authenticate,                        AuthController.logout);

// Người dùng tự đổi mật khẩu (cần xác minh mật khẩu hiện tại)
router.post('/change-password', authenticate,                  AuthController.changePassword);

// Admin reset mật khẩu của user bất kỳ (không cần mật khẩu cũ)
router.post('/reset-password/:userId', authenticate, authorize('admin'), AuthController.resetPassword);

export default router;
