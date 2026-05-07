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

  async cancel(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid export order ID' });
      const order = await ExportOrderService.cancelExportOrder(id);
      res.status(200).json({ success: true, message: 'Export order cancelled', data: order });
    } catch (err) { next(err); }
  },

  async confirm(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid export order ID' });
      const order = await ExportOrderService.confirmExportOrder(id, req.user.sub);
      res.status(200).json({ success: true, message: 'Export order confirmed', data: order });
    } catch (err) { next(err); }
  },
};
