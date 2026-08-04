import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, run } from '../db.js';
import { JWT_SECRET, authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/auth/surveyors-list - Public list of surveyors for 1-tap selection on login page
router.get('/surveyors-list', async (req, res) => {
  try {
    const surveyors = await query(
      "SELECT id, username, name, role FROM users WHERE role = 'surveyor' ORDER BY id ASC, username ASC"
    );
    res.json(surveyors);
  } catch (err) {
    console.error('Fetch public surveyors list error:', err);
    res.status(500).json({ error: 'Failed to fetch surveyors list' });
  }
});

// POST /api/auth/surveyor-quick-login - 1-tap login for selected surveyor
router.post('/surveyor-quick-login', async (req, res) => {
  const { surveyor_id } = req.body;
  if (!surveyor_id) {
    return res.status(400).json({ error: 'Surveyor ID is required' });
  }

  try {
    const users = await query("SELECT * FROM users WHERE id = ? AND role = 'surveyor'", [surveyor_id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Surveyor not found' });
    }

    const user = users[0];

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Surveyor quick login error:', err);
    res.status(500).json({ error: 'Server error during quick login' });
  }
});

// POST /api/auth/login - Admin/Surveyor login with strict role validation
router.post('/login', async (req, res) => {
  const { username, password, expected_role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const cleanInput = (username || '').trim();
    const users = await query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(name) = LOWER(?)',
      [cleanInput, cleanInput]
    );
    if (users.length === 0) {
      return res.status(401).json({
        error: expected_role === 'surveyor'
          ? 'Invalid username or password for Surveyor login'
          : 'Invalid username or password for Admin login'
      });
    }

    const user = users[0];

    // Strict Role Validation: Surveyor tab only logs in surveyor, Admin tab only logs in admin
    if (expected_role && user.role !== expected_role) {
      return res.status(401).json({
        error: expected_role === 'surveyor'
          ? 'Invalid username or password for Surveyor login'
          : 'Invalid username or password for Admin login'
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({
        error: expected_role === 'surveyor'
          ? 'Invalid username or password for Surveyor login'
          : 'Invalid username or password for Admin login'
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/auth/admins-list - List all company admins with team counts
router.get('/admins-list', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const admins = await query(
      `SELECT u.id, u.username, u.name, u.role, u.mobile, u.raw_passkey, u.created_at,
              COUNT(DISTINCT s.id) as surveyors_count,
              COUNT(DISTINCT f.id) as registrations_count
       FROM users u
       LEFT JOIN users s ON s.admin_id = u.id AND s.role = 'surveyor'
       LEFT JOIN farmers f ON f.surveyor_id = s.id OR LOWER(f.surveyor_name) = LOWER(u.name)
       WHERE u.role = 'admin' OR LOWER(u.username) = 'superadmin'
       GROUP BY u.id, u.username, u.name, u.role, u.mobile, u.raw_passkey, u.created_at
       ORDER BY u.id ASC`
    );
    res.json(admins);
  } catch (err) {
    console.error('Fetch admins list error:', err);
    res.status(500).json({ error: 'Failed to fetch admins list' });
  }
});

// POST /api/auth/add-admin - Add new company admin account
router.post('/add-admin', authenticateToken, requireRole('admin'), async (req, res) => {
  const { username, name, password, mobile } = req.body;
  if (!username || !name) {
    return res.status(400).json({ error: 'Username and name are required' });
  }

  const cleanUsername = (username || '').trim();
  const cleanName = (name || '').trim();
  const finalPasskey = (password && password.trim()) ? password.trim() : 'admin123';

  try {
    const existing = await query('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [cleanUsername]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Username "${cleanUsername}" already exists` });
    }

    const passwordHash = await bcrypt.hash(finalPasskey, 10);
    await run(
      "INSERT INTO users (username, password_hash, name, role, mobile, raw_passkey) VALUES (?, ?, ?, 'admin', ?, ?)",
      [cleanUsername, passwordHash, cleanName, mobile || '', finalPasskey]
    );

    res.status(201).json({ message: 'Company Admin created successfully' });
  } catch (err) {
    console.error('Add admin error:', err);
    res.status(500).json({ error: 'Failed to create Company Admin' });
  }
});

// PUT /api/auth/users/:id - Edit username, password, name, mobile, admin_id for admin or surveyor
router.put('/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const { username, name, password, mobile, admin_id } = req.body;

  try {
    const existing = await query('SELECT * FROM users WHERE id = ?', [targetId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const targetUser = existing[0];

    const isSuper = req.user.username === 'superadmin' || req.user.role === 'superadmin';
    if (!isSuper && targetUser.role === 'admin' && targetUser.id !== req.user.id) {
      return res.status(403).json({ error: 'Only SuperAdmin can edit other Company Admins' });
    }

    if (username && username.trim().toLowerCase() !== (targetUser.username || '').toLowerCase()) {
      const unameCheck = await query('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?', [username.trim(), targetId]);
      if (unameCheck.length > 0) {
        return res.status(400).json({ error: `Username "${username.trim()}" is already taken` });
      }
    }

    const newName = name ? name.trim() : targetUser.name;
    const newUsername = username ? username.trim() : targetUser.username;
    const newMobile = mobile !== undefined ? mobile : targetUser.mobile;
    const newAdminId = admin_id !== undefined ? parseInt(admin_id, 10) : targetUser.admin_id;

    if (password && password.trim()) {
      const newPasskey = password.trim();
      const passwordHash = await bcrypt.hash(newPasskey, 10);
      await run(
        "UPDATE users SET name = ?, username = ?, password_hash = ?, raw_passkey = ?, mobile = ?, admin_id = ? WHERE id = ?",
        [newName, newUsername, passwordHash, newPasskey, newMobile, newAdminId, targetId]
      );
    } else {
      await run(
        "UPDATE users SET name = ?, username = ?, mobile = ?, admin_id = ? WHERE id = ?",
        [newName, newUsername, newMobile, newAdminId, targetId]
      );
    }

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/auth/users/:id - Delete an admin or surveyor account
router.delete('/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own logged-in account' });
  }

  try {
    const existing = await query('SELECT * FROM users WHERE id = ?', [targetId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const targetUser = existing[0];

    const isSuper = req.user.username === 'superadmin' || req.user.role === 'superadmin';
    if (!isSuper && targetUser.role === 'admin') {
      return res.status(403).json({ error: 'Only SuperAdmin can delete Company Admins' });
    }

    await run('DELETE FROM users WHERE id = ?', [targetId]);
    res.json({ message: 'User account deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user account' });
  }
});

export default router;
