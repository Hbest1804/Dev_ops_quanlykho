import { ReportRepository } from '../repositories/ReportRepository.js';
import { BadRequest } from '../utils/AppError.js';

export const ReportService = {
  async getInventoryReport({ fromDate, toDate, category }) {
    if (!fromDate || !toDate) {
      throw BadRequest('Vui lòng cung cấp đầy đủ fromDate và toDate');
    }

    // Chuẩn hóa ngày (Thêm thời gian để bao trùm hết toDate)
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw BadRequest('Định dạng ngày tháng không hợp lệ');
    }

    if (start > end) {
      throw BadRequest('Ngày bắt đầu không được lớn hơn ngày kết thúc');
    }

    const rows = await ReportRepository.getInventoryReport(start, end, category);

    // Xử lý dữ liệu: Tính toán tồn cuối kỳ
    const reportData = rows.map(row => {
      const closingStock = row.opening_stock + row.total_import - row.total_export;
      return {
        ...row,
        closing_stock: closingStock
      };
    });

    return reportData;
  }
};
