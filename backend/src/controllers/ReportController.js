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
};
