import { ReportRepository } from '../repositories/ReportRepository.js';
import { BadRequest } from '../utils/AppError.js';

function toItemDto(row) {
  const opening = Number(row.opening_stock);
  const imported = Number(row.total_import);
  const exported = Number(row.total_export);
  return {
    productId:    row.product_id,
    productCode:  row.product_code,
    productName:  row.product_name,
    openingStock: opening,
    totalImport:  imported,
    totalExport:  exported,
    closingStock: opening + imported - exported,
  };
}

export const ReportService = {
  async getSummary({ from, to, category, page, limit }) {
    if (!from || !to) throw BadRequest('from and to are required');

    const [rows, total, totals] = await Promise.all([
      ReportRepository.findSummary({ from, to, category, page, limit }),
      ReportRepository.countSummary({ from, to, category }),
      ReportRepository.findTotals({ from, to, category }),
    ]);

    return {
      period: { from, to },
      items: rows.map(toItemDto),
      total,
      totals,
    };
  },

  async getTopProducts({ fromDate, toDate, type }) {
    if (!fromDate || !toDate) {
      throw BadRequest('Vui lòng cung cấp đầy đủ fromDate và toDate');
    }

    if (!type || !['import', 'export'].includes(type)) {
      throw BadRequest('Loại giao dịch (type) phải là "import" hoặc "export"');
    }

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

    const rows = await ReportRepository.getTopProducts(start, end, type);
    return rows;
  }
};
