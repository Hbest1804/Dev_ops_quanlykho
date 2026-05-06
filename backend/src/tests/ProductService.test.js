import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductService } from '../services/ProductService.js';
import { ProductRepository } from '../repositories/ProductRepository.js';
import { BadRequest, Conflict, NotFound, UnprocessableEntity } from '../utils/AppError.js';

// Mock dependencies
vi.mock('../repositories/ProductRepository.js', () => ({
  ProductRepository: {
    findAll: vi.fn(),
    count: vi.fn(),
    findById: vi.fn(),
    findByCode: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    countTransactions: vi.fn(),
    softDelete: vi.fn(),
    hardDelete: vi.fn(),
  }
}));

// Lưu ý: StockTransactionRepository chưa được inject vào ProductService
// → các test liên quan đến giao dịch kho sẽ được thêm khi Service được nâng cấp.

describe('ProductService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('3.1. getAll() (findAll)', () => {
    it('UT-PROD-GETALL-001: Lấy danh sách không filter', async () => {
      ProductRepository.findAll.mockResolvedValue([]);
      ProductRepository.count.mockResolvedValue(0);

      const result = await ProductService.findAll({ page: 1, limit: 20 });

      expect(ProductRepository.findAll).toHaveBeenCalledWith({ search: undefined, category: undefined, status: undefined, page: 1, limit: 20 });
      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 20
      });
    });

    it('UT-PROD-GETALL-002: Lọc theo search keyword', async () => {
      ProductRepository.findAll.mockResolvedValue([{ id: 1, name: 'bàn phím' }]);
      ProductRepository.count.mockResolvedValue(1);

      const result = await ProductService.findAll({ search: 'bàn phím' });

      expect(ProductRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({ search: 'bàn phím' }));
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('bàn phím');
    });

    it('UT-PROD-GETALL-003: Lọc theo category', async () => {
      ProductRepository.findAll.mockResolvedValue([{ id: 2, category: 'Thiết bị ngoại vi' }]);
      ProductRepository.count.mockResolvedValue(1);

      const result = await ProductService.findAll({ category: 'Thiết bị ngoại vi' });

      expect(ProductRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({ category: 'Thiết bị ngoại vi' }));
      expect(result.items[0].category).toBe('Thiết bị ngoại vi');
    });

    it('UT-PROD-GETALL-004: Không trả về sản phẩm đã soft delete', async () => {
      // Filtering is_deleted = FALSE is handled by buildWhereClause in the repo.
      // Service returns exactly what the repo gives — mock simulates already-filtered result.
      ProductRepository.findAll.mockResolvedValue([{ id: 1, name: 'SP Active', is_deleted: false }]);
      ProductRepository.count.mockResolvedValue(1);

      const result = await ProductService.findAll({});

      expect(result.items).toHaveLength(1);
      expect(result.items).not.toContainEqual(expect.objectContaining({ is_deleted: true }));
    });
  });

  describe('3.2. getById()', () => {
    it('UT-PROD-GETBYID-001: Lấy sp tồn tại', async () => {
      const mockProduct = {
        id: 1, code: 'SP001', name: 'Bàn phím cơ', category: 'Thiết bị ngoại vi',
        unit: 'Cái', stock: 50, description: 'Mô tả', created_at: new Date('2025-01-01'),
      };
      ProductRepository.findById.mockResolvedValue(mockProduct);

      const result = await ProductService.findById(1);

      expect(ProductRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockProduct);
    });

    it('UT-PROD-GETBYID-002: Sp không tồn tại', async () => {
      ProductRepository.findById.mockResolvedValue(null);

      await expect(ProductService.findById(9999)).rejects.toThrowError('Product not found');
    });

    it('UT-PROD-GETBYID-003: Sp đã soft delete', async () => {
      const deletedProduct = { id: 2, name: 'SP Deleted', is_deleted: true };
      ProductRepository.findById.mockResolvedValue(deletedProduct);

      await expect(ProductService.findById(2)).rejects.toThrowError('Product not found');
    });
  });

  describe('3.3. create()', () => {
    it('UT-PROD-CREATE-001: Tạo sp thành công (stock=0)', async () => {
      const payload = { code: 'SP099', name: 'Test', category: 'A', unit: 'Cái', description: 'Mô tả test', initialStock: 0 };
      const createdProduct = { id: 1, ...payload, stock: 0 };

      ProductRepository.findByCode.mockResolvedValue(null);
      ProductRepository.create.mockResolvedValue(createdProduct);

      const result = await ProductService.create(payload);

      expect(ProductRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'SP099', initialStock: 0 })
      );
      expect(result).toEqual(createdProduct);
    });

    it('UT-PROD-CREATE-002: Tạo sp với initialStock > 0', async () => {
      const payload = { code: 'SP100', name: 'Test', category: 'A', unit: 'Cái', description: 'Mô tả test', initialStock: 50 };
      const createdProduct = { id: 2, ...payload, stock: 50 };

      ProductRepository.findByCode.mockResolvedValue(null);
      ProductRepository.create.mockResolvedValue(createdProduct);

      const result = await ProductService.create(payload);

      expect(ProductRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ initialStock: 50 })
      );
      expect(result.stock).toBe(50);
    });

    it('UT-PROD-CREATE-003: Mã SP đã tồn tại', async () => {
      const payload = { code: 'SP099', name: 'Test', category: 'A', unit: 'Cái', description: 'Mô tả test' };
      ProductRepository.findByCode.mockResolvedValue({ id: 1, code: 'SP099' });

      await expect(ProductService.create(payload)).rejects.toThrowError('Product code already exists');
    });

    it('UT-PROD-CREATE-004: Thiếu trường bắt buộc (name)', async () => {
      const payload = { code: 'SP099', category: 'A', unit: 'Cái', description: 'Mô tả test' }; // name: undefined

      await expect(ProductService.create(payload)).rejects.toThrowError('code, name, category, unit and description are required');
    });

    it('UT-PROD-CREATE-005: initialStock âm', async () => {
      const payload = { code: 'SP099', name: 'Test', category: 'A', unit: 'Cái', description: 'Mô tả test', initialStock: -5 };
      ProductRepository.findByCode.mockResolvedValue(null);

      await expect(ProductService.create(payload)).rejects.toThrowError('initialStock must be a non-negative integer');
    });
  });

  describe('3.4. update()', () => {
    const validPayload = { name: 'Tên mới', category: 'Danh mục', unit: 'Cái', description: 'Mô tả' };

    it('UT-PROD-UPDATE-001: Cập nhật thành công', async () => {
      const updatedProduct = { id: 1, code: 'SP001', stock: 50, ...validPayload };
      ProductRepository.findById.mockResolvedValue({ id: 1 });
      ProductRepository.update.mockResolvedValue(updatedProduct);

      const result = await ProductService.update(1, validPayload);

      expect(ProductRepository.update).toHaveBeenCalledWith(1, expect.objectContaining(validPayload));
      expect(result).toEqual(updatedProduct);
    });

    it('UT-PROD-UPDATE-002: Sp không tồn tại', async () => {
      ProductRepository.findById.mockResolvedValue(null);

      await expect(ProductService.update(9999, validPayload)).rejects.toThrowError('Product not found');
    });

    it('UT-PROD-UPDATE-003: Field stock bị ignore', async () => {
      ProductRepository.findById.mockResolvedValue({ id: 1 });
      ProductRepository.update.mockResolvedValue({ id: 1, ...validPayload, stock: 50 });

      await ProductService.update(1, { ...validPayload, stock: 9999 });

      expect(ProductRepository.update).toHaveBeenCalledWith(
        1,
        expect.not.objectContaining({ stock: expect.anything() })
      );
    });
  });

  describe('3.5. delete()', () => {
    it('UT-PROD-DEL-001: Hard delete — chưa có giao dịch, stock=0', async () => {
      ProductRepository.findById.mockResolvedValue({ id: 1, stock: 0 });
      ProductRepository.countTransactions.mockResolvedValue(0);
      ProductRepository.hardDelete.mockResolvedValue({ id: 1, code: 'SP001' });

      const result = await ProductService.delete(1, 99);

      expect(ProductRepository.hardDelete).toHaveBeenCalledWith(1);
      expect(ProductRepository.softDelete).not.toHaveBeenCalled();
      expect(result).toEqual({ deleted: true, type: 'hard' });
    });

    it('UT-PROD-DEL-002: Soft delete — đã có giao dịch', async () => {
      ProductRepository.findById.mockResolvedValue({ id: 1, stock: 0 });
      ProductRepository.countTransactions.mockResolvedValue(5);
      ProductRepository.softDelete.mockResolvedValue({ id: 1, code: 'SP001' });

      const result = await ProductService.delete(1, 99);

      expect(ProductRepository.softDelete).toHaveBeenCalledWith(1, 99);
      expect(ProductRepository.hardDelete).not.toHaveBeenCalled();
      expect(result).toEqual({ deleted: true, type: 'soft' });
    });

    it('UT-PROD-DEL-003: Soft delete — có giao dịch và stock > 0', async () => {
      ProductRepository.findById.mockResolvedValue({ id: 1, stock: 20 });
      ProductRepository.countTransactions.mockResolvedValue(3);
      ProductRepository.softDelete.mockResolvedValue({ id: 1, code: 'SP001' });

      const result = await ProductService.delete(1, 99);

      expect(ProductRepository.softDelete).toHaveBeenCalledWith(1, 99);
      expect(result).toEqual({ deleted: true, type: 'soft' });
    });

    it('UT-PROD-DEL-004: Sp không tồn tại', async () => {
      ProductRepository.findById.mockResolvedValue(null);

      await expect(ProductService.delete(9999, 99)).rejects.toThrowError('Product not found');
    });
  });
});
