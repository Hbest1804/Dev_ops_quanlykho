import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/UserRepository.js');
vi.mock('bcrypt');

import { UserRepository } from '../repositories/UserRepository.js';
import bcrypt from 'bcrypt';
import { UserService } from '../services/UserService.js';
import { UserController } from '../controllers/UserController.js';

const mockCreated = {
  id: 5,
  name: 'Huy',
  email: 'huy@x.com',
  role: 'admin',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

function mockRes() {
  const res = {};
  res.status     = vi.fn().mockReturnValue(res);
  res.json       = vi.fn().mockReturnValue(res);
  return res;
}

function mockReq(body = {}) {
  return { body };
}

// ── UserService.create ────────────────────────────────────────
describe('UserService.create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('UT-USR-CREATE-001 | tạo user thành công', async () => {
    UserRepository.findByEmail.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashed_password');
    UserRepository.create.mockResolvedValue({ ...mockCreated });

    const result = await UserService.create({
      name: 'Huy',
      email: 'huy@x.com',
      password: '12345678',
      role: 'admin',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('12345678', 10);
    expect(UserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'hashed_password' }),
    );
    expect(result).toMatchObject({ id: 5, name: 'Huy', email: 'huy@x.com', role: 'admin' });
  });

  it('UT-USR-CREATE-002 | email đã tồn tại → 409', async () => {
    UserRepository.findByEmail.mockResolvedValue(mockCreated);

    await expect(
      UserService.create({ name: 'Huy', email: 'huy@x.com', password: '12345678', role: 'admin' }),
    ).rejects.toMatchObject({ status: 409, message: 'Email already in use' });
  });

  it('UT-USR-CREATE-003 | role không hợp lệ → 400', async () => {
    await expect(
      UserService.create({ name: 'Huy', email: 'huy@x.com', password: '12345678', role: 'superadmin' }),
    ).rejects.toMatchObject({ status: 400, message: 'Role must be admin|warehouse_staff|accountant' });
  });

  it('UT-USR-CREATE-004 | password < 8 ký tự → 400', async () => {
    await expect(
      UserService.create({ name: 'Huy', email: 'huy@x.com', password: '1234', role: 'admin' }),
    ).rejects.toMatchObject({ status: 400, message: 'Password must be at least 8 characters' });
  });

  it('UT-USR-CREATE-005 | response không chứa field password', async () => {
    UserRepository.findByEmail.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashed_password');
    UserRepository.create.mockResolvedValue({ ...mockCreated, password: 'hashed_password' });

    const result = await UserService.create({
      name: 'Huy',
      email: 'huy@x.com',
      password: '12345678',
      role: 'admin',
    });

    expect(result).not.toHaveProperty('password');
  });
});

// ── UserController.create (validation layer) ──────────────────
describe('UserController.create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('thiếu required fields → 400', async () => {
    const req  = mockReq({ name: 'Huy', email: 'huy@x.com' });
    const res  = mockRes();
    const next = vi.fn();

    await UserController.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });
});
