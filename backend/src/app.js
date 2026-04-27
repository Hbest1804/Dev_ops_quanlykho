import 'dotenv/config';
import express from 'express';
import authRouter from './routes/Auth.js';
import { notFound, errorHandler } from './middlewares/ErrorHandler.js';
import { pool } from './db/Pool.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);

app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    const client = await pool.connect();
    client.release();
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();

export default app;
