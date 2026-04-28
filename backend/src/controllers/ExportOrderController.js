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

  async confirm(req, res, next) {
    try {
      const { id } = req.params;
      const order = await ExportOrderService.confirmExportOrder(id, req.user.sub);
      res.status(200).json({ success: true, message: 'Xác nhận phiếu xuất thành công', data: order });
    } catch (err) { next(err); }
  },
};
