import { ExportOrderRepository } from '../repositories/ExportOrderRepository.js';
import { ProductRepository } from '../repositories/ProductRepository.js';
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
};
