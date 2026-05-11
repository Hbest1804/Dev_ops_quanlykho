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

  async refresh(req, res, next) {
    try {
      const raw = req.cookies?.[REFRESH_COOKIE];
      if (!raw) return next(BadRequest('No refresh token cookie'));

      const { accessToken, refreshToken } = await AuthService.refresh(raw, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);
      res.json({ success: true, data: { accessToken } });
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

  /** User tự đổi mật khẩu (cần xác minh mật khẩu hiện tại) */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      // [Review] Dùng next(BadRequest) để đi qua global errorHandler, nhất quán với các controller khác
      if (!currentPassword) return next(BadRequest('currentPassword là bắt buộc'));
      if (!newPassword)     return next(BadRequest('newPassword là bắt buộc'));

      await AuthService.changePassword(req.user.sub, currentPassword, newPassword);

      // Xoá cookie refresh → bắt đăng nhập lại
      res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'strict', path: '/' });
      res.json({ success: true, message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' });
    } catch (err) {
      next(err);
    }
  },

  /** Admin reset mật khẩu của user bất kỳ (không cần mật khẩu cũ) */
  async resetPassword(req, res, next) {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;
      // [Review] Dùng next(BadRequest) để đi qua global errorHandler, nhất quán với các controller khác
      if (!newPassword) return next(BadRequest('newPassword là bắt buộc'));

      await AuthService.resetPassword(userId, newPassword);
      res.json({ success: true, message: 'Reset mật khẩu thành công. Người dùng cần đăng nhập lại.' });
    } catch (err) {
      next(err);
    }
  },
};

