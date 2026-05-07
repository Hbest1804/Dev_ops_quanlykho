import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportOrderService } from '../services/ExportOrderService.js';
import { ExportOrderRepository } from '../repositories/ExportOrderRepository.js';
import { ProductRepository } from '../repositories/ProductRepository.js';

vi.mock('../repositories/ExportOrderRepository.js', () => ({
  ExportOrderRepository: {
    createWithItems: vi.fn(),
  },
}));

vi.mock('../repositories/ProductRepository.js', () => ({
  ProductRepository: {
    findByIdsWithStock: vi.fn(),
  },
}));

const mockOrder = () => ({
  id: 8,
  code: 'PX008',
  reason: 'sale',
  status: 'pending',
  export_date: '2025-06-05',
  note: null,
  created_by: 1,
  created_at: new Date(),
  updated_at: new Date(),
});

const validPayload = () => ({
  reason: 'sale',
  exportDate: '2025-06-05',
  note: null,
  items: [{ productId: 1, quantity: 5 }],
  userId: 1,
});

describe('ExportOrderService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create()', () => {
    it('UT-EXP-CREATE-001: Tạo phiếu xuất thành công', async () => {
      ProductRepository.findByIdsWithStock.mockResolvedValue([
        { id: 1, code: 'SP001', stock: 50, is_deleted: false },
      ]);
      ExportOrderRepository.createWithItems.mockResolvedValue(mockOrder());

      const result = await ExportOrderService.create(validPayload());

      expect(ProductRepository.findByIdsWithStock).toHaveBeenCalledWith([1]);
      expect(ExportOrderRepository.createWithItems).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'sale', exportDate: '2025-06-05', userId: 1 }),
        expect.arrayContaining([expect.objectContaining({ productId: 1, quantity: 5 })])
      );
      expect(result.status).toBe('pending');
    });

    it('UT-EXP-CREATE-002: Số lượng xuất vượt tồn kho → 422', async () => {
      ProductRepository.findByIdsWithStock.mockResolvedValue([
        { id: 1, code: 'SP001', stock: 50, is_deleted: false },
      ]);

      await expect(ExportOrderService.create({ ...validPayload(), items: [{ productId: 1, quantity: 100 }] }))
        .rejects.toMatchObject({
          status: 422,
          message: 'Insufficient stock for product SP001 (available: 50, requested: 100)',
        });
    });

    it('UT-EXP-CREATE-003: Tồn kho đúng bằng số lượng xuất → 201', async () => {
      ProductRepository.findByIdsWithStock.mockResolvedValue([
        { id: 1, code: 'SP001', stock: 50, is_deleted: false },
      ]);
      ExportOrderRepository.createWithItems.mockResolvedValue(mockOrder());

      const result = await ExportOrderService.create({ ...validPayload(), items: [{ productId: 1, quantity: 50 }] });

      expect(result.status).toBe('pending');
      expect(ExportOrderRepository.createWithItems).toHaveBeenCalled();
    });

    it('UT-EXP-CREATE-004: Nhiều dòng — một dòng không đủ hàng → 422', async () => {
      ProductRepository.findByIdsWithStock.mockResolvedValue([
        { id: 1, code: 'SP001', stock: 500, is_deleted: false },
        { id: 2, code: 'SP002', stock: 100, is_deleted: false },
      ]);

      await expect(ExportOrderService.create({
        ...validPayload(),
        items: [{ productId: 1, quantity: 10 }, { productId: 2, quantity: 999 }],
      })).rejects.toMatchObject({
        status: 422,
        message: 'Insufficient stock for product SP002 (available: 100, requested: 999)',
      });
      expect(ExportOrderRepository.createWithItems).not.toHaveBeenCalled();
    });

    it('UT-EXP-CREATE-005: reason không hợp lệ → 400', async () => {
      await expect(ExportOrderService.create({ ...validPayload(), reason: 'invalid_reason' }))
        .rejects.toMatchObject({ status: 400, message: 'Reason must be sale|internal|damaged' });
    });

    it('UT-EXP-CREATE-006: Snapshot fields do DB xử lý — createWithItems nhận đúng productId/quantity', async () => {
      ProductRepository.findByIdsWithStock.mockResolvedValue([
        { id: 1, code: 'SP001', stock: 100, is_deleted: false },
      ]);
      ExportOrderRepository.createWithItems.mockResolvedValue(mockOrder());

      await ExportOrderService.create({
        reason: 'sale',
        exportDate: '2025-06-05',
        items: [{ productId: 1, quantity: 5 }],
        userId: 1,
      });

      expect(ExportOrderRepository.createWithItems).toHaveBeenCalledWith(
        expect.anything(),
        [expect.objectContaining({ productId: 1, quantity: 5 })]
      );
    });
  });
});
