import { ProductService } from '../services/ProductService.js';

export const ProductController = {
  async list(req, res, next) {
    try {
      const result = await ProductService.findAll(req.query);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const product = await ProductService.findById(req.params.id);
      const { created_at, updated_at, ...rest } = product;
      res.json({ success: true, data: { ...rest, createdAt: created_at } });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { code, name, category, unit, description, initialStock } = req.body;
      const product = await ProductService.create({
        code, name, category, unit, description, initialStock,
      });
      const { created_at, updated_at, ...rest } = product;
      res.status(201).json({
        success: true,
        message: 'Product created',
        data: { ...rest, createdAt: created_at },
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { name, category, unit, description } = req.body;
      const product = await ProductService.update(req.params.id, {
        name, category, unit, description,
      });
      res.json({ success: true, message: 'Product updated', data: product });
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const deleted = await ProductService.delete(req.params.id);
      res.json({
        success: true,
        message: 'Product deleted',
        data: { id: deleted.id, code: deleted.code },
      });
    } catch (err) {
      next(err);
    }
  },
};
