import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/Auth.js';
import usersRouter from './routes/Users.js';
import productsRouter from './routes/Products.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { pool } from './db/Pool.js';
import { seedAdminUser } from './db/Seed.js'; ``

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);

app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    const client = await pool.connect();
    client.release();
    console.log('Database connected');
    await seedAdminUser();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();

export default app;
