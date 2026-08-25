import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });
export const signupLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });
export const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 100 });


