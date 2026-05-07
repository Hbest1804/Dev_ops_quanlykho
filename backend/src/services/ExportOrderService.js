import { pool } from '../db/Pool.js';
import { ExportOrderRepository } from '../repositories/ExportOrderRepository.js';
import { ProductRepository } from '../repositories/ProductRepository.js';
import { StockTransactionRepository } from '../repositories/StockTransactionRepository.js';
import { BadRequest, Conflict, NotFound, UnprocessableEntity } from '../utils/AppError.js';

const VALID_REASONS = new Set(['sale', 'internal', 'damaged']);

export const ExportOrderService = {
  async create({ reason, exportDate, note, items, userId }) {
    if (!VALID_REASONS.has(reason)) throw BadRequest('Reason must be sale|internal|damaged');
    if (!exportDate) throw BadRequest('Export date is required');
    if (isNaN(new Date(exportDate).getTime())) throw BadRequest('Export date is invalid');
    if (!items || items.length === 0) throw BadRequest('Items must not be empty');

    const productIds = [];
    const repoItems = [];
    for (const item of items) {
      if (item.productId == null) throw BadRequest('Product ID is required for each item');
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty <= 0) throw BadRequest('Quantity must be a positive integer');
      productIds.push(item.productId);
      repoItems.push({ productId: item.productId, quantity: qty, note: item.note ?? null });
    }

    if (new Set(productIds).size !== productIds.length) throw BadRequest('Duplicate product IDs are not allowed');

    const found = await ProductRepository.findByIdsWithStock(productIds);
    const productMap = new Map(found.filter(p => !p.is_deleted).map(p => [p.id, p]));

    for (const item of repoItems) {
      const product = productMap.get(item.productId);
      if (!product) throw NotFound(`Product ${item.productId} not found`);
      if (product.stock < item.quantity) {
        throw UnprocessableEntity(
          `Insufficient stock for product ${product.code} (available: ${product.stock}, requested: ${item.quantity})`
        );
      }
    }

    return ExportOrderRepository.createWithItems({ reason, exportDate, note, userId }, repoItems);
  },

  async cancelExportOrder(id) {
    const order = await ExportOrderRepository.findById(id);
    if (!order) throw NotFound('Export order not found');
    if (order.status !== 'pending') throw Conflict('Order is not in pending status');

    const cancelled = await ExportOrderRepository.cancel(id);
    if (!cancelled) throw Conflict('Order is not in pending status');
    return cancelled;
  },

  async confirmExportOrder(id, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const order = await ExportOrderRepository.findByIdForUpdate(id, client);
      if (!order) throw NotFound('Export order not found');
      if (order.status !== 'pending')
        throw Conflict('Order is not in pending status');

      const items = await ExportOrderRepository.findItemsByOrderId(id, client);
      if (!items || items.length === 0)
        throw BadRequest('Export order has no items');

      const productIds = [...new Set(items.map(i => i.product_id))].sort((a, b) => a - b);
      const products = await ProductRepository.findManyByIdsForUpdate(productIds, client);
      const productMap = new Map(products.map(p => [p.id, p]));

      const runningStock = new Map(products.map(p => [p.id, p.stock]));
      const stockUpdateMap = new Map();
      const transactions = [];

      for (const item of items) {
        const product = productMap.get(item.product_id);
        if (!product)
          throw NotFound('Product not found or deleted');

        const currentStock = runningStock.get(product.id);
        if (currentStock < item.quantity)
          throw UnprocessableEntity('Insufficient stock at confirmation time');

        const stockAfter = currentStock - item.quantity;
        runningStock.set(product.id, stockAfter);
        stockUpdateMap.set(product.id, (stockUpdateMap.get(product.id) ?? 0) - item.quantity);

        transactions.push({
          productId:           product.id,
          type:                'export',
          quantity:            -item.quantity,
          stockAfter,
          refType:             'export_order',
          refId:               order.id,
          snapshotProductCode: item.snapshot_product_code,
          snapshotProductName: item.snapshot_product_name,
          snapshotUnit:        item.snapshot_unit,
          createdBy:           userId,
        });
      }

      const stockUpdates = Array.from(stockUpdateMap.entries()).map(([id, change]) => ({ id, change }));
      await ProductRepository.updateMultipleStocks(stockUpdates, client);
      await StockTransactionRepository.createMany(transactions, client);

      const confirmedOrder = await ExportOrderRepository.updateStatus(id, 'confirmed', userId, client);
      if (!confirmedOrder) throw Conflict('Order is not in pending status');
      await client.query('COMMIT');
      return confirmedOrder;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};
