import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/Auth.js';
import usersRouter from './routes/Users.js';
import productsRouter from './routes/Products.js';
import importOrdersRouter from './routes/ImportOrders.js';
import exportOrdersRouter from './routes/ExportOrders.js';
import reportsRouter from './routes/Reports.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { pool } from './db/Pool.js';
import { seedAdminUser } from './db/Seed.js';

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Cho phép request không có origin (Postman, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin "${origin}" not allowed`));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth',          authRouter);
app.use('/api/users',         usersRouter);
app.use('/api/products',      productsRouter);
app.use('/api/import-orders', importOrdersRouter);
app.use('/api/export-orders', exportOrdersRouter);
app.use('/api/reports',       reportsRouter);

app.use(notFound);
app.use(errorHandler);

// Khởi động DB và seed (chạy cả local lẫn Vercel)
async function initDB() {
  try {
    const client = await pool.connect();
    client.release();
    console.log('Database connected');
    await seedAdminUser();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    // Không gọi process.exit trên Vercel serverless
    if (process.env.VERCEL !== '1') process.exit(1);
  }
}

initDB();

// Chỉ listen khi chạy local (không phải Vercel serverless)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
