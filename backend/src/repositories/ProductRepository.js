import { pool } from '../db/Pool.js';

export const ProductRepository = {
  /**
   * Trả về tổng số sản phẩm phù hợp với điều kiện lọc (dùng cho phân trang).
   */
  async count({ search, category }) {
    const conditions = [];
    const values = [];
    let i = 1;

    if (search) {
      conditions.push(`(code ILIKE $${i} OR name ILIKE $${i})`);
      values.push(`%${search}%`);
      i++;
    }
    if (category) {
      conditions.push(`category = $${i}`);
      values.push(category);
      i++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM products ${where}`,
      values
    );
    return rows[0].total;
  },

  /**
   * Lấy danh sách sản phẩm có lọc / phân trang.
   */
  async findAll({ search, category, page = 1, limit = 20 }) {
    const conditions = [];
    const values = [];
    let i = 1;

    if (search) {
      conditions.push(`(code ILIKE $${i} OR name ILIKE $${i})`);
      values.push(`%${search}%`);
      i++;
    }
    if (category) {
      conditions.push(`category = $${i}`);
      values.push(category);
      i++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT id, code, name, category, unit, description, stock, created_at, updated_at
         FROM products
         ${where}
         ORDER BY created_at DESC
         LIMIT $${i} OFFSET $${i + 1}`,
      values
    );
    return rows;
  },

  /**
   * Lấy một sản phẩm theo ID.
   */
  async findById(id) {
    const { rows } = await pool.query(
      `SELECT id, code, name, category, unit, description, stock, created_at, updated_at
         FROM products WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  /**
   * Lấy một sản phẩm theo mã (dùng kiểm tra trùng code).
   */
  async findByCode(code) {
    const { rows } = await pool.query(
      'SELECT id FROM products WHERE code = $1',
      [code]
    );
    return rows[0] ?? null;
  },

  /**
   * Tạo sản phẩm mới.
   */
  async create({ code, name, category, unit, description, initialStock }) {
    const { rows } = await pool.query(
      `INSERT INTO products (code, name, category, unit, description, stock)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, code, name, category, unit, description, stock, created_at, updated_at`,
      [code, name, category, unit, description ?? '', initialStock ?? 0]
    );
    return rows[0];
  },
};
