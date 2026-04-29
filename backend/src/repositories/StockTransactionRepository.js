import { pool } from '../db/Pool.js';

export const StockTransactionRepository = {
  async create({ productId, type, quantity, stockAfter, refType, refId, snapshotProductCode, snapshotProductName, snapshotUnit, createdBy }, client = pool) {
    const { rows } = await client.query(
      `INSERT INTO stock_transactions 
        (product_id, type, quantity, stock_after, ref_type, ref_id, snapshot_product_code, snapshot_product_name, snapshot_unit, created_by)
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        productId, type, quantity, stockAfter, refType, refId,
        snapshotProductCode, snapshotProductName, snapshotUnit, createdBy
      ]
    );
    return rows[0];
  },

  async createMany(transactions, client = pool) {
    if (!transactions.length) return [];
    
    const values = [];
    const placeholders = transactions.map((t, i) => {
      const offset = i * 10;
      values.push(
        t.productId, t.type, t.quantity, t.stockAfter, t.refType, t.refId,
        t.snapshotProductCode, t.snapshotProductName, t.snapshotUnit, t.createdBy
      );
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`;
    }).join(', ');

    const query = `
      INSERT INTO stock_transactions 
        (product_id, type, quantity, stock_after, ref_type, ref_id, snapshot_product_code, snapshot_product_name, snapshot_unit, created_by)
      VALUES ${placeholders}
      RETURNING *
    `;

    const { rows } = await client.query(query, values);
    return rows;
  }
};
