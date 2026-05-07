import { pool } from '../db/Pool.js';
import { NotFound } from '../utils/AppError.js';

export const ExportOrderRepository = {
  async findById(id) {
    const { rows } = await pool.query(
      'SELECT * FROM export_orders WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  },

  async findByIdForUpdate(id, client) {
    const { rows } = await client.query(
      'SELECT * FROM export_orders WHERE id = $1 FOR UPDATE',
      [id]
    );
    return rows[0] ?? null;
  },

  async findItemsByOrderId(orderId, client = pool) {
    const { rows } = await client.query(
      'SELECT * FROM export_order_items WHERE export_order_id = $1',
      [orderId]
    );
    return rows;
  },

  async cancel(id) {
    const { rows } = await pool.query(
      `UPDATE export_orders
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id]
    );
    return rows[0] ?? null;
  },

  async updateStatus(id, status, confirmedBy, client = pool) {
    const { rows } = await client.query(
      `UPDATE export_orders
       SET status = $1, confirmed_by = $2, confirmed_at = NOW(), updated_at = NOW()
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [status, confirmedBy, id]
    );
    return rows[0] ?? null;
  },

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

      const { rows: itemRows } = await client.query(
        `INSERT INTO export_order_items
           (export_order_id, product_id, quantity, note,
            snapshot_product_code, snapshot_product_name, snapshot_unit, snapshot_category)
         SELECT $1, p.id, v.quantity, v.note, p.code, p.name, p.unit, p.category
         FROM unnest($2::int[], $3::int[], $4::text[]) AS v(product_id, quantity, note)
         JOIN products p ON p.id = v.product_id AND p.is_deleted = FALSE
         RETURNING id, export_order_id, product_id, quantity, note,
                   snapshot_product_code, snapshot_product_name, snapshot_unit, snapshot_category`,
        [order.id, productIds, quantities, notes]
      );
      if (itemRows.length !== items.length) {
        throw NotFound('One or more products not found or deleted');
      }

      await client.query('COMMIT');
      return { ...order, items: itemRows };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
