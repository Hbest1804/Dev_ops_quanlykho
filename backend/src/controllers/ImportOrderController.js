import { ImportOrderService } from '../services/ImportOrderService.js';

export const ImportOrderController = {
  async create(req, res, next) {
    try {
      const { supplier, importDate, note, items } = req.body;
      const order = await ImportOrderService.create({
        supplier, importDate, note, items, userId: req.user.sub,
      });
      res.status(201).json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  },
};
