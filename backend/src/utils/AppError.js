export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

export const BadRequest  = (msg) => new AppError(msg, 400);
export const Unauthorized= (msg) => new AppError(msg, 401);
export const Forbidden   = (msg) => new AppError(msg, 403);
export const NotFound    = (msg) => new AppError(msg, 404);
