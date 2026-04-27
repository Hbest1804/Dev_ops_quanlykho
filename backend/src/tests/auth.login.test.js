import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── mock dependencies ──────────────────────────────────────────
vi.mock('../repositories/UserRepository.js');
vi.mock('../repositories/RefreshTokenRepository.js');
vi.mock('bcrypt');
vi.mock('jsonwebtoken');

import { UserRepository } from '../repositories/UserRepository.js';
import { RefreshTokenRepository } from '../repositories/RefreshTokenRepository.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/AuthService.js';
import { AuthController } from '../controllers/AuthController.js';

// ── helpers ───────────────────────────────────────────────────
const mockUser = {
  id: 1,
  name: 'Huy',
  email: 'huy@wareflow.com',
  password: '$2b$10$hashedpassword',
  role: 'admin',
  status: 'active',
};

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json   = vi.fn().mockReturnValue(res);
  return res;
}

function mockReq(body = {}) {
  return { body, headers: {}, ip: '127.0.0.1' };
}

// ── AuthService unit tests ────────────────────────────────────
describe('AuthService.login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    jwt.sign.mockReturnValue('mock.access.token');
    RefreshTokenRepository.create.mockResolvedValue('mock-refresh-token');
  });

  it('UT-AUTH-LOGIN-001 | đăng nhập thành công', async () => {
    UserRepository.findByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);

    const result = await AuthService.login('huy@wareflow.com', 'correct123');

    expect(result.accessToken).toBe('mock.access.token');
    expect(result.refreshToken).toBe('mock-refresh-token');
    expect(result.user).toMatchObject({ id: 1, name: 'Huy', email: 'huy@wareflow.com', role: 'admin' });
  });

  it('UT-AUTH-LOGIN-002 | email không tồn tại → 401', async () => {
    UserRepository.findByEmail.mockResolvedValue(null);

    await expect(AuthService.login('notexist@x.com', 'any'))
      .rejects.toMatchObject({ status: 401, message: 'Email hoặc mật khẩu không đúng' });
  });

  it('UT-AUTH-LOGIN-003 | mật khẩu sai → 401', async () => {
    UserRepository.findByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    await expect(AuthService.login('huy@wareflow.com', 'wrongpass'))
      .rejects.toMatchObject({ status: 401, message: 'Email hoặc mật khẩu không đúng' });
  });

  it('UT-AUTH-LOGIN-004 | tài khoản bị khóa → 403', async () => {
    UserRepository.findByEmail.mockResolvedValue({ ...mockUser, status: 'disabled' });

    await expect(AuthService.login('huy@wareflow.com', 'correct123'))
      .rejects.toMatchObject({ status: 403, message: 'Tài khoản đã bị vô hiệu hoá' });
  });
});

// ── AuthController unit tests (validation layer) ──────────────
describe('AuthController.login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('UT-AUTH-LOGIN-005 | thiếu email → 400', async () => {
    const req = mockReq({ password: '123456' });
    const res = mockRes();

    await AuthController.login(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email và mật khẩu là bắt buộc' });
  });

  it('UT-AUTH-LOGIN-006 | thiếu password → 400', async () => {
    const req = mockReq({ email: 'huy@x.com' });
    const res = mockRes();

    await AuthController.login(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email và mật khẩu là bắt buộc' });
  });
});
