/**
 * @fileoverview Global error handling middleware for the Express app.
 * Returns sanitised errors in production and full details in development.
 * Attaches a unique X-Request-ID header to every error response.
 */

const crypto = require('crypto');

const ERROR_STATUS_MAP = {
  ValidationError: 400,
  UnauthorizedError: 401,
  ForbiddenError: 403,
  NotFoundError: 404,
};

const errorHandler = (err, req, res, _next) => {
  const requestId = crypto.randomUUID();
  const status =
    ERROR_STATUS_MAP[err.name] || err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const code = err.code || 'INTERNAL_ERROR';

  console.error(
    '[%s] %s %s → %d: %s',
    new Date().toISOString(),
    req.method,
    req.path,
    status,
    message
  );

  res.setHeader('X-Request-ID', requestId);

  if (process.env.NODE_ENV === 'production') {
    res.status(status).json({
      error: status >= 500 ? 'Something went wrong' : message,
      code,
      requestId,
    });
  } else {
    res.status(status).json({
      error: message,
      code,
      requestId,
      stack: err.stack,
    });
  }
};

module.exports = { errorHandler };
