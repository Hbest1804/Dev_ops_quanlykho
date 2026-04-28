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
  }
};
