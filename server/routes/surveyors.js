import express from 'express';
import bcrypt from 'bcryptjs';
import { query, run } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/surveyors - Admin only: List all surveyors with detailed submission counts & profile info
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const surveyors = await query(
      "SELECT id, username, name, mobile, raw_passkey, created_at FROM users WHERE role = 'surveyor' ORDER BY id ASC"
    );

    const todayStr = new Date().toISOString().split('T')[0];

    // Get submission counts (Today & Total)
    const withCounts = await Promise.all(
      surveyors.map(async (s) => {
        const totalRegRes = await query('SELECT COUNT(*) as count FROM farmers WHERE surveyor_id = ?', [s.id]);
        const todayRegRes = await query(
          "SELECT COUNT(*) as count FROM farmers WHERE surveyor_id = ? AND (date = ? OR created_at::text LIKE ?)",
          [s.id, todayStr, `${todayStr}%`]
        );

        const totalSurvRes = await query('SELECT COUNT(*) as count FROM surveys WHERE surveyor_id = ?', [s.id]);
        const todaySurvRes = await query(
          "SELECT COUNT(*) as count FROM surveys WHERE surveyor_id = ? AND (visit_date = ? OR created_at::text LIKE ?)",
          [s.id, todayStr, `${todayStr}%`]
        );

        return {
          ...s,
          registrations_count: parseInt(totalRegRes[0]?.count || 0, 10),
          today_registrations_count: parseInt(todayRegRes[0]?.count || 0, 10),
          surveys_count: parseInt(totalSurvRes[0]?.count || 0, 10),
          today_surveys_count: parseInt(todaySurvRes[0]?.count || 0, 10),
        };
      })
    );

    res.json(withCounts);
  } catch (err) {
    console.error('Fetch surveyors error:', err);
    res.status(500).json({ error: 'Failed to fetch surveyors' });
  }
});

// POST /api/surveyors - Admin only: Add new surveyor account with custom username & password & mobile
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  const { username, mobile, name, password } = req.body;
  if (!username || !name) {
    return res.status(400).json({ error: 'Username and name are required' });
  }

  const cleanUsername = (username || '').trim();
  const cleanName = (name || '').trim();
  const finalPasskey = (password && password.trim()) ? password.trim() : (mobile && mobile.trim()) ? mobile.trim() : 'field123';

  try {
    const existing = await query('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [cleanUsername]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Username "${cleanUsername}" already exists` });
    }

    const passwordHash = await bcrypt.hash(finalPasskey, 10);
    const result = await run(
      "INSERT INTO users (username, password_hash, name, role, mobile, raw_passkey) VALUES (?, ?, ?, 'surveyor', ?, ?)",
      [cleanUsername, passwordHash, cleanName, mobile || '', finalPasskey]
    );

    const newSurveyorObj = {
      id: result.lastID,
      username: cleanUsername,
      name: cleanName,
      mobile: mobile || '',
      raw_passkey: finalPasskey,
      role: 'surveyor',
      registrations_count: 0,
      today_registrations_count: 0,
      surveys_count: 0,
      today_surveys_count: 0,
      created_at: new Date().toISOString(),
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('new_surveyor', newSurveyorObj);
    }

    res.status(201).json({
      message: 'Surveyor account created successfully',
      ...newSurveyorObj,
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
