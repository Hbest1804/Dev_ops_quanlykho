import { pool } from '../db/Pool.js';

export const UserRepository = {
  async findAll() {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, status, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  },

  async findByEmail(email) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return rows[0] ?? null;
  },

  async create({ name, email, password, role }) {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, status, created_at, updated_at`,
      [name, email, password, role]
    );
    return rows[0];
  },

  async update(id, { name, email, password, role, status }) {
    const fields = [];
    const values = [];
    let i = 1;

    if (name !== undefined)     { fields.push(`name = $${i++}`);     values.push(name); }
    if (email !== undefined)    { fields.push(`email = $${i++}`);    values.push(email); }
    if (password !== undefined) { fields.push(`password = $${i++}`); values.push(password); }
    if (role !== undefined)     { fields.push(`role = $${i++}`);     values.push(role); }
    if (status !== undefined)   { fields.push(`status = $${i++}`);   values.push(status); }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i}
       RETURNING id, name, email, role, status, created_at, updated_at`,
      values
    );
    return rows[0] ?? null;
  },
};
