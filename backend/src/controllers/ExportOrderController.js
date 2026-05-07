import { ExportOrderService } from '../services/ExportOrderService.js';

export const ExportOrderController = {
  async create(req, res, next) {
    try {
      const { reason, exportDate, note, items } = req.body;
      const order = await ExportOrderService.create({
        reason, exportDate, note, items, userId: req.user.sub,
      });
      res.status(201).json({ success: true, data: order });
    } catch (err) { next(err); }
  },
};
