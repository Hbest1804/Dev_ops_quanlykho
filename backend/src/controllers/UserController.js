import { UserService } from '../services/UserService.js';

export const UserController = {
  async list(_req, res, next) {
    try {
      const users = await UserService.findAll();
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password || !role)
        return res.status(400).json({ success: false, message: 'name, email, password và role là bắt buộc', data: null });

      const user = await UserService.create({ name, email, password, role });
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },
};
