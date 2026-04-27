import { AuthService } from '../services/AuthService.js';
import { BadRequest, Unauthorized, Forbidden } from '../utils/AppError.js';
import { UserRepository } from '../repositories/UserRepository.js';

const REFRESH_COOKIE = 'refreshToken';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

export const AuthController = {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc' });

      const { accessToken, refreshToken, user } = await AuthService.login(email, password, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);
      res.json({ accessToken, user });
    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      const user = await UserRepository.findById(req.user.sub);
      if (!user) return next(Unauthorized('Người dùng không tồn tại'));
      if (user.status === 'disabled') return next(Forbidden('Tài khoản đã bị vô hiệu hoá'));
      res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const raw = req.cookies?.[REFRESH_COOKIE];
      if (!raw) return next(BadRequest('Refresh token cookie missing'));

      await AuthService.logout(raw);

      res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'strict', path: '/' });
      res.json({ success: true, message: 'Logged out successfully', data: null });
    } catch (err) {
      next(err);
    }
  },
};
