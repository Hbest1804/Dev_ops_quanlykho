import { ReportService } from '../services/ReportService.js';

export const ReportController = {
  async getSummary(req, res, next) {
    try {
      const { from, to, category } = req.query;
      const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
      const limit = Math.max(1, parseInt(req.query.limit, 10) || 50);
      const result = await ReportService.getSummary({ from, to, category, page, limit });
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async getTopProducts(req, res, next) {
    try {
      const { fromDate, toDate, type } = req.query;

      const data = await ReportService.getTopProducts({ fromDate, toDate, type });

      res.status(200).json({
        success: true,
        message: data.length > 0
          ? 'Lấy danh sách top sản phẩm thành công'
          : 'Không có dữ liệu trong khoảng thời gian này',
        data: data
      });
    } catch (error) {
      next(error);
    }
  },

  async getInventory(req, res, next) {
    try {
      const { fromDate, toDate, category } = req.query;

      const data = await ReportService.getInventoryReport({ fromDate, toDate, category });

      res.status(200).json({
        success: true,
        message: 'Lấy báo cáo tổng hợp thành công',
        data: data
      });
    } catch (error) {
      next(error);
    }
  }
};
