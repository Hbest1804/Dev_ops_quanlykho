import { ImportOrderRepository } from '../repositories/ImportOrderRepository.js';
import { BadRequest, NotFound } from '../utils/AppError.js';

export const ImportOrderService = {

  async findAll({ status, search } = {}) {
    return ImportOrderRepository.findAll({ status, search });
  },

  async findById(id) {
    const order = await ImportOrderRepository.findById(id);
    if (!order) throw NotFound('Phiếu nhập không tồn tại');
    return order;
  },

  async create({ supplier, import_date, note, items }, userId) {
    if (!supplier?.trim())
      throw BadRequest('Vui lòng nhập tên nhà cung cấp');
    if (!import_date)
      throw BadRequest('Vui lòng chọn ngày nhập hàng');
    if (isNaN(new Date(import_date).getTime()))
      throw BadRequest('Ngày nhập hàng không hợp lệ');
    if (!Array.isArray(items) || items.length === 0)
      throw BadRequest('Phiếu nhập phải có ít nhất một sản phẩm');

    for (const item of items) {
      if (!item.product_id)
        throw BadRequest('Mỗi dòng hàng phải chọn sản phẩm');
      if (!item.quantity || Number(item.quantity) <= 0)
        throw BadRequest('Số lượng mỗi sản phẩm phải lớn hơn 0');
    }

    const productIds = items.map(i => i.product_id);
    if (new Set(productIds).size !== productIds.length)
      throw BadRequest('Danh sách chứa sản phẩm trùng lặp');

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
    if (!order) throw NotFound('Phiếu nhập không tồn tại');
    if (order.status !== 'pending')
      throw BadRequest('Chỉ có thể xác nhận phiếu đang chờ xử lý');
    if (order.items.length === 0)
      throw BadRequest('Không thể xác nhận phiếu nhập không có sản phẩm nào');

    return ImportOrderRepository.confirm(id, userId);
  },

  async cancel(id) {
    const order = await ImportOrderRepository.findById(id);
    if (!order) throw NotFound('Phiếu nhập không tồn tại');
    if (order.status !== 'pending')
      throw BadRequest('Chỉ có thể huỷ phiếu đang chờ xử lý');

    return ImportOrderRepository.cancel(id);
  },
};
