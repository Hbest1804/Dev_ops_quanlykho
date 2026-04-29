import { ProductService } from '../services/ProductService.js';

export const ProductController = {
  /**
   * GET /api/products
   * Lấy danh sách sản phẩm (có lọc / phân trang).
   * Query: ?search=&category=&page=1&limit=20
   */
  async list(req, res, next) {
    try {
      const result = await ProductService.findAll(req.query);
      res.json({
        success: true,
        message: 'OK',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/products/:id
   * Lấy chi tiết một sản phẩm.
   */
  async getById(req, res, next) {
    try {
      const product = await ProductService.findById(req.params.id);
      res.json({ success: true, message: 'OK', data: product });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/products
   * Tạo sản phẩm mới.
   * Body: { code, name, category, unit, description, initialStock }
   */
  async create(req, res, next) {
    try {
      const { code, name, category, unit, description, initialStock } = req.body;

      if (!code || !name || !category || !unit) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu trường bắt buộc: code, name, category, unit',
          data: null,
        });
      }

      const product = await ProductService.create({
        code,
        name,
        category,
        unit,
        description,
        initialStock,
      });

      res.status(201).json({
        success: true,
        message: 'Product created',
        data: {
          id: product.id,
          code: product.code,
          name: product.name,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};
