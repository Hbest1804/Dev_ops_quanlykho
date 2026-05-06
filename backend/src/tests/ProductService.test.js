import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductService } from '../services/ProductService.js';
import { ProductRepository } from '../repositories/ProductRepository.js';
import { BadRequest, Conflict, NotFound } from '../utils/AppError.js';

// Mock dependencies
vi.mock('../repositories/ProductRepository.js', () => ({
  ProductRepository: {
    findAll: vi.fn(),
    count: vi.fn(),
    findById: vi.fn(),
    findByCode: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
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

    it.todo('UT-PROD-GETALL-004: Không trả về sản phẩm đã soft delete — pending thêm cột is_deleted vào schema');
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

      await expect(ProductService.create(payload)).rejects.toThrowError('code, name, category, unit và description là bắt buộc');
    });

    it('UT-PROD-CREATE-005: initialStock âm', async () => {
      const payload = { code: 'SP099', name: 'Test', category: 'A', unit: 'Cái', description: 'Mô tả test', initialStock: -5 };
      ProductRepository.findByCode.mockResolvedValue(null);

      await expect(ProductService.create(payload)).rejects.toThrowError('initialStock phải là số nguyên không âm');
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
});
