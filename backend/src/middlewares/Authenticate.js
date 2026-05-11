import jwt from 'jsonwebtoken';
import { Unauthorized } from '../utils/AppError.js';

export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return next(Unauthorized('Access token required'));

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(Unauthorized('Invalid or expired access token'));
  }
}
