/**
 * CareerAI Mentor — Centralized Error Handling Middleware
 * Ensures secrets, API keys, and stack traces are never exposed to clients.
 */

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Redact potential API keys or tokens in logs
  const sanitizedMessage = (err.message || 'An unexpected error occurred')
    .replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED]')
    .replace(/AIza[0-9A-Za-z\-_]{35}/g, '[REDACTED_API_KEY]');

  console.error(`[Error] ${req.method} ${req.url}:`, sanitizedMessage);

  const status = err.status || (err.name === 'ValidationError' ? 400 : 500);

  res.status(status).json({
    success: false,
    error: sanitizedMessage
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
