/**
 * CareerAI Mentor — Rate Limiting Middleware
 * Prevents API abuse and accidental quota depletion.
 */

const rateLimit = require('express-rate-limit');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000; // 15 mins
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100;

const apiLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP address. Please wait a few minutes before trying again.',
    retryAfterMinutes: Math.round(windowMs / 60000)
  }
});

module.exports = {
  apiLimiter
};
