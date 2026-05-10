import { pool } from '../db/Pool.js';

function buildQuery({ from, to, category }) {
  const conditions = [];
  const values = [from, to];
  let i = 3;

  conditions.push('p.is_deleted = FALSE');
  if (category) { conditions.push(`p.category = $${i++}`); values.push(category); }

  const where = `WHERE ${conditions.join(' AND ')}`;
  return { where, values, nextIndex: i };
}

const BASE_CTE = `
  WITH os AS (
    SELECT product_id, SUM(quantity) AS opening_stock
    FROM stock_transactions
    WHERE created_at < $1::date
    GROUP BY product_id
  ),
  pt AS (
    SELECT product_id,
           SUM(CASE WHEN type = 'import' THEN quantity  ELSE 0 END) AS total_import,
           SUM(CASE WHEN type = 'export' THEN ABS(quantity) ELSE 0 END) AS total_export
    FROM stock_transactions
    WHERE created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')
    GROUP BY product_id
  )
`;

export const ReportRepository = {
  async findSummary({ from, to, category, page = 1, limit = 50 }) {
    const { where, values, nextIndex: i } = buildQuery({ from, to, category });
    const offset = (page - 1) * limit;
    values.push(limit, offset);

    const { rows } = await pool.query(
      `${BASE_CTE}
       SELECT p.id          AS product_id,
              p.code        AS product_code,
              p.name        AS product_name,
              p.category    AS category,
              p.unit        AS unit,
              COALESCE(os.opening_stock, 0) AS opening_stock,
              COALESCE(pt.total_import,  0) AS total_import,
              COALESCE(pt.total_export,  0) AS total_export
       FROM products p
       LEFT JOIN os ON os.product_id = p.id
       LEFT JOIN pt ON pt.product_id = p.id
       ${where}
         AND (COALESCE(os.opening_stock, 0) > 0
              OR COALESCE(pt.total_import,  0) > 0
              OR COALESCE(pt.total_export,  0) > 0)
       ORDER BY p.code ASC
       LIMIT $${i} OFFSET $${i + 1}`,
      values
    );
    return rows;
  },

  async countSummary({ from, to, category }) {
    const { where, values } = buildQuery({ from, to, category });

    const { rows } = await pool.query(
      `${BASE_CTE}
       SELECT COUNT(*) AS total
       FROM products p
       LEFT JOIN os ON os.product_id = p.id
       LEFT JOIN pt ON pt.product_id = p.id
       ${where}
         AND (COALESCE(os.opening_stock, 0) > 0
              OR COALESCE(pt.total_import,  0) > 0
              OR COALESCE(pt.total_export,  0) > 0)`,
      values
    );
    return Number(rows[0].total);
  },

  async findTotals({ from, to, category }) {
    const BASE_TOTALS = `
      WITH os_agg AS (
        SELECT COALESCE(SUM(st.quantity), 0) AS opening_total
        FROM stock_transactions st
        JOIN products p ON p.id = st.product_id AND p.is_deleted = FALSE
        WHERE st.created_at < $1::date
      ),
      pt_agg AS (
        SELECT
          COALESCE(SUM(CASE WHEN st.type = 'import' THEN st.quantity ELSE 0 END), 0) AS total_import,
          COALESCE(SUM(CASE WHEN st.type = 'export' THEN ABS(st.quantity) ELSE 0 END), 0) AS total_export
        FROM stock_transactions st
        JOIN products p ON p.id = st.product_id AND p.is_deleted = FALSE
        WHERE st.created_at >= $1::date AND st.created_at < ($2::date + INTERVAL '1 day')
      )
      SELECT pt_agg.total_import,
             pt_agg.total_export,
             os_agg.opening_total + pt_agg.total_import - pt_agg.total_export AS total_closing
      FROM pt_agg, os_agg`;

    const CATEGORY_TOTALS = `
      WITH os_agg AS (
        SELECT COALESCE(SUM(st.quantity), 0) AS opening_total
        FROM stock_transactions st
        JOIN products p ON p.id = st.product_id AND p.is_deleted = FALSE AND p.category = $3
        WHERE st.created_at < $1::date
      ),
      pt_agg AS (
        SELECT
          COALESCE(SUM(CASE WHEN st.type = 'import' THEN st.quantity ELSE 0 END), 0) AS total_import,
          COALESCE(SUM(CASE WHEN st.type = 'export' THEN ABS(st.quantity) ELSE 0 END), 0) AS total_export
        FROM stock_transactions st
        JOIN products p ON p.id = st.product_id AND p.is_deleted = FALSE AND p.category = $3
        WHERE st.created_at >= $1::date AND st.created_at < ($2::date + INTERVAL '1 day')
      )
      SELECT pt_agg.total_import,
             pt_agg.total_export,
             os_agg.opening_total + pt_agg.total_import - pt_agg.total_export AS total_closing
      FROM pt_agg, os_agg`;

    const values = category ? [from, to, category] : [from, to];
    const { rows } = await pool.query(category ? CATEGORY_TOTALS : BASE_TOTALS, values);
    return {
      totalImport: Number(rows[0].total_import),
      totalExport: Number(rows[0].total_export),
      totalClosing: Number(rows[0].total_closing),
    };
  },

  async getTopProducts(fromDate, toDate, type, limit = 10) {
    const query = `
      SELECT 
        p.id, 
        p.code, 
        p.name, 
        p.category, 
        p.unit,
        SUM(ABS(st.quantity)) AS total_quantity
      FROM stock_transactions st
      JOIN products p ON st.product_id = p.id
      WHERE st.created_at >= $1 AND st.created_at <= $2
        AND st.type = $3
      GROUP BY p.id, p.code, p.name, p.category, p.unit
      ORDER BY total_quantity DESC
      LIMIT $4
    `;
    const { rows } = await pool.query(query, [fromDate, toDate, type, limit]);
    return rows;
  }
};
