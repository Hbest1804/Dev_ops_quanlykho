import { ProductRepository } from '../repositories/ProductRepository.js';
import { BadRequest, Conflict, NotFound } from '../utils/AppError.js';

export const ProductService = {
  /**
   * Lấy danh sách sản phẩm (có lọc / phân trang).
   * @param {object} query - { search, category, status, page, limit }
   */
  async findAll(query = {}) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, parseInt(query.limit) || 20);
    const { search, category, status } = query;

    const [products, total] = await Promise.all([
      ProductRepository.findAll({ search, category, status, page, limit }),
      ProductRepository.count({ search, category, status }),
    ]);

    return {
      items: products,
      total: parseInt(total, 10),
      page,
      limit,
    };
  },

  /**
   * Lấy chi tiết một sản phẩm theo ID.
   */
  async findById(id) {
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) throw BadRequest('ID sản phẩm không hợp lệ');

    const product = await ProductRepository.findById(parsedId);
    if (!product || product.is_deleted) throw NotFound('Product not found');

    return product;
  },

  /**
   * Tạo sản phẩm mới.
   * @param {object} body - { code, name, category, unit, description, initialStock }
   */
  async create({ code, name, category, unit, description, initialStock }) {
    if (!code || !name || !category || !unit || !description) {
      throw BadRequest('code, name, category, unit và description là bắt buộc');
    }

    const stock = initialStock !== undefined ? parseInt(initialStock) : 0;
    if (isNaN(stock) || stock < 0) {
      throw BadRequest('initialStock phải là số nguyên không âm');
    }

    const existing = await ProductRepository.findByCode(code.trim());
    if (existing) throw Conflict('Product code already exists');

    return ProductRepository.create({
      code: code.trim(),
      name: name.trim(),
      category: category.trim(),
      unit: unit.trim(),
      description: description?.trim() ?? '',
      initialStock: stock,
    });
  },

  /**
   * Cập nhật sản phẩm theo ID.
   * Không cho phép thay đổi code và stock qua endpoint này.
   * @param {string|number} id
   * @param {object} body - { name, category, unit, description }
   */
  async update(id, { name, category, unit, description }) {
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) throw BadRequest('ID sản phẩm không hợp lệ');

    if (!name || !category || !unit || !description) {
      throw BadRequest('name, category, unit và description là bắt buộc');
    }

    const existing = await ProductRepository.findById(parsedId);
    if (!existing) throw NotFound('Product not found');

    return ProductRepository.update(parsedId, {
      name: name.trim(),
      category: category.trim(),
      unit: unit.trim(),
      description: description.trim(),
    });
  },

  /**
   * Xoá sản phẩm theo ID.
   */
  async delete(id) {
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) throw BadRequest('ID sản phẩm không hợp lệ');

    const deleted = await ProductRepository.delete(parsedId);
    if (!deleted) throw NotFound('Sản phẩm không tồn tại');

    return deleted;
  },
};
