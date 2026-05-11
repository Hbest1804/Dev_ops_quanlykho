import { pool } from '../db/Pool.js';

export const StockTransactionRepository = {
  async create({ productId, type, quantity, stockAfter, refType, refId, snapshotProductCode, snapshotProductName, snapshotUnit, createdBy }, client = pool) {
    const { rows } = await client.query(
      `INSERT INTO stock_transactions
        (product_id, type, quantity, stock_after, ref_type, ref_id, snapshot_product_code, snapshot_product_name, snapshot_unit, created_by)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        productId, type, quantity, stockAfter, refType, refId,
        snapshotProductCode, snapshotProductName, snapshotUnit, createdBy
      ]
    );
    return rows[0];
  },

  /**
   * Lấy lịch sử giao dịch của một sản phẩm (có lọc ngày, phân trang).
   * @param {number} productId
   * @param {{ from?: string, to?: string, page: number, limit: number }} opts
   */
  async findByProductId(productId, { from, to, page = 1, limit = 20 } = {}) {
    const conditions = ['st.product_id = $1'];
    const values = [productId];
    let i = 2;

    if (from) {
      conditions.push(`st.created_at >= $${i}`);
      values.push(new Date(`${from}T00:00:00.000Z`));
      i++;
    }
    if (to) {
      conditions.push(`st.created_at <= $${i}`);
      values.push(new Date(`${to}T23:59:59.999Z`));
      i++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const offset = (page - 1) * limit;
    values.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT
         st.type,
         st.quantity,
         st.stock_after    AS "stockAfter",
         st.ref_type       AS "refType",
         st.ref_id         AS "refId",
         st.created_at     AS "createdAt",
         u.name            AS "createdBy"
       FROM stock_transactions st
       JOIN users u ON u.id = st.created_by
       ${where}
       ORDER BY st.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      values
    );
    return rows;
  },

  /**
   * Đếm tổng số giao dịch của một sản phẩm (dùng cho phân trang).
   */
  async countByProductId(productId, { from, to } = {}) {
    const conditions = ['product_id = $1'];
    const values = [productId];
    let i = 2;

    if (from) {
      conditions.push(`created_at >= $${i}`);
      values.push(new Date(`${from}T00:00:00.000Z`));
      i++;
    }
    if (to) {
      conditions.push(`created_at <= $${i}`);
      values.push(new Date(`${to}T23:59:59.999Z`));
      i++;
    }

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM stock_transactions WHERE ${conditions.join(' AND ')}`,
      values
    );
    return rows[0].total;
  },

  async createMany(transactions, client = pool) {
    if (!transactions.length) return [];

    const values = [];
    const placeholders = transactions.map((t, i) => {
      const offset = i * 10;
      values.push(
        t.productId, t.type, t.quantity, t.stockAfter, t.refType, t.refId,
        t.snapshotProductCode, t.snapshotProductName, t.snapshotUnit, t.createdBy
      );
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`;
    }).join(', ');

    const query = `
      INSERT INTO stock_transactions
        (product_id, type, quantity, stock_after, ref_type, ref_id, snapshot_product_code, snapshot_product_name, snapshot_unit, created_by)
      VALUES ${placeholders}
      RETURNING *
    `;

    const { rows } = await client.query(query, values);
    return rows;
  },
};
