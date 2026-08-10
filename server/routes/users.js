import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, run } from '../db.js';
import { authenticateToken, requireRole, canManageUser, getTeamAdminId } from '../middleware/auth.js';
import { cacheClear } from '../cache.js';

const router = express.Router();

// ─── Helper: Generate a memorable temporary password ───
const generateTempPassword = () => {
  const words = ['Farm', 'Crop', 'Soil', 'Rain', 'Seed', 'Leaf', 'Root', 'Field'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const symbols = ['@', '#', '!', '$'];
  const sym = symbols[Math.floor(Math.random() * symbols.length)];
  return `${word}${sym}${num}`;
};



// ─── GET /api/users ─── List users scoped by role
router.get('/', authenticateToken, requireRole('admin', 'coadmin', 'manager', 'viewer', 'superadmin'), async (req, res) => {
  try {
    let users;
    if (req.user.role === 'superadmin') {
      users = await query(
        `SELECT id, username, name, role, mobile, status, admin_id, must_change_password, locked_by_user_id, locked_at, created_at, updated_at
         FROM users ORDER BY created_at DESC LIMIT 200`
      );
    } else {
      // Admin: their team has admin_id = their own ID
      // Co-Admin / Manager / Viewer: their team has admin_id = their parent Admin's ID
      const teamAdminId = getTeamAdminId(req.user);
      users = await query(
        `SELECT id, username, name, role, mobile, status, admin_id, must_change_password, locked_by_user_id, locked_at, created_at, updated_at
         FROM users WHERE admin_id = ? OR id = ?
         ORDER BY created_at DESC`,
        [teamAdminId, teamAdminId]
      );
    }

    return res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// ─── POST /api/users ─── Create new team member (Co-Admin, Manager, Viewer)
router.post('/', authenticateToken, requireRole('admin', 'coadmin', 'superadmin'), async (req, res) => {
  const { username, name, password, mobile, role } = req.body;

  if (!username || !name || !password) {
    return res.status(400).json({ success: false, message: 'Username, name, and password are required' });
  }

  const allowedRoles = ['admin', 'coadmin', 'manager', 'viewer', 'surveyor'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ success: false, message: `Invalid role. Allowed: ${allowedRoles.join(', ')}` });
  }

  // Only superadmin can create admins
  if (role === 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Only SuperAdmin can create Admin accounts' });
  }

  try {
    const existing = await query('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: `Username "${username.trim()}" already exists` });
    }

    const passwordHash = await bcrypt.hash(password.trim(), 10);
    const adminId = getTeamAdminId(req.user);

    const result = await run(
      'INSERT INTO users (username, password_hash, name, role, mobile, admin_id, status) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
      [username.trim(), passwordHash, name.trim(), role, mobile || '', adminId, 'active']
    );

    cacheClear();
    return res.status(201).json({ success: true, message: `${role} account created successfully`, data: { id: result.lastID } });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

// ─── POST /api/users/:id/reset-password ─── Generate temp password
router.post('/:id/reset-password', authenticateToken, requireRole('admin', 'coadmin', 'superadmin'), async (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  try {
    const users = await query('SELECT * FROM users WHERE id = ?', [targetId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const targetUser = users[0];

    // ─── Permission check ───
    if (!canManageUser(req.user, targetUser)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to reset this user\'s password' });
    }

    // Generate temp password — return once, never store in plaintext
    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    await run(
      'UPDATE users SET password_hash = ?, must_change_password = true, updated_at = NOW() WHERE id = ?',
      [hash, targetId]
    );

    // Log the action
    await run(
      `INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)`,
      [req.user.id, 'PASSWORD_RESET', `Reset password for user ID: ${targetId} (${targetUser.name})`, req.ip || '']
    );

    cacheClear();
    return res.json({
      success: true,
      message: 'Temporary password generated. Share this with the user securely.',
      data: {
        temporaryPassword: tempPassword,
        userName: targetUser.name,
        mustChange: true,
      },
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

// ─── POST /api/users/:id/toggle-lock ─── Lock or Unlock account
router.post('/:id/toggle-lock', authenticateToken, requireRole('admin', 'coadmin', 'superadmin'), async (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  if (targetId === req.user.id) {
    return res.status(400).json({ success: false, message: 'You cannot lock your own account' });
  }

  try {
    const users = await query('SELECT * FROM users WHERE id = ?', [targetId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const targetUser = users[0];

    // ─── Permission check ───
    if (!canManageUser(req.user, targetUser)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to lock/unlock this user' });
    }

    if (targetUser.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot lock SuperAdmin account' });
    }

    const newStatus = targetUser.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'inactive' ? 'ACCOUNT_LOCKED' : 'ACCOUNT_UNLOCKED';

    // Update status + audit columns (keep history of last lock/unlock actor)
    await run(
      `UPDATE users SET status = ?, locked_by_user_id = ?, locked_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [newStatus, req.user.id, targetId]
    );

    // Invalidate all refresh tokens for this user if locking
    if (newStatus === 'inactive') {
      await run('DELETE FROM refresh_tokens WHERE user_id = ?', [targetId]);
    }

    // Log the action
    await run(
      `INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)`,
      [req.user.id, action, `${action} for user ID: ${targetId} (${targetUser.name})`, req.ip || '']
    );

    cacheClear();
    return res.json({
      success: true,
      message: newStatus === 'inactive' ? `🔒 ${targetUser.name}'s account has been locked` : `🔓 ${targetUser.name}'s account has been unlocked`,
      data: { status: newStatus },
    });
  } catch (err) {
    console.error('Toggle lock error:', err);
    res.status(500).json({ success: false, message: 'Failed to toggle account lock' });
  }
});

// ─── GET /api/users/:id ─── Get user profile
router.get('/:id', authenticateToken, requireRole('admin', 'coadmin', 'manager', 'viewer', 'superadmin'), async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  try {
    const users = await query(
      `SELECT u.id, u.username, u.name, u.role, u.mobile, u.status, u.admin_id,
              u.must_change_password, u.locked_at, u.created_at, u.updated_at,
              locker.name as locked_by_name
       FROM users u
       LEFT JOIN users locker ON locker.id = u.locked_by_user_id
       WHERE u.id = ?`,
      [targetId]
    );
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    const targetUser = users[0];

    if (!canManageUser(req.user, targetUser)) {
      return res.status(403).json({ success: false, message: 'Access denied: cannot view user outside your team' });
    }

    return res.json({ success: true, data: targetUser });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

// ─── GET /api/users/:id/devices ─── List active device sessions
router.get('/:id/devices', authenticateToken, async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (req.user.id !== targetId && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  try {
    const devices = await query(
      `SELECT id, device_info, ip_address, expires_at, created_at
       FROM refresh_tokens WHERE user_id = ? AND expires_at > NOW() ORDER BY created_at DESC`,
      [targetId]
    );
    return res.json({ success: true, data: devices });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch devices' });
  }
});

// ─── DELETE /api/users/:id/devices/all ─── Logout all devices
router.delete('/:id/devices/all', authenticateToken, async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (req.user.id !== targetId && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  try {
    await run('DELETE FROM refresh_tokens WHERE user_id = ?', [targetId]);
    return res.json({ success: true, message: 'All devices logged out successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to logout all devices' });
  }
});

export default router;
