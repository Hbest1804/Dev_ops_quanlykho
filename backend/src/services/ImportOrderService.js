import { ImportOrderRepository } from '../repositories/ImportOrderRepository.js';
import { ProductRepository } from '../repositories/ProductRepository.js';
import { BadRequest, NotFound } from '../utils/AppError.js';

export const ImportOrderService = {
  async create({ supplier, importDate, note, items, userId }) {
    if (!supplier) throw BadRequest('Supplier is required');
    if (!importDate) throw BadRequest('Import date is required');
    if (!items || items.length === 0) throw BadRequest('Items must not be empty');

    for (const item of items) {
      const qty = parseInt(item.quantity);
      if (isNaN(qty) || qty <= 0) throw BadRequest('Quantity must be > 0');
    }

    const productIds = items.map(i => i.productId);
    const found = await ProductRepository.findByIds(productIds);
    const activeIds = new Set(found.filter(p => !p.is_deleted).map(p => p.id));
    const missingId = productIds.find(id => !activeIds.has(id));
    if (missingId !== undefined) throw NotFound(`Product ${missingId} not found`);

    const order = await ImportOrderRepository.create({ supplier, importDate, note, userId });

    await ImportOrderRepository.createItems(
      order.id,
      items.map(i => ({ productId: i.productId, quantity: parseInt(i.quantity), note: i.note ?? null }))
    );

    return order;
  },
};
