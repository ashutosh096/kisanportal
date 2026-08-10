import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query, run } from '../db.js';
import { JWT_SECRET, authenticateToken, requireRole, canManageUser } from '../middleware/auth.js';
import { loginLimiter, signupLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// ─── Helper: Issue access + refresh tokens ───
const issueTokens = async (user, deviceInfo, ipAddress) => {
  const accessToken = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      admin_id: user.admin_id,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshTokenRaw = crypto.randomBytes(64).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await run(
    `INSERT INTO refresh_tokens (user_id, token_hash, device_info, ip_address, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [user.id, refreshTokenHash, deviceInfo || 'Unknown Device', ipAddress || '', expiresAt]
  );

  return { accessToken, refreshTokenRaw };
};

// ─── POST /api/auth/login ─── Rate-limited login with status & must_change_password checks
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password, expected_role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  try {
    const cleanInput = (username || '').trim();
    const users = await query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER(?)',
      [cleanInput]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const user = users[0];

    // ─── Check if account is locked ───
    if (user.status === 'inactive' || user.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been locked. Contact your Admin or SuperAdmin.',
        error: { code: 'ACCOUNT_LOCKED' },
      });
    }

    // ─── Role validation ───
    if (expected_role && user.role !== expected_role) {
      if (expected_role === 'surveyor' && !['surveyor'].includes(user.role)) {
        return res.status(401).json({ success: false, message: 'Invalid credentials for Surveyor login' });
      }
      if (expected_role === 'admin' && ['surveyor'].includes(user.role)) {
        return res.status(401).json({ success: false, message: 'Invalid credentials for Admin login' });
      }
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const deviceInfo = req.headers['user-agent']?.substring(0, 150) || 'Unknown';
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
    const { accessToken, refreshTokenRaw } = await issueTokens(user, deviceInfo, ipAddress);

    // Log audit (non-blocking)
    try {
      await run(
        `INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)`,
        [user.id, 'LOGIN', `Role: ${user.role}`, ipAddress]
      );
    } catch (auditErr) {
      console.warn('Audit log write skipped:', auditErr.message);
    }

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', refreshTokenRaw, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/api/auth',
    });

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        mustChangePassword: user.must_change_password,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          admin_id: user.admin_id,
          status: user.status,
        },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// ─── POST /api/auth/refresh ─── Refresh token rotation
router.post('/refresh', async (req, res) => {
  const rawToken = req.cookies?.refreshToken;
  if (!rawToken) {
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokens = await query(
      `SELECT rt.*, u.* FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token_hash = ? AND rt.expires_at > NOW()`,
      [tokenHash]
    );

    if (tokens.length === 0) {
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token. Please login again.' });
    }

    const record = tokens[0];

    // ─── Check account is still active ───
    if (record.status !== 'active') {
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(403).json({ success: false, message: 'Account is locked.' });
    }

    // ─── Rotate: delete old token, issue new one ───
    await run('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);

    const user = {
      id: record.user_id || record.id,
      username: record.username,
      role: record.role,
      name: record.name,
      admin_id: record.admin_id,
      token_version: record.token_version,
    };

    const deviceInfo = req.headers['user-agent']?.substring(0, 150) || 'Unknown';
    const ipAddress = req.ip || '';
    const { accessToken, refreshTokenRaw } = await issueTokens(user, deviceInfo, ipAddress);

    res.cookie('refreshToken', refreshTokenRaw, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    return res.json({
      success: true,
      data: { accessToken },
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ success: false, message: 'Server error during token refresh' });
  }
});

// ─── POST /api/auth/logout ─── Clear device session
router.post('/logout', async (req, res) => {
  const rawToken = req.cookies?.refreshToken;
  if (rawToken) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await run('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]).catch(() => {});
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  return res.json({ success: true, message: 'Logged out successfully' });
});

// ─── POST /api/auth/set-new-password ─── Forced password change after reset
router.post('/set-new-password', authenticateToken, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  try {
    const hash = await bcrypt.hash(newPassword, 10);
    await run(
      'UPDATE users SET password_hash = ?, must_change_password = false, updated_at = NOW() WHERE id = ?',
      [hash, req.user.id]
    );
    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update password' });
  }
});

// ─── GET /api/auth/me ─── Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const users = await query('SELECT id, username, name, role, mobile, admin_id, status FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: users[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/auth/admins-list ─── List admins for superadmin panel
router.get('/admins-list', authenticateToken, requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const admins = await query(
      `SELECT u.id, u.username, u.name, u.role, u.mobile, u.status, u.created_at,
              COUNT(DISTINCT s.id) as surveyors_count,
              COUNT(DISTINCT f.id) as registrations_count
       FROM users u
       LEFT JOIN users s ON s.admin_id = u.id AND s.role = 'surveyor'
       LEFT JOIN farmers f ON f.admin_id = u.id
       WHERE u.role IN ('admin','superadmin')
       GROUP BY u.id ORDER BY u.id ASC`
    );
    res.json(admins);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch admins list' });
  }
});

// ─── PUT /api/auth/users/:id ─── Edit user (scoped to team)
router.put('/users/:id', authenticateToken, requireRole('admin', 'coadmin', 'superadmin'), async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const { username, name, password, mobile, admin_id } = req.body;

  try {
    const existing = await query('SELECT * FROM users WHERE id = ?', [targetId]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    const targetUser = existing[0];

    if (!canManageUser(req.user, targetUser)) {
      return res.status(403).json({ success: false, message: 'Access denied: cannot manage users outside your team' });
    }

    const isSuper = req.user.role === 'superadmin';
    if (!isSuper && targetUser.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot modify SuperAdmin account' });
    }

    const newName = name ? name.trim() : targetUser.name;
    const newUsername = username ? username.trim() : targetUser.username;
    const newMobile = mobile !== undefined ? mobile : targetUser.mobile;

    if (password && password.trim()) {
      const cleanPass = password.trim();
      const passwordHash = await bcrypt.hash(cleanPass, 10);
      await run(
        'UPDATE users SET name = ?, username = ?, password_hash = ?, mobile = ?, updated_at = NOW() WHERE id = ?',
        [newName, newUsername, passwordHash, newMobile, targetId]
      );
    } else {
      await run(
        'UPDATE users SET name = ?, username = ?, mobile = ?, updated_at = NOW() WHERE id = ?',
        [newName, newUsername, newMobile, targetId]
      );
    }

    return res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

// ─── DELETE /api/auth/users/:id ─── Soft-delete (set inactive) instead of hard delete
router.delete('/users/:id', authenticateToken, requireRole('admin', 'coadmin', 'superadmin'), async (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  if (targetId === req.user.id) {
    return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
  }

  try {
    const existing = await query('SELECT * FROM users WHERE id = ?', [targetId]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    const targetUser = existing[0];

    if (!canManageUser(req.user, targetUser)) {
      return res.status(403).json({ success: false, message: 'Access denied: cannot manage users outside your team' });
    }

    if (targetUser.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot delete SuperAdmin account' });
    }

    // Soft-delete instead of hard delete to preserve data integrity
    await run(
      'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
      ['inactive', targetId]
    );

    return res.json({ success: true, message: 'User account deactivated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to deactivate user' });
  }
});

export default router;
