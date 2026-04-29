import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportService } from '../services/ReportService.js';
import { ReportRepository } from '../repositories/ReportRepository.js';

vi.mock('../repositories/ReportRepository.js');

describe('ReportService.getInventoryReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('UT-REPORT-001 | lấy báo cáo thành công và tính đúng tồn cuối', async () => {
    const mockRows = [
      { id: 1, name: 'Prod A', opening_stock: 10, total_import: 5, total_export: 3 },
      { id: 2, name: 'Prod B', opening_stock: 0, total_import: 10, total_export: 2 }
    ];
    ReportRepository.getInventoryReport.mockResolvedValue(mockRows);

    const result = await ReportService.getInventoryReport({
      fromDate: '2026-04-01',
      toDate: '2026-04-30'
    });

    expect(result).toHaveLength(2);
    expect(result[0].closing_stock).toBe(12); // 10 + 5 - 3
    expect(result[1].closing_stock).toBe(8);  // 0 + 10 - 2
    expect(ReportRepository.getInventoryReport).toHaveBeenCalledOnce();
  });

  it('UT-REPORT-002 | lỗi khi thiếu ngày', async () => {
    await expect(ReportService.getInventoryReport({ fromDate: '2026-01-01' }))
      .rejects.toMatchObject({ status: 400, message: expect.stringContaining('đầy đủ') });
  });

  it('UT-REPORT-003 | lỗi khi ngày bắt đầu > ngày kết thúc', async () => {
    await expect(ReportService.getInventoryReport({ 
      fromDate: '2026-05-01', 
      toDate: '2026-04-01' 
    })).rejects.toMatchObject({ status: 400, message: 'Ngày bắt đầu không được lớn hơn ngày kết thúc' });
  });
});
