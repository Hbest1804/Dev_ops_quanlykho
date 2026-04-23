export function notFound(req, res, next) {
  res.status(404).json({ message: `Not found: ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
