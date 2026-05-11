import { Forbidden } from '../utils/AppError.js';

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user?.role))
      return next(Forbidden('Bạn không có quyền truy cập'));
    next();
  };
}
