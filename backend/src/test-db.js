import 'dotenv/config';
import { pool } from './db/Pool.js';

async function test() {
  try {
    const client = await pool.connect();
    console.log('Connected');
    const res = await client.query('SELECT * FROM users LIMIT 1');
    console.log('Users table exists, rows:', res.rows.length);
    client.release();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

test();