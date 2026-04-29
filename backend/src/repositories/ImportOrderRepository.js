import { pool } from '../db/Pool.js';

// ─── Helper ──────────────────────────────────────────────────────────────────

function attachItems(orders, items) {
  return orders.map(o => ({
    ...o,
    items: items.filter(i => i.import_order_id === o.id),
  }));
}

// ─── Repository ──────────────────────────────────────────────────────────────

export const ImportOrderRepository = {

  /** Lấy danh sách phiếu nhập (kèm items), lọc theo status / search */
  async findAll({ status, search } = {}) {
    const conds  = [];
    const values = [];
    let   i      = 1;

    if (status) {
      conds.push(`io.status = $${i++}`);
      values.push(status);
    }
    if (search) {
      conds.push(`(io.code ILIKE $${i} OR io.supplier ILIKE $${i})`);
      values.push(`%${search}%`);
      i++;
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const { rows: orders } = await pool.query(
      `SELECT io.id, io.code, io.supplier, io.status,
              io.import_date, io.note,
              io.created_by, io.confirmed_by, io.confirmed_at,
              io.created_at, io.updated_at
         FROM import_orders io
         ${where}
         ORDER BY io.created_at DESC`,
      values,
    );

    if (orders.length === 0) return [];

    const { rows: items } = await pool.query(
      `SELECT id, import_order_id, product_id, quantity, note,
              snapshot_product_code, snapshot_product_name,
              snapshot_unit, snapshot_category
         FROM import_order_items
        WHERE import_order_id = ANY($1)`,
      [orders.map(o => o.id)],
    );

    return attachItems(orders, items);
  },

  /** Lấy một phiếu nhập theo id (kèm items) */
  async findById(id) {
    const { rows: orders } = await pool.query(
      `SELECT io.id, io.code, io.supplier, io.status,
              io.import_date, io.note,
              io.created_by, io.confirmed_by, io.confirmed_at,
              io.created_at, io.updated_at
         FROM import_orders io
        WHERE io.id = $1`,
      [id],
    );
    if (!orders[0]) return null;

    const { rows: items } = await pool.query(
      `SELECT id, import_order_id, product_id, quantity, note,
              snapshot_product_code, snapshot_product_name,
              snapshot_unit, snapshot_category
         FROM import_order_items
        WHERE import_order_id = $1`,
      [id],
    );

    return { ...orders[0], items };
  },

  /** Tạo phiếu nhập mới + các items trong 1 transaction */
  async create({ supplier, import_date, note, items, created_by }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Sinh mã phiếu dùng SEQUENCE để đảm bảo unique kể cả khi tạo đồng thời
      const { rows: [{ nextval }] } = await client.query(
        `SELECT nextval('import_order_code_seq')`,
      );
      const code = `PN${String(Number(nextval)).padStart(3, '0')}`;

      const { rows: [order] } = await client.query(
        `INSERT INTO import_orders
           (code, supplier, status, import_date, note, created_by)
         VALUES ($1, $2, 'pending', $3, $4, $5)
         RETURNING id, code, supplier, status, import_date, note,
                   created_by, confirmed_by, confirmed_at, created_at, updated_at`,
        [code, supplier, import_date, note || null, created_by],
      );

      const insertedItems = [];
      for (const item of items) {
        // Lấy snapshot sản phẩm từ DB
        const { rows: [p] } = await client.query(
          'SELECT code, name, unit, category FROM products WHERE id = $1',
          [item.product_id],
        );
        if (!p) throw Object.assign(new Error(`Sản phẩm #${item.product_id} không tồn tại`), { status: 400 });

        const { rows: [newItem] } = await client.query(
          `INSERT INTO import_order_items
             (import_order_id, product_id, quantity, note,
              snapshot_product_code, snapshot_product_name,
              snapshot_unit, snapshot_category)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           RETURNING id, import_order_id, product_id, quantity, note,
                     snapshot_product_code, snapshot_product_name,
                     snapshot_unit, snapshot_category`,
          [order.id, item.product_id, item.quantity, item.note || null,
           p.code, p.name, p.unit, p.category],
        );
        insertedItems.push(newItem);
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

  /**
   * Xác nhận phiếu nhập – atomic transaction:
   *   1. UPDATE import_orders  → status = 'confirmed'
   *   2. UPDATE products.stock += qty   (mỗi item)
   *   3. INSERT stock_transactions      (mỗi item)
   */
  async confirm(id, confirmedBy) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Khoá dòng để tránh race condition
      const { rows: [order] } = await client.query(
        `SELECT id, status FROM import_orders WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (!order)
        throw Object.assign(new Error('Phiếu nhập không tồn tại'), { status: 404 });
      if (order.status !== 'pending')
        throw Object.assign(new Error('Chỉ có thể xác nhận phiếu đang chờ xử lý'), { status: 400 });

      // Lấy items
      const { rows: items } = await client.query(
        `SELECT ioi.id, ioi.product_id, ioi.quantity,
                ioi.snapshot_product_code, ioi.snapshot_product_name, ioi.snapshot_unit
           FROM import_order_items ioi
          WHERE ioi.import_order_id = $1`,
        [id],
      );

      // Cập nhật tồn kho + ghi log cho mỗi item
      for (const item of items) {
        const { rows } = await client.query(
          `UPDATE products SET stock = stock + $1 WHERE id = $2 RETURNING stock`,
          [item.quantity, item.product_id],
        );
        if (rows.length === 0) {
          throw Object.assign(new Error(`Sản phẩm #${item.product_id} không tồn tại hoặc đã bị xóa`), { status: 400 });
        }
        const [{ stock }] = rows;

        await client.query(
          `INSERT INTO stock_transactions
             (product_id, type, quantity, stock_after,
              ref_type, ref_id, created_by,
              snapshot_product_code, snapshot_product_name, snapshot_unit)
           VALUES ($1,'import',$2,$3,'import_order',$4,$5,$6,$7,$8)`,
          [item.product_id, item.quantity, stock, id, confirmedBy,
           item.snapshot_product_code, item.snapshot_product_name, item.snapshot_unit],
        );
      }

      // Đánh dấu phiếu đã xác nhận
      const { rows: [updated] } = await client.query(
        `UPDATE import_orders
            SET status = 'confirmed', confirmed_by = $1, confirmed_at = NOW()
          WHERE id = $2
          RETURNING id, code, supplier, status, import_date, note,
                    created_by, confirmed_by, confirmed_at, created_at, updated_at`,
        [confirmedBy, id],
      );

      await client.query('COMMIT');
      return { ...updated, items };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /** Huỷ phiếu nhập (chỉ khi đang pending) */
  async cancel(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [order] } = await client.query(
        `SELECT id, status FROM import_orders WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (!order)
        throw Object.assign(new Error('Phiếu nhập không tồn tại'), { status: 404 });
      if (order.status !== 'pending')
        throw Object.assign(new Error('Chỉ có thể huỷ phiếu đang chờ xử lý'), { status: 400 });

      const { rows: [updated] } = await client.query(
        `UPDATE import_orders SET status = 'cancelled'
          WHERE id = $1
          RETURNING id, code, supplier, status, import_date, note,
                    created_by, confirmed_by, confirmed_at, created_at, updated_at`,
        [id],
      );

      await client.query('COMMIT');

      // Lấy lại items để trả về đầy đủ
      const { rows: items } = await pool.query(
        `SELECT id, import_order_id, product_id, quantity, note,
                snapshot_product_code, snapshot_product_name,
                snapshot_unit, snapshot_category
           FROM import_order_items WHERE import_order_id = $1`,
        [id],
      );
      return { ...updated, items };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
