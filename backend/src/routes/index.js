import { Router } from 'express';
import productRoutes from './productRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.use('/products', productRoutes);

export default router;
