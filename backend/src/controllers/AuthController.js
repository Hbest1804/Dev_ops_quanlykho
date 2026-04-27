import { AuthService } from '../services/AuthService.js';
import { BadRequest } from '../utils/AppError.js';

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
