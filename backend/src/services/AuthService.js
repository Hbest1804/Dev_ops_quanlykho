import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository.js';
import { RefreshTokenRepository } from '../repositories/RefreshTokenRepository.js';
import { Unauthorized, Forbidden, BadRequest, NotFound } from '../utils/AppError.js';

const ACCESS_TOKEN_TTL = '15m';

function signAccess(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

export const AuthService = {
  async login(email, password, meta = {}) {
    const user = await UserRepository.findByEmail(email);
    if (!user) throw Unauthorized('Email hoặc mật khẩu không đúng');

    if (user.status === 'disabled')
      throw Forbidden('Tài khoản đã bị vô hiệu hoá');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw Unauthorized('Email hoặc mật khẩu không đúng');

    const accessToken  = signAccess(user);
    const refreshToken = await RefreshTokenRepository.create(user.id, meta);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  },

  async refresh(rawToken, meta = {}) {
    const record = await RefreshTokenRepository.findValid(rawToken);

    if (!record) {
      const any = await RefreshTokenRepository.findByRaw(rawToken);
      if (any?.is_revoked && any.replaced_by) {
        await RefreshTokenRepository.revokeAllForUser(any.user_id);
        throw Unauthorized('Token reuse detected. All sessions revoked.');
      }
      throw Unauthorized('Invalid or expired refresh token');
    }

    const user       = await UserRepository.findById(record.user_id);
    const newRaw     = await RefreshTokenRepository.rotate(rawToken, record.user_id, meta);
    const accessToken = signAccess(user);

    return { accessToken, refreshToken: newRaw };
  },

  async logout(rawRefreshToken) {
    await RefreshTokenRepository.revoke(rawRefreshToken);
  },

  /**
   * User tự đổi mật khẩu (yêu cầu xác minh mật khẩu hiện tại)
   */
  async changePassword(userId, currentPassword, newPassword) {
    if (!newPassword || newPassword.length < 8)
      throw BadRequest('Mật khẩu mới phải có ít nhất 8 ký tự');

    const user = await UserRepository.findByIdWithPassword(userId);
    if (!user) throw NotFound('Người dùng không tồn tại');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw BadRequest('Mật khẩu hiện tại không đúng');

    const hash = await bcrypt.hash(newPassword, 10);
    await UserRepository.update(userId, { password: hash });

    // Thu hồi tất cả refresh token → bắt đăng nhập lại
    await RefreshTokenRepository.revokeAllForUser(userId);
  },

  /**
   * Admin reset mật khẩu của user bất kỳ (không cần mật khẩu cũ)
   */
  async resetPassword(targetUserId, newPassword) {
    if (!newPassword || newPassword.length < 8)
      throw BadRequest('Mật khẩu mới phải có ít nhất 8 ký tự');

    const user = await UserRepository.findById(targetUserId);
    if (!user) throw NotFound('Người dùng không tồn tại');

    const hash = await bcrypt.hash(newPassword, 10);
    await UserRepository.update(targetUserId, { password: hash });

    // Thu hồi tất cả refresh token → bắt đăng nhập lại
    await RefreshTokenRepository.revokeAllForUser(targetUserId);
  },
};
