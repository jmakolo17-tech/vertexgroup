const rateLimit = require('express-rate-limit');

/**
 * Strict rate limiter for public form submission endpoints only.
 * Applied per-route so it never blocks authenticated admin dashboard calls.
 */
module.exports = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many submissions — please wait before trying again' },
});
