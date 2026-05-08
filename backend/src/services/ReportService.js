import { ReportRepository } from '../repositories/ReportRepository.js';
import { BadRequest } from '../utils/AppError.js';

function toItemDto(row) {
  return {
    productId:    row.product_id,
    productCode:  row.product_code,
    productName:  row.product_name,
    openingStock: row.opening_stock,
    totalImport:  row.total_import,
    totalExport:  row.total_export,
    closingStock: row.opening_stock + row.total_import - row.total_export,
  };
}

export const ReportService = {
  async getSummary({ from, to, category, page, limit }) {
    if (!from || !to) throw BadRequest('from and to are required');

    const [rows, total] = await Promise.all([
      ReportRepository.findSummary({ from, to, category, page, limit }),
      ReportRepository.countSummary({ from, to, category }),
    ]);

    return {
      period: { from, to },
      items: rows.map(toItemDto),
      total,
    };
  },
};
