/**
 * Central error-handling middleware.
 * Must be registered AFTER all routes in app.js.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const isDev  = process.env.NODE_ENV === 'development';

  console.error(`[ERROR] ${req.method} ${req.originalUrl} → ${err.message}`);

  res.status(status).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(isDev && { stack: err.stack }),
    },
  });
}

module.exports = errorHandler;
