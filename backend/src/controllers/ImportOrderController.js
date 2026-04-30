import { ImportOrderService } from '../services/ImportOrderService.js';

export const ImportOrderController = {

  async list(req, res, next) {
    try {
      const { status, search, from_date, to_date, page, limit } = req.query;
      const result = await ImportOrderService.findAll({
        status, search, from_date, to_date,
        page:  page  ? Number(page)  : 1,
        limit: limit ? Number(limit) : 10,
      });
      res.json({ success: true, data: result.data, pagination: result.pagination });
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
        req.user.sub,
      );
      res.status(201).json({ success: true, data: order });
    } catch (err) { next(err); }
  },

  async confirm(req, res, next) {
    try {
      const order = await ImportOrderService.confirm(
        Number(req.params.id),
        req.user.sub,
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
