import rateLimit from 'express-rate-limit';

// ─── Login Rate Limiter: Max 5 attempts per 15 min per IP ───
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      details: 'Too many failed login attempts from this device. Please try again after 15 minutes.',
    },
    message: 'Too many failed login attempts. Please try again after 15 minutes.',
  },
});

// ─── Signup / Create User Rate Limiter: Max 5 per 15 min per IP ───
export const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      details: 'Too many account creation attempts from this device. Please try again after 15 minutes.',
    },
    message: 'Too many signup attempts. Please try again after 15 minutes.',
  },
});

// ─── General API Rate Limiter: 200 req/min per IP ───
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'API_RATE_LIMIT', details: 'Too many requests. Slow down.' },
    message: 'Too many requests.',
  },
});
