import { pool } from '../db/Pool.js';

export const ReportRepository = {
  async getInventoryReport(fromDate, toDate, category) {
    let query = `
      SELECT 
        p.id, 
        p.code, 
        p.name, 
        p.category, 
        p.unit,
        COALESCE(os.opening_stock, 0)::int AS opening_stock,
        COALESCE(p_trans.total_import, 0)::int AS total_import,
        COALESCE(p_trans.total_export, 0)::int AS total_export
      FROM products p
      LEFT JOIN (
        SELECT product_id, SUM(quantity) as opening_stock
        FROM stock_transactions
        WHERE created_at < $1
        GROUP BY product_id
      ) os ON p.id = os.product_id
      LEFT JOIN (
        SELECT product_id,
               SUM(CASE WHEN type = 'import' THEN quantity ELSE 0 END) as total_import,
               SUM(CASE WHEN type = 'export' THEN ABS(quantity) ELSE 0 END) as total_export
        FROM stock_transactions
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY product_id
      ) p_trans ON p.id = p_trans.product_id
      WHERE 1=1
    `;
    
    const values = [fromDate, toDate];
    let paramIndex = 3;

    if (category) {
      query += ` AND p.category = $${paramIndex}`;
      values.push(category);
      paramIndex++;
    }

    // Chỉ xuất hiện nếu có tồn đầu kỳ HOẶC có phát sinh trong kỳ
    query += `
      AND (
        COALESCE(os.opening_stock, 0) > 0 
        OR COALESCE(p_trans.total_import, 0) > 0 
        OR COALESCE(p_trans.total_export, 0) > 0
      )
      ORDER BY p.code ASC
    `;

    const { rows } = await pool.query(query, values);
    return rows;
  }
};
