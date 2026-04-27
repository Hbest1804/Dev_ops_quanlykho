import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository.js';
import { RefreshTokenRepository } from '../repositories/RefreshTokenRepository.js';
import { Unauthorized, Forbidden } from '../utils/AppError.js';

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

  async logout(rawRefreshToken) {
    await RefreshTokenRepository.revoke(rawRefreshToken);
  },
};
