import { ImportOrderRepository } from '../repositories/ImportOrderRepository.js';
import { ProductRepository } from '../repositories/ProductRepository.js';
import { BadRequest, NotFound } from '../utils/AppError.js';

export const ImportOrderService = {
  async create({ supplier, importDate, note, items, userId }) {
    if (!supplier) throw BadRequest('Supplier is required');
    if (!importDate) throw BadRequest('Import date is required');
    if (isNaN(new Date(importDate).getTime())) throw BadRequest('Import date is invalid');
    if (!items || items.length === 0) throw BadRequest('Items must not be empty');

    for (const item of items) {
      if (item.productId == null) throw BadRequest('Product ID is required for each item');
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty <= 0) throw BadRequest('Quantity must be a positive integer');
    }

    const productIds = items.map(i => i.productId);
    if (new Set(productIds).size !== productIds.length) throw BadRequest('Duplicate product IDs are not allowed');
    const found = await ProductRepository.findByIds(productIds);
    const activeIds = new Set(found.filter(p => !p.is_deleted).map(p => p.id));
    const missingId = productIds.find(id => !activeIds.has(id));
    if (missingId !== undefined) throw NotFound(`Product ${missingId} not found`);

    return ImportOrderRepository.createWithItems(
      { supplier, importDate, note, userId },
      items.map(i => ({ productId: i.productId, quantity: Number(i.quantity), note: i.note ?? null }))
    );
  },
};
