import { pool } from '../db/Pool.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function buildOrderFromRows(orderRow, itemRows) {
  return {
    ...orderRow,
    items: itemRows.filter(i => i.import_order_id === orderRow.id),
  };
}

// ─── repository ─────────────────────────────────────────────────────────────

export const ImportOrderRepository = {

  // GET all import orders, newest first, with items embedded
  async findAll({ status, search } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (status) {
      conditions.push(`io.status = $${idx++}`);
      values.push(status);
    }
    if (search) {
      conditions.push(`(io.code ILIKE $${idx} OR io.supplier ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows: orders } = await pool.query(
      `SELECT io.id, io.code, io.supplier, io.status, io.import_date,
              io.note, io.created_by, io.confirmed_by, io.confirmed_at,
              io.created_at, io.updated_at
         FROM import_orders io
         ${where}
         ORDER BY io.created_at DESC`,
      values
    );

    if (orders.length === 0) return [];

    const ids = orders.map(o => o.id);
    const { rows: items } = await pool.query(
      `SELECT id, import_order_id, product_id, quantity, note,
              snapshot_product_code, snapshot_product_name,
              snapshot_unit, snapshot_category
         FROM import_order_items
         WHERE import_order_id = ANY($1)`,
      [ids]
    );

    return orders.map(o => buildOrderFromRows(o, items));
  },

  // GET single import order by id with items
  async findById(id) {
    const { rows: orders } = await pool.query(
      `SELECT io.id, io.code, io.supplier, io.status, io.import_date,
              io.note, io.created_by, io.confirmed_by, io.confirmed_at,
              io.created_at, io.updated_at
         FROM import_orders io
         WHERE io.id = $1`,
      [id]
    );
    if (!orders[0]) return null;

    const { rows: items } = await pool.query(
      `SELECT id, import_order_id, product_id, quantity, note,
              snapshot_product_code, snapshot_product_name,
              snapshot_unit, snapshot_category
         FROM import_order_items
         WHERE import_order_id = $1`,
      [id]
    );

    return buildOrderFromRows(orders[0], items);
  },

  // POST create new import order + items
  async create({ supplier, import_date, note, items, created_by }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Generate code: PN + zero-padded count+1
      const { rows: countRows } = await client.query(
        'SELECT COUNT(*) FROM import_orders'
      );
      const nextNum = parseInt(countRows[0].count) + 1;
      const code = `PN${String(nextNum).padStart(3, '0')}`;

      const { rows: orderRows } = await client.query(
        `INSERT INTO import_orders (code, supplier, status, import_date, note, created_by)
         VALUES ($1, $2, 'pending', $3, $4, $5)
         RETURNING id, code, supplier, status, import_date, note,
                   created_by, confirmed_by, confirmed_at, created_at, updated_at`,
        [code, supplier, import_date, note || null, created_by]
      );
      const order = orderRows[0];

      const insertedItems = [];
      for (const item of items) {
        // Fetch product snapshot
        const { rows: pRows } = await client.query(
          'SELECT code, name, unit, category FROM products WHERE id = $1',
          [item.product_id]
        );
        if (!pRows[0]) throw new Error(`Product ${item.product_id} not found`);
        const p = pRows[0];

        const { rows: itemRows } = await client.query(
          `INSERT INTO import_order_items
             (import_order_id, product_id, quantity, note,
              snapshot_product_code, snapshot_product_name,
              snapshot_unit, snapshot_category)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, import_order_id, product_id, quantity, note,
                     snapshot_product_code, snapshot_product_name,
                     snapshot_unit, snapshot_category`,
          [
            order.id, item.product_id, item.quantity, item.note || null,
            p.code, p.name, p.unit, p.category,
          ]
        );
        insertedItems.push(itemRows[0]);
      }

      await client.query('COMMIT');
      return { ...order, items: insertedItems };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // POST confirm – atomic: update order + update stock + log transactions
  async confirm(id, confirmedBy) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock & fetch order
      const { rows: orderRows } = await client.query(
        `SELECT id, status FROM import_orders WHERE id = $1 FOR UPDATE`,
        [id]
      );
      const order = orderRows[0];
      if (!order) throw Object.assign(new Error('Phiếu nhập không tồn tại'), { status: 404 });
      if (order.status !== 'pending')
        throw Object.assign(new Error('Chỉ có thể xác nhận phiếu đang chờ xử lý'), { status: 400 });

      // Fetch items
      const { rows: items } = await client.query(
        `SELECT ioi.id, ioi.product_id, ioi.quantity,
                ioi.snapshot_product_code, ioi.snapshot_product_name, ioi.snapshot_unit
           FROM import_order_items ioi
           WHERE ioi.import_order_id = $1`,
        [id]
      );

      // For each item: update product stock + log transaction
      for (const item of items) {
        const { rows: pRows } = await client.query(
          `UPDATE products SET stock = stock + $1 WHERE id = $2
           RETURNING stock`,
          [item.quantity, item.product_id]
        );
        const stockAfter = pRows[0].stock;

        await client.query(
          `INSERT INTO stock_transactions
             (product_id, type, quantity, stock_after, ref_type, ref_id, created_by,
              snapshot_product_code, snapshot_product_name, snapshot_unit)
           VALUES ($1, 'import', $2, $3, 'import_order', $4, $5, $6, $7, $8)`,
          [
            item.product_id, item.quantity, stockAfter, id, confirmedBy,
            item.snapshot_product_code, item.snapshot_product_name, item.snapshot_unit,
          ]
        );
      }

      // Update order status
      const { rows: updatedRows } = await client.query(
        `UPDATE import_orders
            SET status = 'confirmed', confirmed_by = $1, confirmed_at = NOW()
          WHERE id = $2
          RETURNING id, code, supplier, status, import_date, note,
                    created_by, confirmed_by, confirmed_at, created_at, updated_at`,
        [confirmedBy, id]
      );

      await client.query('COMMIT');
      return { ...updatedRows[0], items };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // POST cancel
  async cancel(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: orderRows } = await client.query(
        `SELECT id, status FROM import_orders WHERE id = $1 FOR UPDATE`,
        [id]
      );
      const order = orderRows[0];
      if (!order) throw Object.assign(new Error('Phiếu nhập không tồn tại'), { status: 404 });
      if (order.status !== 'pending')
        throw Object.assign(new Error('Chỉ có thể hủy phiếu đang chờ xử lý'), { status: 400 });

      const { rows: updatedRows } = await client.query(
        `UPDATE import_orders SET status = 'cancelled' WHERE id = $1
         RETURNING id, code, supplier, status, import_date, note,
                   created_by, confirmed_by, confirmed_at, created_at, updated_at`,
        [id]
      );

      await client.query('COMMIT');

      const { rows: items } = await pool.query(
        `SELECT id, import_order_id, product_id, quantity, note,
                snapshot_product_code, snapshot_product_name,
                snapshot_unit, snapshot_category
           FROM import_order_items WHERE import_order_id = $1`,
        [id]
      );
      return { ...updatedRows[0], items };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
