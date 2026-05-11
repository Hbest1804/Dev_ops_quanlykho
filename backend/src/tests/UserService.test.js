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
