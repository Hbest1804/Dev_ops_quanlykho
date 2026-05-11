import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/UserRepository.js';
import { BadRequest, Conflict } from '../utils/AppError.js';

const VALID_ROLES = ['admin', 'warehouse_staff', 'accountant'];

export const UserService = {
  async findAll() {
    return UserRepository.findAll();
  },

  async create({ name, email, password, role }) {
    if (!password || password.length < 8)
      throw BadRequest('Password must be at least 8 characters');

    if (!VALID_ROLES.includes(role))
      throw BadRequest('Role must be admin|warehouse_staff|accountant');

    const existing = await UserRepository.findByEmail(email);
    if (existing) throw Conflict('Email already in use');

    const hash = await bcrypt.hash(password, 10);
    const user = await UserRepository.create({ name, email, password: hash, role });

    const { password: _password, ...safe } = user;
    return safe;
  },

  async update(id, { name, email, password, role, status }) {
    const user = await UserRepository.findById(id);
    if (!user) throw BadRequest('User not found');

    if (email) {
      const existing = await UserRepository.findByEmail(email);
      if (existing && existing.id !== Number(id)) {
        throw Conflict('Email already in use');
      }
    }

    if (role && !VALID_ROLES.includes(role)) {
      throw BadRequest('Role must be admin|warehouse_staff|accountant');
    }

    const updateData = { name, email, role, status };
    if (password) {
      if (password.length < 8) throw BadRequest('Password must be at least 8 characters');
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updated = await UserRepository.update(id, updateData);
    const { password: _password, ...safe } = updated;
    return safe;
  },
};
