import { AuthService } from '../services/AuthService.js';

export const AuthController = {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc' });

      const result = await AuthService.login(email, password, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
