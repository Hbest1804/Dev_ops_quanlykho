import { pool } from '../db/Pool.js';

export const ExportOrderRepository = {
  async createWithItems({ reason, exportDate, note, userId }, items) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: orderRows } = await client.query(
        `INSERT INTO export_orders (code, reason, status, export_date, note, created_by)
         VALUES (
           'PX' || TO_CHAR(NEXTVAL('export_order_code_seq'), 'FM000'),
           $1, 'pending', $2, $3, $4
         )
         RETURNING id, code, reason, status, export_date, note, created_by, created_at, updated_at`,
        [reason, exportDate, note ?? null, userId]
      );
      const order = orderRows[0];

      const productIds = items.map(i => i.productId);
      const quantities = items.map(i => i.quantity);
      const notes      = items.map(i => i.note ?? null);

      const { rowCount } = await client.query(
        `INSERT INTO export_order_items
           (export_order_id, product_id, quantity, note,
            snapshot_product_code, snapshot_product_name, snapshot_unit, snapshot_category)
         SELECT $1, p.id, v.quantity, v.note, p.code, p.name, p.unit, p.category
         FROM unnest($2::int[], $3::int[], $4::text[]) AS v(product_id, quantity, note)
         JOIN products p ON p.id = v.product_id AND p.is_deleted = FALSE`,
        [order.id, productIds, quantities, notes]
      );
      if (rowCount !== items.length) {
        throw new Error('One or more products not found or deleted');
      }

      await client.query('COMMIT');
      return order;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
