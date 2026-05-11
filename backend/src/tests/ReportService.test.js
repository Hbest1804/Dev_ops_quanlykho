import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportService } from '../services/ReportService.js';
import { ReportRepository } from '../repositories/ReportRepository.js';

vi.mock('../repositories/ReportRepository.js');

describe('ReportService.getSummary', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('UT-RPT-SUM-001 | correct formula: closingStock = openingStock + totalImport - totalExport', async () => {
    ReportRepository.findSummary.mockResolvedValue([{
      product_id: 1, product_code: 'SP001', product_name: 'Bàn phím cơ',
      opening_stock: 30, total_import: 50, total_export: 25,
    }]);
    ReportRepository.countSummary.mockResolvedValue(1);
    ReportRepository.findTotals.mockResolvedValue({ totalImport: 50, totalExport: 25, totalClosing: 55 });

    const result = await ReportService.getSummary({ from: '2025-06-01', to: '2025-06-30', page: 1, limit: 50 });

    expect(result.period).toEqual({ from: '2025-06-01', to: '2025-06-30' });
    expect(result.total).toBe(1);
    expect(result.totals).toEqual({ totalImport: 50, totalExport: 25, totalClosing: 55 });
    const item = result.items[0];
    expect(item.productId).toBe(1);
    expect(item.productCode).toBe('SP001');
    expect(item.productName).toBe('Bàn phím cơ');
    expect(item.openingStock).toBe(30);
    expect(item.totalImport).toBe(50);
    expect(item.totalExport).toBe(25);
    expect(item.closingStock).toBe(55); // 30 + 50 - 25
  });

  it('UT-RPT-SUM-002 | missing from → throw 400', async () => {
    await expect(ReportService.getSummary({ to: '2025-06-30', page: 1, limit: 50 }))
      .rejects.toMatchObject({ status: 400, message: 'from and to are required' });
  });

  it('UT-RPT-SUM-003 | missing to → throw 400', async () => {
    await expect(ReportService.getSummary({ from: '2025-01-01', page: 1, limit: 50 }))
      .rejects.toMatchObject({ status: 400, message: 'from and to are required' });
  });

  it('UT-RPT-SUM-004 | no data in period → items: [], total: 0', async () => {
    ReportRepository.findSummary.mockResolvedValue([]);
    ReportRepository.countSummary.mockResolvedValue(0);
    ReportRepository.findTotals.mockResolvedValue({ totalImport: 0, totalExport: 0, totalClosing: 0 });

    const result = await ReportService.getSummary({ from: '2020-01-01', to: '2020-01-31', page: 1, limit: 50 });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('UT-RPT-SUM-005 | category filter is passed through to repository', async () => {
    ReportRepository.findSummary.mockResolvedValue([]);
    ReportRepository.countSummary.mockResolvedValue(0);
    ReportRepository.findTotals.mockResolvedValue({ totalImport: 0, totalExport: 0, totalClosing: 0 });

    await ReportService.getSummary({
      from: '2025-06-01', to: '2025-06-30',
      category: 'Thiết bị ngoại vi', page: 1, limit: 50,
    });

    expect(ReportRepository.findSummary).toHaveBeenCalledWith({
      from: '2025-06-01', to: '2025-06-30',
      category: 'Thiết bị ngoại vi', page: 1, limit: 50,
    });
    expect(ReportRepository.countSummary).toHaveBeenCalledWith({
      from: '2025-06-01', to: '2025-06-30',
      category: 'Thiết bị ngoại vi',
    });
    expect(ReportRepository.findTotals).toHaveBeenCalledWith({
      from: '2025-06-01', to: '2025-06-30',
      category: 'Thiết bị ngoại vi',
    });
  });
});
