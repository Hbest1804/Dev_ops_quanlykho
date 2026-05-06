import { ProductRepository } from '../repositories/ProductRepository.js';
import { BadRequest, Conflict, NotFound, UnprocessableEntity } from '../utils/AppError.js';

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
    if (isNaN(parsedId)) throw BadRequest('Invalid product ID');

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
      throw BadRequest('code, name, category, unit and description are required');
    }

    const stock = initialStock !== undefined ? parseInt(initialStock) : 0;
    if (isNaN(stock) || stock < 0) {
      throw BadRequest('initialStock must be a non-negative integer');
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
    if (isNaN(parsedId)) throw BadRequest('Invalid product ID');

    if (!name || !category || !unit || !description) {
      throw BadRequest('name, category, unit and description are required');
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

  async delete(id, userId) {
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) throw BadRequest('Invalid product ID');

    const product = await ProductRepository.findById(parsedId);
    if (!product || product.is_deleted) throw NotFound('Product not found');

    const transactionCount = await ProductRepository.countTransactions(parsedId);

    if (transactionCount > 0) {
      await ProductRepository.softDelete(parsedId, userId);
      return { deleted: true, type: 'soft' };
    }

    if (product.stock > 0) {
      throw UnprocessableEntity('Product has stock > 0');
    }

    await ProductRepository.hardDelete(parsedId);
    return { deleted: true, type: 'hard' };
  },
};
