import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../services/UserService.js';
import { UserRepository } from '../repositories/UserRepository.js';
import bcrypt from 'bcrypt';

vi.mock('../repositories/UserRepository.js');
vi.mock('bcrypt');

describe('UserService.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('UT-USER-UPDATE-001 | cập nhật thành công (không đổi email)', async () => {
    const userId = 1;
    const mockUser = { id: userId, email: 'old@a.a', name: 'Old Name' };
    UserRepository.findById.mockResolvedValue(mockUser);
    UserRepository.update.mockResolvedValue({ ...mockUser, name: 'New Name' });

    const result = await UserService.update(userId, { name: 'New Name' });

    expect(result.name).toBe('New Name');
    expect(UserRepository.update).toHaveBeenCalledWith(userId, expect.objectContaining({ name: 'New Name' }));
  });

  it('UT-USER-UPDATE-002 | lỗi khi email đã tồn tại', async () => {
    const userId = 1;
    UserRepository.findById.mockResolvedValue({ id: userId, email: 'old@a.a' });
    UserRepository.findByEmail.mockResolvedValue({ id: 99, email: 'taken@a.a' });

    await expect(UserService.update(userId, { email: 'taken@a.a' }))
      .rejects.toMatchObject({ status: 409, message: 'Email already in use' });
  });

  it('UT-USER-UPDATE-003 | đổi mật khẩu thành công', async () => {
    const userId = 1;
    UserRepository.findById.mockResolvedValue({ id: userId });
    bcrypt.hash.mockResolvedValue('hashed_new_pass');
    UserRepository.update.mockResolvedValue({ id: userId });

    await UserService.update(userId, { password: 'newpassword123' });

    expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
    expect(UserRepository.update).toHaveBeenCalledWith(userId, expect.objectContaining({ password: 'hashed_new_pass' }));
  });
});

describe('UserService.toggleStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('UT-USR-TOGGLE-001 | Khóa tài khoản active', async () => {
    UserRepository.findById.mockResolvedValue({ id: 5, status: 'active' });
    UserRepository.updateStatus.mockResolvedValue({
      id: 5,
      name: 'User',
      email: 'user@example.com',
      role: 'warehouse_staff',
      status: 'disabled',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    });

    const result = await UserService.toggleStatus(5, 1);

    expect(result).toMatchObject({ id: 5, status: 'disabled', updated_at: '2026-01-02T00:00:00.000Z' });
    expect(UserRepository.updateStatus).toHaveBeenCalledWith(5, 'disabled');
  });

  it('UT-USR-TOGGLE-002 | Mở khóa tài khoản disabled', async () => {
    UserRepository.findById.mockResolvedValue({ id: 5, status: 'disabled' });
    UserRepository.updateStatus.mockResolvedValue({
      id: 5,
      name: 'User',
      email: 'user@example.com',
      role: 'warehouse_staff',
      status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    });

    const result = await UserService.toggleStatus(5, 1);

    expect(result).toMatchObject({ id: 5, status: 'active', updated_at: '2026-01-02T00:00:00.000Z' });
    expect(UserRepository.updateStatus).toHaveBeenCalledWith(5, 'active');
  });

  it('UT-USR-TOGGLE-003 | Admin tự khóa chính mình', async () => {
    await expect(UserService.toggleStatus(5, 5))
      .rejects.toMatchObject({ status: 422, message: 'Cannot disable your own account' });

    expect(UserRepository.findById).not.toHaveBeenCalled();
    expect(UserRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('UT-USR-TOGGLE-004 | User không tồn tại', async () => {
    UserRepository.findById.mockResolvedValue(null);

    await expect(UserService.toggleStatus(404, 1))
      .rejects.toMatchObject({ status: 404, message: 'User not found' });

    expect(UserRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('UT-USR-TOGGLE-005 | ID không hợp lệ', async () => {
    await expect(UserService.toggleStatus('abc', 1))
      .rejects.toMatchObject({ status: 400, message: 'Invalid user ID' });

    expect(UserRepository.findById).not.toHaveBeenCalled();
    expect(UserRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('UT-USR-TOGGLE-006 | User bị xóa trước khi update status', async () => {
    UserRepository.findById.mockResolvedValue({ id: 5, status: 'active' });
    UserRepository.updateStatus.mockResolvedValue(null);

    await expect(UserService.toggleStatus(5, 1))
      .rejects.toMatchObject({ status: 404, message: 'User not found' });
  });
});
