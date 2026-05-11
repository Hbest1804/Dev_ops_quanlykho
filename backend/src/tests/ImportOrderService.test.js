import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportOrderService } from '../services/ImportOrderService.js';
import { ImportOrderRepository } from '../repositories/ImportOrderRepository.js';

vi.mock('../repositories/ImportOrderRepository.js', () => ({
  ImportOrderRepository: {
    create:   vi.fn(),
    findAll:  vi.fn(),
    findById: vi.fn(),
    confirm:  vi.fn(),
    cancel:   vi.fn(),
  },
}));

const mockOrder = (overrides = {}) => ({
  id: 10,
  code: 'PN010',
  supplier: 'Công ty ABC',
  status: 'pending',
  import_date: '2025-06-01',
  note: null,
  created_by: 1,
  created_at: new Date(),
  updated_at: new Date(),
  items: [{ product_id: 1, quantity: 20, snapshot_product_name: 'Bàn phím', snapshot_product_code: 'SP001', snapshot_unit: 'Cái' }],
  ...overrides,
});

const validItems = () => [
  { product_id: 1, quantity: 20 },
  { product_id: 2, quantity: 10 },
];

describe('ImportOrderService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create()', () => {
    it('UT-IMP-CREATE-001: Tạo phiếu nhập thành công', async () => {
      ImportOrderRepository.create.mockResolvedValue({ ...mockOrder(), items: validItems() });

      const result = await ImportOrderService.create(
        { supplier: 'Công ty ABC', import_date: '2025-06-01', items: validItems() },
        1,
      );

      expect(ImportOrderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ supplier: 'Công ty ABC', import_date: '2025-06-01', created_by: 1 }),
      );
      expect(result.status).toBe('pending');
    });

    it('UT-IMP-CREATE-002: items rỗng → 400', async () => {
      await expect(
        ImportOrderService.create({ supplier: 'Công ty ABC', import_date: '2025-06-01', items: [] }, 1),
      ).rejects.toThrow('Items must not be empty');
    });

    it('UT-IMP-CREATE-003: quantity <= 0 → 400', async () => {
      await expect(
        ImportOrderService.create(
          { supplier: 'Công ty ABC', import_date: '2025-06-01', items: [{ product_id: 1, quantity: 0 }] },
          1,
        ),
      ).rejects.toThrow('Quantity must be a positive integer');
    });

    it('UT-IMP-CREATE-004: product không tồn tại → repo ném lỗi', async () => {
      ImportOrderRepository.create.mockRejectedValue(
        Object.assign(new Error('Product 99 not found'), { status: 404 }),
      );

      await expect(
        ImportOrderService.create(
          { supplier: 'Công ty ABC', import_date: '2025-06-01', items: [{ product_id: 99, quantity: 5 }] },
          1,
        ),
      ).rejects.toThrow('Product 99 not found');
    });

    it('UT-IMP-CREATE-005: Thiếu supplier → 400', async () => {
      await expect(
        ImportOrderService.create({ supplier: undefined, import_date: '2025-06-01', items: validItems() }, 1),
      ).rejects.toThrow('Supplier is required');
    });

    it('UT-IMP-CREATE-006: create được gọi với đúng items (product_id/quantity)', async () => {
      ImportOrderRepository.create.mockResolvedValue(mockOrder());

      await ImportOrderService.create(
        { supplier: 'Công ty ABC', import_date: '2025-06-01', items: [{ product_id: 1, quantity: 5 }] },
        1,
      );

      expect(ImportOrderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [expect.objectContaining({ product_id: 1, quantity: 5 })],
        }),
      );
    });
  });

  describe('confirm()', () => {
    it('UT-IMP-CONFIRM-001: Xác nhận phiếu pending thành công', async () => {
      ImportOrderRepository.findById.mockResolvedValue(mockOrder({ status: 'pending' }));
      ImportOrderRepository.confirm.mockResolvedValue(mockOrder({ status: 'confirmed' }));

      const result = await ImportOrderService.confirm(10, 1);

      expect(ImportOrderRepository.confirm).toHaveBeenCalledWith(10, 1);
      expect(result.status).toBe('confirmed');
    });

    it('UT-IMP-CONFIRM-002: Phiếu đã confirmed → repo ném 409', async () => {
      ImportOrderRepository.findById.mockResolvedValue(mockOrder({ status: 'confirmed' }));
      ImportOrderRepository.confirm.mockRejectedValue(
        Object.assign(new Error('Order is not in pending status'), { status: 409 }),
      );

      await expect(ImportOrderService.confirm(10, 1))
        .rejects.toMatchObject({ status: 409, message: 'Order is not in pending status' });
    });

    it('UT-IMP-CONFIRM-003: Phiếu đã cancelled → repo ném 409', async () => {
      ImportOrderRepository.findById.mockResolvedValue(mockOrder({ status: 'cancelled' }));
      ImportOrderRepository.confirm.mockRejectedValue(
        Object.assign(new Error('Order is not in pending status'), { status: 409 }),
      );

      await expect(ImportOrderService.confirm(10, 1))
        .rejects.toMatchObject({ status: 409, message: 'Order is not in pending status' });
    });

    it('UT-IMP-CONFIRM-004: Phiếu không tồn tại → 404', async () => {
      ImportOrderRepository.findById.mockResolvedValue(null);

      await expect(ImportOrderService.confirm(9999, 1))
        .rejects.toMatchObject({ status: 404 });
      expect(ImportOrderRepository.confirm).not.toHaveBeenCalled();
    });

    it('UT-IMP-CONFIRM-005: Nhiều dòng hàng — repo.confirm được gọi với đúng orderId', async () => {
      const items = [
        { product_id: 1, quantity: 10, snapshot_product_name: 'SP A', snapshot_product_code: 'SP001', snapshot_unit: 'Cái' },
        { product_id: 2, quantity: 5,  snapshot_product_name: 'SP B', snapshot_product_code: 'SP002', snapshot_unit: 'Hộp' },
        { product_id: 3, quantity: 8,  snapshot_product_name: 'SP C', snapshot_product_code: 'SP003', snapshot_unit: 'Kg' },
      ];
      ImportOrderRepository.findById.mockResolvedValue(mockOrder({ status: 'pending', items }));
      ImportOrderRepository.confirm.mockResolvedValue(mockOrder({ status: 'confirmed', items }));

      const result = await ImportOrderService.confirm(10, 1);

      expect(ImportOrderRepository.confirm).toHaveBeenCalledWith(10, 1);
      expect(result.items).toHaveLength(3);
    });

    it('UT-IMP-CONFIRM-006: Snapshot product name được giữ nguyên sau confirm', async () => {
      ImportOrderRepository.findById.mockResolvedValue(mockOrder({ status: 'pending' }));
      ImportOrderRepository.confirm.mockResolvedValue(
        mockOrder({ status: 'confirmed', items: [{ product_id: 1, quantity: 20, snapshot_product_name: 'Bàn phím', snapshot_product_code: 'SP001', snapshot_unit: 'Cái' }] }),
      );

      const result = await ImportOrderService.confirm(10, 1);

      expect(result.items[0].snapshot_product_name).toBe('Bàn phím');
    });
  });

  describe('cancel()', () => {
    it('UT-IMP-CANCEL-001: Hủy phiếu pending thành công', async () => {
      ImportOrderRepository.findById.mockResolvedValue(mockOrder({ status: 'pending' }));
      ImportOrderRepository.cancel.mockResolvedValue(mockOrder({ status: 'cancelled' }));

      const result = await ImportOrderService.cancel(10);

      expect(ImportOrderRepository.cancel).toHaveBeenCalledWith(10);
      expect(result.status).toBe('cancelled');
    });

    it('UT-IMP-CANCEL-002: Hủy phiếu đã confirmed → repo ném 409', async () => {
      ImportOrderRepository.findById.mockResolvedValue(mockOrder({ status: 'confirmed' }));
      ImportOrderRepository.cancel.mockRejectedValue(
        Object.assign(new Error('Order is not in pending status'), { status: 409 }),
      );

      await expect(ImportOrderService.cancel(10))
        .rejects.toMatchObject({ status: 409, message: 'Order is not in pending status' });
    });

    it('UT-IMP-CANCEL-003: Phiếu không tồn tại → 404', async () => {
      ImportOrderRepository.findById.mockResolvedValue(null);

      await expect(ImportOrderService.cancel(9999))
        .rejects.toMatchObject({ status: 404 });
      expect(ImportOrderRepository.cancel).not.toHaveBeenCalled();
    });

    it('UT-IMP-CANCEL-004: Hủy phiếu đã cancelled → repo ném 409', async () => {
      ImportOrderRepository.findById.mockResolvedValue(mockOrder({ status: 'cancelled' }));
      ImportOrderRepository.cancel.mockRejectedValue(
        Object.assign(new Error('Order is not in pending status'), { status: 409 }),
      );

      await expect(ImportOrderService.cancel(10))
        .rejects.toMatchObject({ status: 409, message: 'Order is not in pending status' });
    });

    it('UT-IMP-CANCEL-005: Stock không bị thay đổi khi hủy phiếu pending', async () => {
      ImportOrderRepository.findById.mockResolvedValue(mockOrder({ status: 'pending' }));
      ImportOrderRepository.cancel.mockResolvedValue(mockOrder({ status: 'cancelled' }));

      await ImportOrderService.cancel(10);

      expect(ImportOrderRepository.confirm).not.toHaveBeenCalled();
      expect(ImportOrderRepository.cancel).toHaveBeenCalledWith(10);
    });
  });

  describe('findAll() / findById()', () => {
    it('UT-IMP-GET-001: Lọc theo status → repo.findAll nhận đúng status', async () => {
      ImportOrderRepository.findAll.mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 }, statusCounts: {} });

      await ImportOrderService.findAll({ status: 'pending' });

      expect(ImportOrderRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' }),
      );
    });

    it('UT-IMP-GET-002: Lọc theo khoảng thời gian → repo.findAll nhận đúng from/to', async () => {
      ImportOrderRepository.findAll.mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 }, statusCounts: {} });

      await ImportOrderService.findAll({ from_date: '2025-01-01', to_date: '2025-06-30' });

      expect(ImportOrderRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ from_date: '2025-01-01', to_date: '2025-06-30' }),
      );
    });

    it('UT-IMP-GET-003: Lấy chi tiết phiếu tồn tại → trả về order + items đầy đủ', async () => {
      ImportOrderRepository.findById.mockResolvedValue(mockOrder());

      const result = await ImportOrderService.findById(10);

      expect(ImportOrderRepository.findById).toHaveBeenCalledWith(10);
      expect(result.id).toBe(10);
      expect(result.items).toBeDefined();
    });

    it('UT-IMP-GET-004: Phiếu không tồn tại → 404', async () => {
      ImportOrderRepository.findById.mockResolvedValue(null);

      await expect(ImportOrderService.findById(9999))
        .rejects.toMatchObject({ status: 404 });
    });

    it('UT-IMP-GET-005: Items trả về snapshot_product_name gốc, không bị ảnh hưởng khi product đổi tên', async () => {
      const orderWithSnapshot = mockOrder({
        items: [{ product_id: 1, quantity: 20, snapshot_product_name: 'Bàn phím', snapshot_product_code: 'SP001', snapshot_unit: 'Cái' }],
      });
      ImportOrderRepository.findById.mockResolvedValue(orderWithSnapshot);

      const result = await ImportOrderService.findById(10);

      expect(result.items[0].snapshot_product_name).toBe('Bàn phím');
    });
  });
});
