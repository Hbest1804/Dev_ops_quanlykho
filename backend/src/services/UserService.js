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

    const { password: _pw, ...safe } = user;
    return safe;
  },
};
