import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportOrderService } from '../services/ImportOrderService.js';
import { ImportOrderRepository } from '../repositories/ImportOrderRepository.js';
import { ProductRepository } from '../repositories/ProductRepository.js';

vi.mock('../repositories/ImportOrderRepository.js', () => ({
  ImportOrderRepository: {
    createWithItems: vi.fn(),
  },
}));

vi.mock('../repositories/ProductRepository.js', () => ({
  ProductRepository: {
    findByIds: vi.fn(),
  },
}));

const mockOrder = () => ({
  id: 10,
  code: 'PN010',
  supplier: 'Công ty ABC',
  status: 'pending',
  import_date: '2025-06-01',
  note: null,
  created_by: 1,
  created_at: new Date(),
  updated_at: new Date(),
});

const validPayload = () => ({
  supplier: 'Công ty ABC',
  importDate: '2025-06-01',
  note: null,
  items: [
    { productId: 1, quantity: 20 },
    { productId: 2, quantity: 10 },
  ],
  userId: 1,
});

describe('ImportOrderService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create()', () => {
    it('UT-IMP-CREATE-001: Tạo phiếu nhập thành công', async () => {
      ProductRepository.findByIds.mockResolvedValue([
        { id: 1, is_deleted: false },
        { id: 2, is_deleted: false },
      ]);
      ImportOrderRepository.createWithItems.mockResolvedValue(mockOrder());

      const result = await ImportOrderService.create(validPayload());

      expect(ProductRepository.findByIds).toHaveBeenCalledWith([1, 2]);
      expect(ImportOrderRepository.createWithItems).toHaveBeenCalledWith(
        expect.objectContaining({ supplier: 'Công ty ABC', importDate: '2025-06-01', userId: 1 }),
        expect.arrayContaining([
          expect.objectContaining({ productId: 1, quantity: 20 }),
          expect.objectContaining({ productId: 2, quantity: 10 }),
        ])
      );
      expect(result.status).toBe('pending');
    });

    it('UT-IMP-CREATE-002: items rỗng → 400', async () => {
      await expect(ImportOrderService.create({ ...validPayload(), items: [] }))
        .rejects.toThrow('Items must not be empty');
    });

    it('UT-IMP-CREATE-003: quantity <= 0 → 400', async () => {
      await expect(ImportOrderService.create({ ...validPayload(), items: [{ productId: 1, quantity: 0 }] }))
        .rejects.toThrow('Quantity must be a positive integer');
    });

    it('UT-IMP-CREATE-004: productId không tồn tại → 404', async () => {
      ProductRepository.findByIds.mockResolvedValue([]);

      await expect(ImportOrderService.create({ ...validPayload(), items: [{ productId: 99, quantity: 5 }] }))
        .rejects.toThrow('Product 99 not found');
    });

    it('UT-IMP-CREATE-005: Thiếu supplier → 400', async () => {
      await expect(ImportOrderService.create({ ...validPayload(), supplier: undefined }))
        .rejects.toThrow('Supplier is required');
    });

    it('UT-IMP-CREATE-006: Snapshot fields do DB xử lý — createWithItems nhận đúng productId/quantity', async () => {
      ProductRepository.findByIds.mockResolvedValue([{ id: 1, is_deleted: false }]);
      ImportOrderRepository.createWithItems.mockResolvedValue(mockOrder());

      await ImportOrderService.create({
        supplier: 'Công ty ABC',
        importDate: '2025-06-01',
        items: [{ productId: 1, quantity: 5 }],
        userId: 1,
      });

      expect(ImportOrderRepository.createWithItems).toHaveBeenCalledWith(
        expect.anything(),
        [expect.objectContaining({ productId: 1, quantity: 5 })]
      );
    });
  });
});
