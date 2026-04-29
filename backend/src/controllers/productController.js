import { ProductService } from '../services/ProductService.js';

/** Hàm tiện ích: bắt lỗi AppError và 500. */
function handleError(err, res) {
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      ...(err.status === 400 || err.status === 409 ? { data: null } : {}),
    });
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}

export const ProductController = {
  /**
   * GET /api/products
   * Lấy danh sách sản phẩm (có lọc / phân trang).
   * Query: ?search=&category=&status=&page=1&limit=20
   */
  async list(req, res) {
    try {
      const result = await ProductService.findAll(req.query);
      res.json({ success: true, data: result });
    } catch (err) {
      handleError(err, res);
    }
  },

  /**
   * GET /api/products/:id
   * Lấy chi tiết một sản phẩm.
   */
  async getById(req, res) {
    try {
      const product = await ProductService.findById(req.params.id);
      res.json({ success: true, data: product });
    } catch (err) {
      handleError(err, res);
    }
  },

  /**
   * POST /api/products
   * Tạo sản phẩm mới.
   * Body: { code, name, category, unit, description, initialStock }
   */
  async create(req, res) {
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
        code, name, category, unit, description, initialStock,
      });

      res.status(201).json({
        success: true,
        message: 'Product created',
        data: { id: product.id, code: product.code, name: product.name },
      });
    } catch (err) {
      handleError(err, res);
    }
  },

  /**
   * PUT /api/products/:id
   * Cập nhật thông tin sản phẩm (name, category, unit, description).
   * Body: { name, category, unit, description }
   */
  async update(req, res) {
    try {
      const { name, category, unit, description } = req.body;

      if (!name || !category || !unit) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu trường bắt buộc: name, category, unit',
          data: null,
        });
      }

      const product = await ProductService.update(req.params.id, {
        name, category, unit, description,
      });

      res.json({
        success: true,
        message: 'Product updated',
        data: product,
      });
    } catch (err) {
      handleError(err, res);
    }
  },

  /**
   * DELETE /api/products/:id
   * Xoá sản phẩm.
   */
  async delete(req, res) {
    try {
      const deleted = await ProductService.delete(req.params.id);
      res.json({
        success: true,
        message: 'Product deleted',
        data: { id: deleted.id, code: deleted.code },
      });
    } catch (err) {
      handleError(err, res);
    }
  },
};
