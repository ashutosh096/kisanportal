import express from 'express';
import bcrypt from 'bcryptjs';
import { query, run } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/surveyors - Admin only: List all surveyors with submission counts
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const surveyors = await query(
      "SELECT id, username, name, created_at FROM users WHERE role = 'surveyor' ORDER BY id ASC"
    );

    // Get submission counts
    const withCounts = await Promise.all(
      surveyors.map(async (s) => {
        const regCount = await query('SELECT COUNT(*) as count FROM farmers WHERE surveyor_id = ?', [s.id]);
        const survCount = await query('SELECT COUNT(*) as count FROM surveys WHERE surveyor_id = ?', [s.id]);
        return {
          ...s,
          registrations_count: regCount[0]?.count || 0,
          surveys_count: survCount[0]?.count || 0,
        };
      })
    );

    res.json(withCounts);
  } catch (err) {
    console.error('Fetch surveyors error:', err);
    res.status(500).json({ error: 'Failed to fetch surveyors' });
  }
});

// POST /api/surveyors - Admin only: Add new surveyor account
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  const { username, mobile, name } = req.body;
  if (!username || !mobile || !name) {
    return res.status(400).json({ error: 'Username, name, and mobile are required' });
  }

  try {
    const existing = await query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Auto-set password to mobile number (surveyor logs in with mobile as password)
    const passwordHash = await bcrypt.hash(mobile, 10);
    const result = await run(
      "INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, 'surveyor')",
      [username, passwordHash, name]
    );

    res.status(201).json({
      message: 'Surveyor account created successfully',
      id: result.lastID,
      username,
      name,
      mobile,
    });
  } catch (err) {
    console.error('Add surveyor error:', err);
    res.status(500).json({ error: 'Failed to create surveyor account' });
  }
});

// DELETE /api/surveyors/:id - Admin only: Remove surveyor account
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await run("DELETE FROM users WHERE id = ? AND role = 'surveyor'", [req.params.id]);
    res.json({ message: 'Surveyor account removed successfully' });
  } catch (err) {
    console.error('Delete surveyor error:', err);
    res.status(500).json({ error: 'Failed to remove surveyor account' });
  }
});

export default router;
