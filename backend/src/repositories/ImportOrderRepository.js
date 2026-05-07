import { pool } from '../db/Pool.js';

export const ImportOrderRepository = {
  async create({ supplier, importDate, note, userId }) {
    const { rows } = await pool.query(
      `WITH next_code AS (
         SELECT 'PN' || LPAD(
           (COALESCE(MAX(SUBSTRING(code FROM 3)::INTEGER), 0) + 1)::text,
           3, '0'
         ) AS code
         FROM import_orders
       )
       INSERT INTO import_orders (code, supplier, status, import_date, note, created_by)
       SELECT next_code.code, $1, 'pending', $2, $3, $4
       FROM next_code
       RETURNING id, code, supplier, status, import_date, note, created_by, created_at, updated_at`,
      [supplier, importDate, note ?? null, userId]
    );
    return rows[0];
  },

  async createItems(importOrderId, items) {
    const productIds = items.map(i => i.productId);
    const quantities = items.map(i => i.quantity);
    const notes     = items.map(i => i.note ?? null);

    const { rows } = await pool.query(
      `INSERT INTO import_order_items
         (import_order_id, product_id, quantity, note,
          snapshot_product_code, snapshot_product_name, snapshot_unit, snapshot_category)
       SELECT $1, p.id, v.quantity, v.note, p.code, p.name, p.unit, p.category
       FROM unnest($2::int[], $3::int[], $4::text[]) AS v(product_id, quantity, note)
       JOIN products p ON p.id = v.product_id
       RETURNING *`,
      [importOrderId, productIds, quantities, notes]
    );
    return rows;
  },
};
