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
};
