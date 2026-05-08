import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportOrderService } from '../services/ExportOrderService.js';
import { ExportOrderRepository } from '../repositories/ExportOrderRepository.js';
import { ProductRepository } from '../repositories/ProductRepository.js';
import { StockTransactionRepository } from '../repositories/StockTransactionRepository.js';
import { pool } from '../db/Pool.js';

vi.mock('../repositories/ExportOrderRepository.js', () => ({
  ExportOrderRepository: {
    createWithItems:    vi.fn(),
    findById:           vi.fn(),
    findByIdForUpdate:  vi.fn(),
    findByIdWithItems:  vi.fn(),
    findItemsByOrderId: vi.fn(),
    findAll:            vi.fn(),
    count:              vi.fn(),
    updateStatus:       vi.fn(),
    cancel:             vi.fn(),
  },
}));

vi.mock('../repositories/ProductRepository.js', () => ({
  ProductRepository: {
    findByIdsWithStock:        vi.fn(),
    findManyByIdsForUpdate:    vi.fn(),
    updateMultipleStocks:      vi.fn(),
  },
}));

vi.mock('../repositories/StockTransactionRepository.js', () => ({
  StockTransactionRepository: {
    createMany: vi.fn(),
  },
}));

vi.mock('../db/Pool.js', () => ({
  pool: { connect: vi.fn() },
}));

const mockOrder = (overrides = {}) => ({
  id: 8,
  code: 'PX008',
  reason: 'sale',
  status: 'pending',
  export_date: '2025-06-05',
  note: null,
  created_by: 1,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
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

  describe('confirmExportOrder()', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = { query: vi.fn(), release: vi.fn() };
      pool.connect.mockResolvedValue(mockClient);
    });

    it('UT-EXPORT-CONFIRM-001: Xác nhận phiếu xuất thành công (bulk)', async () => {
      const mockItems = [
        { product_id: 10, quantity: 2, snapshot_product_code: 'P1', snapshot_product_name: 'Prod 1', snapshot_unit: 'Cái' },
        { product_id: 20, quantity: 5, snapshot_product_code: 'P2', snapshot_product_name: 'Prod 2', snapshot_unit: 'Thùng' },
      ];
      const mockProducts = [
        { id: 10, name: 'Prod 1', stock: 10 },
        { id: 20, name: 'Prod 2', stock: 20 },
      ];

      ExportOrderRepository.findByIdForUpdate.mockResolvedValue(mockOrder({ id: 1 }));
      ExportOrderRepository.findItemsByOrderId.mockResolvedValue(mockItems);
      ProductRepository.findManyByIdsForUpdate.mockResolvedValue(mockProducts);
      ProductRepository.updateMultipleStocks.mockResolvedValue([]);
      StockTransactionRepository.createMany.mockResolvedValue([]);
      ExportOrderRepository.updateStatus.mockResolvedValue(mockOrder({ id: 1, status: 'confirmed' }));

      const result = await ExportOrderService.confirmExportOrder(1, 100);

      expect(result.status).toBe('confirmed');
      expect(ProductRepository.findManyByIdsForUpdate).toHaveBeenCalledWith([10, 20], mockClient);
      expect(ProductRepository.updateMultipleStocks).toHaveBeenCalledWith(
        [{ id: 10, change: -2 }, { id: 20, change: -5 }],
        mockClient,
      );
      expect(StockTransactionRepository.createMany).toHaveBeenCalledOnce();
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('UT-EXP-CONFIRM-002: Tồn kho không đủ tại thời điểm confirm → 422, ROLLBACK', async () => {
      ExportOrderRepository.findByIdForUpdate.mockResolvedValue(mockOrder({ id: 1 }));
      ExportOrderRepository.findItemsByOrderId.mockResolvedValue([
        { product_id: 10, quantity: 100, snapshot_product_code: 'P1', snapshot_product_name: 'Prod 1', snapshot_unit: 'Cái' },
      ]);
      ProductRepository.findManyByIdsForUpdate.mockResolvedValue([
        { id: 10, name: 'Sản phẩm X', stock: 3 },
      ]);

      await expect(ExportOrderService.confirmExportOrder(1, 1))
        .rejects.toMatchObject({ status: 422, message: 'Insufficient stock at confirmation time' });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('UT-EXP-CONFIRM-003: Phiếu đã confirmed → 409', async () => {
      ExportOrderRepository.findByIdForUpdate.mockResolvedValue(mockOrder({ id: 1, status: 'confirmed' }));

      await expect(ExportOrderService.confirmExportOrder(1, 1))
        .rejects.toMatchObject({ status: 409, message: 'Order is not in pending status' });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('UT-EXP-CONFIRM-004: Phiếu không tồn tại → 404', async () => {
      ExportOrderRepository.findByIdForUpdate.mockResolvedValue(null);

      await expect(ExportOrderService.confirmExportOrder(1, 1))
        .rejects.toMatchObject({ status: 404, message: 'Export order not found' });
    });

    it('UT-EXP-CONFIRM-005: Tồn kho đúng bằng số lượng xuất → thành công, stock = 0', async () => {
      ExportOrderRepository.findByIdForUpdate.mockResolvedValue(mockOrder({ id: 1 }));
      ExportOrderRepository.findItemsByOrderId.mockResolvedValue([
        { product_id: 10, quantity: 5, snapshot_product_code: 'P1', snapshot_product_name: 'Prod 1', snapshot_unit: 'Cái' },
      ]);
      ProductRepository.findManyByIdsForUpdate.mockResolvedValue([
        { id: 10, name: 'Prod 1', stock: 5 },
      ]);
      ProductRepository.updateMultipleStocks.mockResolvedValue([]);
      StockTransactionRepository.createMany.mockResolvedValue([]);
      ExportOrderRepository.updateStatus.mockResolvedValue(mockOrder({ id: 1, status: 'confirmed' }));

      const result = await ExportOrderService.confirmExportOrder(1, 1);

      expect(result.status).toBe('confirmed');
      expect(ProductRepository.updateMultipleStocks).toHaveBeenCalledWith(
        [{ id: 10, change: -5 }],
        mockClient,
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('cancelExportOrder()', () => {
    it('UT-EXP-CANCEL-001: Hủy phiếu pending thành công → status cancelled', async () => {
      ExportOrderRepository.cancel.mockResolvedValue(mockOrder({ id: 1, status: 'cancelled' }));

      const result = await ExportOrderService.cancelExportOrder(1, 1);

      expect(result.status).toBe('cancelled');
      expect(ExportOrderRepository.cancel).toHaveBeenCalledWith(1, 1);
      expect(ExportOrderRepository.findById).not.toHaveBeenCalled();
    });

    it('UT-EXP-CANCEL-002: Hủy phiếu đã confirmed → 409', async () => {
      ExportOrderRepository.cancel.mockResolvedValue(null);
      ExportOrderRepository.findById.mockResolvedValue(mockOrder({ id: 1, status: 'confirmed' }));

      await expect(ExportOrderService.cancelExportOrder(1, 1))
        .rejects.toMatchObject({ status: 409, message: 'Order is not in pending status' });
    });

    it('UT-EXP-CANCEL-003: Phiếu không tồn tại → 404', async () => {
      ExportOrderRepository.cancel.mockResolvedValue(null);
      ExportOrderRepository.findById.mockResolvedValue(null);

      await expect(ExportOrderService.cancelExportOrder(1, 1))
        .rejects.toMatchObject({ status: 404, message: 'Export order not found' });
    });

    it('UT-EXP-CANCEL-004: Stock KHÔNG bị thay đổi khi hủy phiếu pending', async () => {
      ExportOrderRepository.cancel.mockResolvedValue(mockOrder({ id: 1, status: 'cancelled' }));

      await ExportOrderService.cancelExportOrder(1, 1);

      expect(ProductRepository.updateMultipleStocks).not.toHaveBeenCalled();
      expect(StockTransactionRepository.createMany).not.toHaveBeenCalled();
    });

    it('UT-EXP-CANCEL-005: Hủy phiếu đã hủy → 409', async () => {
      ExportOrderRepository.cancel.mockResolvedValue(null);
      ExportOrderRepository.findById.mockResolvedValue(mockOrder({ id: 1, status: 'cancelled' }));

      await expect(ExportOrderService.cancelExportOrder(1, 1))
        .rejects.toMatchObject({ status: 409, message: 'Order is not in pending status' });
    });
  });

  describe('getById()', () => {
    const mockOrderWithItems = (overrides = {}) => ({
      ...mockOrder(overrides),
      export_date: '2025-06-05',
      note: null,
      created_by_name: 'Nguyễn Huy',
      confirmed_by_name: null,
      cancelled_by_name: null,
      confirmed_at: null,
      cancelled_at: null,
      items: [
        { product_id: 1, quantity: 5, note: null,
          snapshot_product_code: 'SP001', snapshot_product_name: 'Bàn phím', snapshot_unit: 'Cái', snapshot_category: 'Điện tử' },
      ],
    });

    it('UT-EXP-GET-001: Lấy chi tiết thành công → DTO đúng cấu trúc', async () => {
      ExportOrderRepository.findByIdWithItems.mockResolvedValue(mockOrderWithItems({ id: 1 }));

      const result = await ExportOrderService.getById(1);

      expect(result).toMatchObject({
        id: 1, code: 'PX008', reason: 'sale', status: 'pending',
        exportDate: '2025-06-05', createdBy: 'Nguyễn Huy',
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        productId: 1, productCode: 'SP001', productName: 'Bàn phím', quantity: 5, unit: 'Cái',
      });
    });

    it('UT-EXP-GET-002: Phiếu không tồn tại → 404', async () => {
      ExportOrderRepository.findByIdWithItems.mockResolvedValue(null);

      await expect(ExportOrderService.getById(1))
        .rejects.toMatchObject({ status: 404, message: 'Export order not found' });
    });
  });

  describe('getAll()', () => {
    it('UT-EXP-LIST-001: Lấy danh sách thành công → { items, total }', async () => {
      ExportOrderRepository.findAll.mockResolvedValue([
        { id: 1, code: 'PX001', reason: 'sale', status: 'confirmed',
          export_date: '2025-06-05', created_by_name: 'Nguyễn Huy', total_quantity: 10 },
      ]);
      ExportOrderRepository.count.mockResolvedValue(1);

      const result = await ExportOrderService.getAll({ page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: 1, code: 'PX001', status: 'confirmed',
        exportDate: '2025-06-05', createdBy: 'Nguyễn Huy', totalQuantity: 10,
      });
    });

    it('UT-EXP-LIST-002: Danh sách rỗng → { items: [], total: 0 }', async () => {
      ExportOrderRepository.findAll.mockResolvedValue([]);
      ExportOrderRepository.count.mockResolvedValue(0);

      const result = await ExportOrderService.getAll({ page: 1, limit: 20 });

      expect(result).toEqual({ items: [], total: 0 });
    });

    it('UT-EXP-LIST-003: findAll và count nhận đúng filter params', async () => {
      ExportOrderRepository.findAll.mockResolvedValue([]);
      ExportOrderRepository.count.mockResolvedValue(0);

      await ExportOrderService.getAll({ status: 'pending', reason: 'sale', from: '2025-01-01', to: '2025-12-31', page: 2, limit: 10 });

      expect(ExportOrderRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending', reason: 'sale', from: '2025-01-01', to: '2025-12-31', page: 2, limit: 10 })
      );
      expect(ExportOrderRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending', reason: 'sale' })
      );
    });
  });
});
