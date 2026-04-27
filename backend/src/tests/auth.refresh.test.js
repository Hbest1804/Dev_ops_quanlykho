import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/UserRepository.js');
vi.mock('../repositories/RefreshTokenRepository.js');
vi.mock('jsonwebtoken');

import { UserRepository } from '../repositories/UserRepository.js';
import { RefreshTokenRepository } from '../repositories/RefreshTokenRepository.js';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/AuthService.js';
import { AuthController } from '../controllers/AuthController.js';

const mockUser = { id: 1, name: 'Huy', email: 'huy@x.com', role: 'admin' };

const mockRecord = {
  id: 10,
  user_id: 1,
  token: 'hashed_old',
  is_revoked: false,
  replaced_by: null,
  expires_at: new Date(Date.now() + 86_400_000),
};

function mockRes() {
  const res = {};
  res.status      = vi.fn().mockReturnValue(res);
  res.json        = vi.fn().mockReturnValue(res);
  res.cookie      = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res;
}

function mockReq(cookies = {}) {
  return { cookies, headers: {}, ip: '127.0.0.1' };
}

// ── AuthService.refresh ───────────────────────────────────────
describe('AuthService.refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    jwt.sign.mockReturnValue('new.access.token');
  });

  it('UT-AUTH-REFRESH-001 | refresh thành công → rotation', async () => {
    RefreshTokenRepository.findValid.mockResolvedValue(mockRecord);
    UserRepository.findById.mockResolvedValue(mockUser);
    RefreshTokenRepository.rotate.mockResolvedValue('new-raw-token');

    const result = await AuthService.refresh('valid-raw-token');

    expect(RefreshTokenRepository.rotate).toHaveBeenCalledWith('valid-raw-token', 1, expect.any(Object));
    expect(result.accessToken).toBe('new.access.token');
    expect(result.refreshToken).toBe('new-raw-token');
  });

  it('UT-AUTH-REFRESH-002 | token hết hạn → 401', async () => {
    RefreshTokenRepository.findValid.mockResolvedValue(null);
    RefreshTokenRepository.findByRaw.mockResolvedValue({
      is_revoked: false,
      replaced_by: null,
      user_id: 1,
    });

    await expect(AuthService.refresh('expired-token'))
      .rejects.toMatchObject({ status: 401, message: 'Invalid or expired refresh token' });
  });

  it('UT-AUTH-REFRESH-003 | reuse attack → revoke all → 401', async () => {
    RefreshTokenRepository.findValid.mockResolvedValue(null);
    RefreshTokenRepository.findByRaw.mockResolvedValue({
      is_revoked: true,
      replaced_by: 'some-new-hash',
      user_id: 1,
    });
    RefreshTokenRepository.revokeAllForUser.mockResolvedValue();

    await expect(AuthService.refresh('stolen-old-token'))
      .rejects.toMatchObject({ status: 401, message: 'Token reuse detected. All sessions revoked.' });

    expect(RefreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(1);
  });

  it('UT-AUTH-REFRESH-005 | token không tồn tại trong DB → 401', async () => {
    RefreshTokenRepository.findValid.mockResolvedValue(null);
    RefreshTokenRepository.findByRaw.mockResolvedValue(null);

    await expect(AuthService.refresh('nonexistent-token'))
      .rejects.toMatchObject({ status: 401, message: 'Invalid or expired refresh token' });
  });
});

// ── AuthController.refresh ────────────────────────────────────
describe('AuthController.refresh', () => {
  beforeEach(() => vi.clearAllMocks());

  it('UT-AUTH-REFRESH-004 | không có cookie → 400', async () => {
    const req  = mockReq({});
    const res  = mockRes();
    const next = vi.fn();

    await AuthController.refresh(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 400, message: 'No refresh token cookie' }),
    );
  });

  it('cookie hợp lệ → set cookie mới + trả accessToken', async () => {
    RefreshTokenRepository.findValid.mockResolvedValue(mockRecord);
    UserRepository.findById.mockResolvedValue(mockUser);
    RefreshTokenRepository.rotate.mockResolvedValue('new-raw-token');
    jwt.sign.mockReturnValue('new.access.token');

    const req  = mockReq({ refreshToken: 'valid-raw-token' });
    const res  = mockRes();
    const next = vi.fn();

    await AuthController.refresh(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'new-raw-token',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { accessToken: 'new.access.token' },
    });
    expect(next).not.toHaveBeenCalled();
  });
});
