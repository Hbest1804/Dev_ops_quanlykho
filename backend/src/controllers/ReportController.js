import { ReportService } from '../services/ReportService.js';

export const ReportController = {
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
