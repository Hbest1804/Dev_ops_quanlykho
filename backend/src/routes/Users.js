import { Router } from 'express';
import { UserController } from '../controllers/UserController.js';
import { authenticate } from '../middlewares/Authenticate.js';
import { authorize } from '../middlewares/Authorization.js';

const router = Router();

router.get('/',  authenticate, authorize('admin'), UserController.list);
router.post('/', authenticate, authorize('admin'), UserController.create);
router.patch('/:id', authenticate, authorize('admin'), UserController.update);

export default router;
