import { pool } from '../db/Pool.js';

/**
 * Xây dựng mệnh đề WHERE và mảng giá trị dùng chung cho count() và findAll().
 * Hỗ trợ lọc theo: search, category, status (stock-based).
 *
 * Ánh xạ status → điều kiện SQL tồn kho:
 *   'Còn Hàng'  → stock > 20
 *   'Sắp Hết'   → stock > 0 AND stock <= 20
 *   'Hết Hàng'  → stock = 0
 */
function buildWhereClause({ search, category, status }) {
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
  if (status) {
    if (status === 'IN_STOCK') {
      conditions.push(`stock > 20`);
    } else if (status === 'LOW_STOCK') {
      conditions.push(`stock > 0 AND stock <= 20`);
    } else if (status === 'OUT_OF_STOCK') {
      conditions.push(`stock = 0`);
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, values, nextIndex: i };
}

export const ProductRepository = {
  /**
   * Trả về tổng số sản phẩm phù hợp với điều kiện lọc (dùng cho phân trang).
   */
  async count({ search, category, status }) {
    const { where, values } = buildWhereClause({ search, category, status });
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM products ${where}`,
      values
    );
    return rows[0].total;
  },

  /**
   * Lấy danh sách sản phẩm có lọc / phân trang.
   */
  async findAll({ search, category, status, page = 1, limit = 20 }) {
    const { where, values, nextIndex: i } = buildWhereClause({ search, category, status });
    const offset = (page - 1) * limit;

    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT id, code, name, category, unit, description, stock
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

  /**
   * Cập nhật thông tin sản phẩm theo ID.
   * Chỉ cho phép sửa: name, category, unit, description.
   */
  async update(id, { name, category, unit, description }) {
    const { rows } = await pool.query(
      `UPDATE products
          SET name        = $1,
              category    = $2,
              unit        = $3,
              description = $4,
              updated_at  = NOW()
        WHERE id = $5
        RETURNING id, code, name, category, unit, description, stock, created_at, updated_at`,
      [name, category, unit, description ?? '', id]
    );
    return rows[0] ?? null;
  },

  async countTransactions(productId) {
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS total FROM stock_transactions WHERE product_id = $1',
      [productId]
    );
    return rows[0].total;
  },

  async hardDelete(id) {
    const { rows } = await pool.query(
      `DELETE FROM products WHERE id = $1 RETURNING id, code`,
      [id]
    );
    return rows[0] ?? null;
  },

  async softDelete(id, userId) {
    const { rows } = await pool.query(
      `UPDATE products
          SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $1
        WHERE id = $2
        RETURNING id, code`,
      [userId, id]
    );
    return rows[0] ?? null;
  },
};
