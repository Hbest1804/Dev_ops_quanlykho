import { ImportOrderRepository } from '../repositories/ImportOrderRepository.js';
import { BadRequest, NotFound, Conflict } from '../utils/AppError.js';

export const ImportOrderService = {

  async findAll({ status, search, from_date, to_date, page, limit } = {}) {
    return ImportOrderRepository.findAll({ status, search, from_date, to_date, page, limit });
  },

  async findById(id) {
    const order = await ImportOrderRepository.findById(id);
    if (!order) throw NotFound('Phiếu nhập không tồn tại');
    return order;
  },

  async create({ supplier, import_date, note, items }, userId) {
    if (!supplier?.trim())
      throw BadRequest('Supplier is required');
    if (!import_date)
      throw BadRequest('Import date is required');
    if (isNaN(new Date(import_date).getTime()))
      throw BadRequest('Import date is invalid');
    if (!Array.isArray(items) || items.length === 0)
      throw BadRequest('Items must not be empty');

    for (const item of items) {
      if (!item.product_id)
        throw BadRequest('Product ID is required for each item');
      if (!item.quantity || Number(item.quantity) <= 0)
        throw BadRequest('Quantity must be a positive integer');
    }

    const productIds = items.map(i => i.product_id);
    if (new Set(productIds).size !== productIds.length)
      throw BadRequest('Duplicate product IDs are not allowed');

    return ImportOrderRepository.create({
      supplier: supplier.trim(),
      import_date,
      note,
      items,
      created_by: userId,
    });
  },

  async confirm(id, userId) {
    const order = await ImportOrderRepository.findById(id);
    if (!order) throw NotFound('Import order not found');
    if (order.status !== 'pending')
      throw Conflict('Order is not in pending status');
    if (order.items.length === 0)
      throw BadRequest('Cannot confirm import order with no items');

    return ImportOrderRepository.confirm(id, userId);
  },

  async cancel(id) {
    const order = await ImportOrderRepository.findById(id);
    if (!order) throw NotFound('Import order not found');
    if (order.status !== 'pending')
      throw Conflict('Order is not in pending status');

    return ImportOrderRepository.cancel(id);
  },
};
