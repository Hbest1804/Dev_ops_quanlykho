import bcrypt from 'bcrypt';
import { pool } from './Pool.js';

export async function seedAdminUser() {
  const email    = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name     = process.env.ADMIN_NAME || 'Administrator';

  if (!email || !password) {
    console.warn('Seed: ADMIN_EMAIL hoặc ADMIN_PASSWORD chưa được set, bỏ qua.');
    return;
  }

  const { rows } = await pool.query(
    'SELECT id FROM users WHERE role = $1 LIMIT 1',
    ['admin']
  );

  if (rows.length > 0) return;

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'admin')`,
    [name, email, hash]
  );

  console.log(`Seed: tạo admin mặc định (${email})`);
}
