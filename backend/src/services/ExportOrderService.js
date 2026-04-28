import { pool } from '../db/Pool.js';
import { ExportOrderRepository } from '../repositories/ExportOrderRepository.js';
import { ProductRepository } from '../repositories/ProductRepository.js';
import { StockTransactionRepository } from '../repositories/StockTransactionRepository.js';
import { BadRequest, NotFound, UnprocessableEntity } from '../utils/AppError.js';

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

  async confirmExportOrder(id, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const order = await ExportOrderRepository.findById(id, client);
      if (!order) throw NotFound('Không tìm thấy phiếu xuất');
      if (order.status !== 'pending')
        throw BadRequest('Chỉ có thể xác nhận phiếu xuất ở trạng thái chờ xác nhận');

      const items = await ExportOrderRepository.findItemsByOrderId(id, client);
      if (!items || items.length === 0)
        throw BadRequest('Phiếu xuất không có sản phẩm nào');

      for (const item of items) {
        const product = await ProductRepository.findByIdForUpdate(item.product_id, client);
        if (!product)
          throw BadRequest(`Sản phẩm (ID: ${item.product_id}) không tồn tại`);
        if (product.stock < item.quantity)
          throw BadRequest(`Sản phẩm "${product.name}" không đủ tồn kho (Hiện tại: ${product.stock}, Yêu cầu: ${item.quantity})`);

        const updatedProduct = await ProductRepository.updateStock(product.id, -item.quantity, client);

        await StockTransactionRepository.create({
          productId:           product.id,
          type:                'export',
          quantity:            -item.quantity,
          stockAfter:          updatedProduct.stock,
          refType:             'export_order',
          refId:               order.id,
          snapshotProductCode: item.snapshot_product_code,
          snapshotProductName: item.snapshot_product_name,
          snapshotUnit:        item.snapshot_unit,
          createdBy:           userId,
        }, client);
      }

      const confirmedOrder = await ExportOrderRepository.updateStatus(id, 'confirmed', userId, client);
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
