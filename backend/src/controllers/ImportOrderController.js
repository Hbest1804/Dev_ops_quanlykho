import { ImportOrderService } from '../services/ImportOrderService.js';

export const ImportOrderController = {

  async list(req, res, next) {
    try {
      const { status, search } = req.query;
      const orders = await ImportOrderService.findAll({ status, search });
      res.json({ success: true, data: orders });
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const order = await ImportOrderService.findById(Number(req.params.id));
      res.json({ success: true, data: order });
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { supplier, import_date, note, items } = req.body;
      const order = await ImportOrderService.create(
        { supplier, import_date, note, items },
        req.user.id,
      );
      res.status(201).json({ success: true, data: order });
    } catch (err) { next(err); }
  },

  async confirm(req, res, next) {
    try {
      const order = await ImportOrderService.confirm(
        Number(req.params.id),
        req.user.id,
      );
      res.json({ success: true, data: order });
    } catch (err) { next(err); }
  },

  async cancel(req, res, next) {
    try {
      const order = await ImportOrderService.cancel(Number(req.params.id));
      res.json({ success: true, data: order });
    } catch (err) { next(err); }
  },
};
