import 'dotenv/config';
import express from 'express';
import router from './routes/index.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { pool } from './db/pool.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', router);

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

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();

export default app;
