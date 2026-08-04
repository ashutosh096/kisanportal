import express from 'express';
import bcrypt from 'bcryptjs';
import { query, run } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { cacheGet, cacheSet, cacheClear } from '../cache.js';

const router = express.Router();

// GET /api/surveyors/my-stats - Get stats for currently logged in field surveyor
router.get('/my-stats', authenticateToken, async (req, res) => {
  const user = req.user;
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const [totalReg, todayReg, totalSurv, todaySurv] = await Promise.all([
      query(
        'SELECT COUNT(*) as count FROM farmers WHERE surveyor_id = ? OR LOWER(surveyor_name) = LOWER(?) OR LOWER(surveyor_name) = LOWER(?)',
        [user.id, user.username, user.name || '']
      ),
      query(
        "SELECT COUNT(*) as count FROM farmers WHERE (surveyor_id = ? OR LOWER(surveyor_name) = LOWER(?) OR LOWER(surveyor_name) = LOWER(?)) AND (date = ? OR created_at::text LIKE ?)",
        [user.id, user.username, user.name || '', todayStr, `${todayStr}%`]
      ),
      query(
        'SELECT COUNT(*) as count FROM surveys WHERE surveyor_id = ? OR LOWER(surveyor_name) = LOWER(?) OR LOWER(surveyor_name) = LOWER(?)',
        [user.id, user.username, user.name || '']
      ),
      query(
        "SELECT COUNT(*) as count FROM surveys WHERE (surveyor_id = ? OR LOWER(surveyor_name) = LOWER(?) OR LOWER(surveyor_name) = LOWER(?)) AND (visit_date = ? OR created_at::text LIKE ?)",
        [user.id, user.username, user.name || '', todayStr, `${todayStr}%`]
      ),
    ]);

    const tReg = parseInt(totalReg[0]?.count || 0, 10);
    const tdReg = parseInt(todayReg[0]?.count || 0, 10);
    const tSurv = parseInt(totalSurv[0]?.count || 0, 10);
    const tdSurv = parseInt(todaySurv[0]?.count || 0, 10);

    res.json({
      todaysReg: tdReg,
      todaysSurveys: tdSurv,
      totalReg: tReg,
      totalSurveys: tSurv,
    });
  } catch (err) {
    console.error('Fetch surveyor my-stats error:', err);
    res.status(500).json({ error: 'Failed to fetch surveyor stats' });
  }
});

// GET /api/surveyors - Admin: List surveyors with assigned company admin name
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  const user = req.user;
  const isSuper = user.username === 'superadmin' || user.role === 'superadmin';

  const cacheKey = `surveyors_${user.id}_${isSuper}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json(cached);

  try {
    let sql = `SELECT u.id, u.username, u.name, u.mobile, u.raw_passkey, u.admin_id, u.created_at, COALESCE(a.name, 'System Admin') as admin_name
               FROM users u
               LEFT JOIN users a ON u.admin_id = a.id
               WHERE u.role = 'surveyor'`;
    const params = [];

    if (!isSuper && user.role === 'admin') {
      sql += " AND u.admin_id = ?";
      params.push(user.id);
    }

    sql += " ORDER BY u.id ASC";

    const surveyors = await query(sql, params);
    const todayStr = new Date().toISOString().split('T')[0];

    // Get submission counts (Today & Total)
    const withCounts = await Promise.all(
      surveyors.map(async (s) => {
        const totalRegRes = await query(
          'SELECT COUNT(*) as count FROM farmers WHERE surveyor_id = ? OR LOWER(surveyor_name) = LOWER(?) OR LOWER(surveyor_name) = LOWER(?)',
          [s.id, s.username, s.name]
        );
        const todayRegRes = await query(
          "SELECT COUNT(*) as count FROM farmers WHERE (surveyor_id = ? OR LOWER(surveyor_name) = LOWER(?) OR LOWER(surveyor_name) = LOWER(?)) AND (date = ? OR created_at::text LIKE ?)",
          [s.id, s.username, s.name, todayStr, `${todayStr}%`]
        );

        const totalSurvRes = await query(
          'SELECT COUNT(*) as count FROM surveys WHERE surveyor_id = ? OR LOWER(surveyor_name) = LOWER(?) OR LOWER(surveyor_name) = LOWER(?)',
          [s.id, s.username, s.name]
        );
        const todaySurvRes = await query(
          "SELECT COUNT(*) as count FROM surveys WHERE (surveyor_id = ? OR LOWER(surveyor_name) = LOWER(?) OR LOWER(surveyor_name) = LOWER(?)) AND (visit_date = ? OR created_at::text LIKE ?)",
          [s.id, s.username, s.name, todayStr, `${todayStr}%`]
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

    cacheSet(cacheKey, withCounts, 30);
    res.json(withCounts);
  } catch (err) {
    console.error('Fetch surveyors error:', err);
    res.status(500).json({ error: 'Failed to fetch surveyors' });
  }
});

const DEFAULT_SURVEYOR_PASSKEY = 'field123';

// POST /api/surveyors - Admin only: Add new surveyor account under chosen Company Admin
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  cacheClear();
  const { username, mobile, name, password, admin_id } = req.body;
  if (!username || !name) {
    return res.status(400).json({ error: 'Username and name are required' });
  }

  const cleanUsername = (username || '').trim();
  const cleanName = (name || '').trim();
  const finalPasskey = (password && password.trim()) ? password.trim() : (mobile && mobile.trim()) ? mobile.trim() : DEFAULT_SURVEYOR_PASSKEY;
  // If the creator is NOT superadmin, always assign surveyor to themselves (ignore any admin_id from request)
  const isSuper = req.user.username === 'superadmin' || req.user.role === 'superadmin';
  const targetAdminId = isSuper && admin_id ? parseInt(admin_id, 10) : req.user.id;

  try {
    const existing = await query('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [cleanUsername]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Username "${cleanUsername}" already exists` });
    }

    const passwordHash = await bcrypt.hash(finalPasskey, 10);
    const result = await run(
      "INSERT INTO users (username, password_hash, name, role, mobile, raw_passkey, admin_id) VALUES (?, ?, ?, 'surveyor', ?, ?, ?)",
      [cleanUsername, passwordHash, cleanName, mobile || '', finalPasskey, targetAdminId]
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
