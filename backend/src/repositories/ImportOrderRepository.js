import { pool } from '../db/Pool.js';

export const ImportOrderRepository = {
  async createWithItems({ supplier, importDate, note, userId }, items) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: orderRows } = await client.query(
        `INSERT INTO import_orders (code, supplier, status, import_date, note, created_by)
         VALUES (
           'PN' || TO_CHAR(NEXTVAL('import_order_code_seq'), 'FM000'),
           $1, 'pending', $2, $3, $4
         )
         RETURNING id, code, supplier, status, import_date, note, created_by, created_at, updated_at`,
        [supplier, importDate, note ?? null, userId]
      );
      const order = orderRows[0];

      const productIds = items.map(i => i.productId);
      const quantities = items.map(i => i.quantity);
      const notes      = items.map(i => i.note ?? null);

      await client.query(
        `INSERT INTO import_order_items
           (import_order_id, product_id, quantity, note,
            snapshot_product_code, snapshot_product_name, snapshot_unit, snapshot_category)
         SELECT $1, p.id, v.quantity, v.note, p.code, p.name, p.unit, p.category
         FROM unnest($2::int[], $3::int[], $4::text[]) AS v(product_id, quantity, note)
         JOIN products p ON p.id = v.product_id`,
        [order.id, productIds, quantities, notes]
      );

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
