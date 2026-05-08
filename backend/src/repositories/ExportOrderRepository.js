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

  async count({ status, reason, from, to, search }) {
    const conditions = [];
    const values = [];
    let i = 1;
    if (search) { conditions.push(`code ILIKE $${i++}`); values.push(`%${search}%`); }
    if (status) { conditions.push(`status = $${i++}`); values.push(status); }
    if (reason) { conditions.push(`reason = $${i++}`); values.push(reason); }
    if (from)   { conditions.push(`export_date >= $${i++}`); values.push(from); }
    if (to)     { conditions.push(`export_date <= $${i++}`); values.push(to); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM export_orders ${where}`,
      values
    );
    return rows[0].total;
  },

  async findAll({ status, reason, from, to, search, page = 1, limit = 20 }) {
    const conditions = [];
    const values = [];
    let i = 1;
    if (search) { conditions.push(`eo.code ILIKE $${i++}`); values.push(`%${search}%`); }
    if (status) { conditions.push(`eo.status = $${i++}`); values.push(status); }
    if (reason) { conditions.push(`eo.reason = $${i++}`); values.push(reason); }
    if (from)   { conditions.push(`eo.export_date >= $${i++}`); values.push(from); }
    if (to)     { conditions.push(`eo.export_date <= $${i++}`); values.push(to); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT eo.id, eo.code, eo.reason, eo.status, eo.export_date, eo.created_at,
              u.name AS created_by_name,
              COALESCE(SUM(eoi.quantity), 0)::int AS total_quantity
       FROM export_orders eo
       LEFT JOIN users u ON u.id = eo.created_by
       LEFT JOIN export_order_items eoi ON eoi.export_order_id = eo.id
       ${where}
       GROUP BY eo.id, u.name
       ORDER BY eo.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      values
    );
    return rows;
  },

  async findByIdWithItems(id) {
    const { rows: orderRows } = await pool.query(
      `SELECT eo.*,
              u1.name AS created_by_name,
              u2.name AS confirmed_by_name,
              u3.name AS cancelled_by_name
       FROM export_orders eo
       LEFT JOIN users u1 ON u1.id = eo.created_by
       LEFT JOIN users u2 ON u2.id = eo.confirmed_by
       LEFT JOIN users u3 ON u3.id = eo.cancelled_by
       WHERE eo.id = $1`,
      [id]
    );
    if (!orderRows[0]) return null;
    const { rows: itemRows } = await pool.query(
      `SELECT product_id, quantity, note,
              snapshot_product_code, snapshot_product_name, snapshot_unit, snapshot_category
       FROM export_order_items WHERE export_order_id = $1`,
      [id]
    );
    return { ...orderRows[0], items: itemRows };
  },

  async cancel(id, cancelledBy, client = pool) {
    const { rows } = await client.query(
      `UPDATE export_orders
       SET status = 'cancelled', cancelled_by = $2, cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, cancelledBy]
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
