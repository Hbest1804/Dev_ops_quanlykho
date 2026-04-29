import { ProductRepository } from '../repositories/ProductRepository.js';
import { BadRequest, Conflict, NotFound } from '../utils/AppError.js';

export const ProductService = {
  /**
   * Lấy danh sách sản phẩm (có lọc / phân trang).
   * @param {object} query - { search, category, page, limit }
   */
  async findAll(query = {}) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, parseInt(query.limit) || 20);
    const { search, category } = query;

    const [products, total] = await Promise.all([
      ProductRepository.findAll({ search, category, page, limit }),
      ProductRepository.count({ search, category }),
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
    if (!product) throw NotFound('Not found');

    return product;
  },

  /**
   * Tạo sản phẩm mới.
   * @param {object} body - { code, name, category, unit, description, initialStock }
   */
  async create({ code, name, category, unit, description, initialStock }) {
    // --- Validate required fields ---
    if (!code || !name || !category || !unit) {
      throw BadRequest('code, name, category và unit là bắt buộc');
    }

    // --- Validate initialStock ---
    const stock = initialStock !== undefined ? parseInt(initialStock) : 0;
    if (isNaN(stock) || stock < 0) {
      throw BadRequest('initialStock phải là số nguyên không âm');
    }

    // --- Kiểm tra mã sản phẩm trùng ---
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
};
