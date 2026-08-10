/**
 * CSRF Protection Middleware
 *
 * Strategy: Double-Submit Cookie pattern (no session required)
 * 1. On every GET/login, server sets a csrf_token cookie (non-httpOnly so JS can read it)
 * 2. On state-changing requests, client must include the same token in X-CSRF-Token header
 * 3. Middleware verifies header value matches cookie value
 *
 * This is safe because cross-origin JS cannot read cookies from another origin,
 * so an attacker's page cannot read the cookie to include it in the header.
 *
 * NOTE: This ONLY applies to non-GET requests. GET requests must be read-only (they are).
 */

import crypto from 'crypto';

export const csrfSetCookie = (req, res, next) => {
  // Generate a CSRF token and set it in a readable cookie (non-httpOnly)
  if (!req.cookies?.csrf_token) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf_token', token, {
      httpOnly: false,     // Intentionally readable by JS so it can set X-CSRF-Token header
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }
  next();
};

export const csrfProtection = (req, res, next) => {
  // Skip safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const cookieToken = req.cookies?.csrf_token;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token mismatch. Request rejected.',
      error: { code: 'CSRF_VIOLATION' },
    });
  }
  next();
};
