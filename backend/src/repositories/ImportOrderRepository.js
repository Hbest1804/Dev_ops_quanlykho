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

  async findAll({ status, search, from_date, to_date, page = 1, limit = 10 } = {}) {
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
    if (from_date) {
      conds.push(`io.import_date >= $${i++}`);
      values.push(from_date);
    }
    if (to_date) {
      conds.push(`io.import_date <= $${i++}`);
      values.push(to_date);
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    // Đếm tổng số bản ghi (cho phân trang)
    const { rows: [{ count }] } = await pool.query(
      `SELECT COUNT(*) FROM import_orders io ${where}`,
      values,
    );
    const total      = parseInt(count, 10);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset     = (page - 1) * limit;

    // Đếm số lượng theo từng trạng thái (toàn bộ, không phụ thuộc filter)
    const { rows: statusRows } = await pool.query(
      `SELECT status, COUNT(*)::int AS count FROM import_orders GROUP BY status`,
    );
    const statusCounts = { pending: 0, confirmed: 0, cancelled: 0 };
    for (const r of statusRows) statusCounts[r.status] = r.count;

    const { rows: orders } = await pool.query(
      `SELECT io.id, io.code, io.supplier, io.status,
              io.import_date, io.note,
              io.created_by, u.name AS creator_name,
              io.confirmed_by, io.confirmed_at,
              io.created_at, io.updated_at
         FROM import_orders io
         LEFT JOIN users u ON u.id = io.created_by
         ${where}
         ORDER BY io.created_at DESC
         LIMIT $${i++} OFFSET $${i++}`,
      [...values, limit, offset],
    );

    if (orders.length === 0) return { data: [], pagination: { page, limit, total, totalPages }, statusCounts };

    const { rows: items } = await pool.query(
      `SELECT id, import_order_id, product_id, quantity, note,
              snapshot_product_code, snapshot_product_name,
              snapshot_unit, snapshot_category
         FROM import_order_items
        WHERE import_order_id = ANY($1)`,
      [orders.map(o => o.id)],
    );

    return { data: attachItems(orders, items), pagination: { page, limit, total, totalPages }, statusCounts };
  },

  async findById(id) {
    const { rows: orders } = await pool.query(
      `SELECT io.id, io.code, io.supplier, io.status,
              io.import_date, io.note,
              io.created_by, u.name AS creator_name,
              io.confirmed_by, io.confirmed_at,
              io.created_at, io.updated_at
         FROM import_orders io
         LEFT JOIN users u ON u.id = io.created_by
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

  async create({ supplier, import_date, note, items, created_by }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

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

      let insertedItems = [];
      if (items && items.length > 0) {
        const productIds = items.map(item => item.product_id);
        const { rows: products } = await client.query(
          'SELECT id, code, name, unit, category FROM products WHERE id = ANY($1) AND is_deleted = FALSE',
          [productIds]
        );
        
        const productMap = new Map(products.map(p => [p.id, p]));
        
        const insertValues = [];
        const flatParams = [];
        let paramIdx = 1;
        
        for (const item of items) {
          const p = productMap.get(item.product_id);
          if (!p) throw Object.assign(new Error(`Product #${item.product_id} not found`), { status: 400 });

          insertValues.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
          flatParams.push(
            order.id, item.product_id, item.quantity, item.note || null,
            p.code, p.name, p.unit, p.category
          );
        }

        const res = await client.query(
          `INSERT INTO import_order_items
             (import_order_id, product_id, quantity, note,
              snapshot_product_code, snapshot_product_name,
              snapshot_unit, snapshot_category)
           VALUES ${insertValues.join(', ')}
           RETURNING id, import_order_id, product_id, quantity, note,
                     snapshot_product_code, snapshot_product_name,
                     snapshot_unit, snapshot_category`,
          flatParams
        );
        insertedItems = res.rows;
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

  async confirm(id, confirmedBy) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [order] } = await client.query(
        `SELECT id, status FROM import_orders WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (!order)
        throw Object.assign(new Error('Import order not found'), { status: 404 });
      if (order.status !== 'pending')
        throw Object.assign(new Error('Order is not in pending status'), { status: 409 });

      const { rows: items } = await client.query(
        `SELECT ioi.id, ioi.product_id, ioi.quantity,
                ioi.snapshot_product_code, ioi.snapshot_product_name, ioi.snapshot_unit
           FROM import_order_items ioi
          WHERE ioi.import_order_id = $1
          ORDER BY ioi.product_id ASC`,
        [id],
      );

      // Cập nhật tồn kho + ghi log hàng loạt
      if (items && items.length > 0) {
        const updateValues = [];
        const updateParams = [];
        let updateParamIdx = 1;

        const aggregatedQuantities = new Map();
        for (const item of items) {
          aggregatedQuantities.set(
            item.product_id,
            (aggregatedQuantities.get(item.product_id) || 0) + item.quantity
          );
        }

        for (const [productId, qty] of aggregatedQuantities.entries()) {
          updateValues.push(`($${updateParamIdx++}::int, $${updateParamIdx++}::int)`);
          updateParams.push(productId, qty);
        }

        const { rows: updatedProducts } = await client.query(
          `UPDATE products p
           SET stock = p.stock + v.quantity
           FROM (VALUES ${updateValues.join(', ')}) AS v(id, quantity)
           WHERE p.id = v.id
           RETURNING p.id, p.stock`,
          updateParams
        );

        const updatedProductMap = new Map(updatedProducts.map(p => [p.id, p]));

        const insertLogsValues = [];
        const insertLogsParams = [];
        let logParamIdx = 1;
        
        const currentStockMap = new Map();
        for (const [productId, qty] of aggregatedQuantities.entries()) {
          const p = updatedProductMap.get(productId);
          if (!p) {
            throw Object.assign(new Error(`Product #${productId} not found or deleted`), { status: 400 });
          }
          currentStockMap.set(productId, p.stock - qty);
        }

        for (const item of items) {
          const currentStock = currentStockMap.get(item.product_id);
          const stockAfter = currentStock + item.quantity;
          currentStockMap.set(item.product_id, stockAfter);

          insertLogsValues.push(`($${logParamIdx++}, 'import', $${logParamIdx++}, $${logParamIdx++}, 'import_order', $${logParamIdx++}, $${logParamIdx++}, $${logParamIdx++}, $${logParamIdx++}, $${logParamIdx++})`);
          insertLogsParams.push(
            item.product_id, item.quantity, stockAfter, id, confirmedBy,
            item.snapshot_product_code, item.snapshot_product_name, item.snapshot_unit
          );
        }

        await client.query(
          `INSERT INTO stock_transactions
             (product_id, type, quantity, stock_after,
              ref_type, ref_id, created_by,
              snapshot_product_code, snapshot_product_name, snapshot_unit)
           VALUES ${insertLogsValues.join(', ')}`,
          insertLogsParams
        );
      }

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

  async cancel(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [order] } = await client.query(
        `SELECT id, status FROM import_orders WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (!order)
        throw Object.assign(new Error('Import order not found'), { status: 404 });
      if (order.status !== 'pending')
        throw Object.assign(new Error('Order is not in pending status'), { status: 409 });

      const { rows: [updated] } = await client.query(
        `UPDATE import_orders SET status = 'cancelled'
          WHERE id = $1
          RETURNING id, code, supplier, status, import_date, note,
                    created_by, confirmed_by, confirmed_at, created_at, updated_at`,
        [id],
      );

      const { rows: items } = await client.query(
        `SELECT id, import_order_id, product_id, quantity, note,
                snapshot_product_code, snapshot_product_name,
                snapshot_unit, snapshot_category
           FROM import_order_items WHERE import_order_id = $1`,
        [id],
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
};
