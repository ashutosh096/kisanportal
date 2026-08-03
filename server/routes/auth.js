import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { JWT_SECRET, authenticateToken } from '../middleware/auth.js';

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

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;
