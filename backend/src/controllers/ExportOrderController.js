import { ExportOrderService } from '../services/ExportOrderService.js';

export const ExportOrderController = {
  async getAll(req, res, next) {
    try {
      const { status, reason, from, to, search } = req.query;
      const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
      const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
      const result = await ExportOrderService.getAll({ status, reason, from, to, search, page, limit });
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid export order ID' });
      const order = await ExportOrderService.getById(id);
      res.status(200).json({ success: true, data: order });
    } catch (err) { next(err); }
  },

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
      const order = await ExportOrderService.cancelExportOrder(id, req.user.sub);
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
