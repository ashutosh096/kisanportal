import express from 'express';
import { query, run } from '../db.js';
import { authenticateToken, requireRole, getTeamAdminId } from '../middleware/auth.js';
import { cacheGet, cacheSet } from '../cache.js';

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
        "SELECT COUNT(*) as count FROM farmers WHERE (surveyor_id = ? OR LOWER(surveyor_name) = LOWER(?)) AND (date = ? OR created_at::text LIKE ?)",
        [user.id, user.username, todayStr, `${todayStr}%`]
      ),
      query(
        'SELECT COUNT(*) as count FROM form2b_visits WHERE surveyor_id = ? OR LOWER(surveyor_name) = LOWER(?) OR LOWER(surveyor_name) = LOWER(?)',
        [user.id, user.username, user.name || '']
      ),
      query(
        "SELECT COUNT(*) as count FROM form2b_visits WHERE (surveyor_id = ? OR LOWER(surveyor_name) = LOWER(?)) AND (visit_date::text LIKE ? OR created_at::text LIKE ?)",
        [user.id, user.username, `${todayStr}%`, `${todayStr}%`]
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

// GET /api/surveyors - Admin/Team: List surveyors with assigned company admin name
router.get('/', authenticateToken, requireRole('admin', 'coadmin', 'manager', 'viewer', 'superadmin'), async (req, res) => {
  const user = req.user;
  const isSuper = user.username === 'superadmin' || user.role === 'superadmin';

  const cacheKey = `surveyors_${user.id}_${isSuper}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json(cached);

  try {
    let sql = `SELECT u.id, u.username, u.name, u.mobile, u.admin_id, u.must_change_password, u.status, u.created_at, COALESCE(a.name, 'System Admin') as admin_name
               FROM users u
               LEFT JOIN users a ON u.admin_id = a.id
               WHERE u.role = 'surveyor'`;
    const params = [];

    if (!isSuper) {
      const userAdminId = getTeamAdminId(user);
      sql += " AND (u.admin_id = ? OR u.id = ?)";
      params.push(userAdminId, userAdminId);
    }

    sql += " ORDER BY u.id ASC";

    const surveyors = await query(sql, params);
    const todayStr = new Date().toISOString().split('T')[0];

    // Get submission counts (Today & Total scoped by team admin)
    const userAdminId = getTeamAdminId(user);
    const withCounts = await Promise.all(
      surveyors.map(async (s) => {
        let regSql = 'SELECT COUNT(*) as count FROM farmers WHERE (surveyor_id = ? OR LOWER(surveyor_name) = LOWER(?))';
        let regParams = [s.id, s.username];
        if (userAdminId) {
          regSql += ' AND (admin_id = ? OR surveyor_id IN (SELECT id FROM users WHERE admin_id = ?))';
          regParams.push(userAdminId, userAdminId);
        }

        let todayRegSql = regSql + ' AND (date = ? OR created_at::text LIKE ?)';
        let todayRegParams = [...regParams, todayStr, `${todayStr}%`];

        const totalRegRes = await query(regSql, regParams);
        const todayRegRes = await query(todayRegSql, todayRegParams);

        let survSql = 'SELECT COUNT(*) as count FROM form2b_visits WHERE (surveyor_id = ? OR LOWER(surveyor_name) = LOWER(?))';
        let survParams = [s.id, s.username];
        if (userAdminId) {
          survSql += ' AND (admin_id = ? OR farmer_id IN (SELECT farmer_id FROM farmers WHERE admin_id = ?))';
          survParams.push(userAdminId, userAdminId);
        }

        let todaySurvSql = survSql + ' AND (visit_date::text LIKE ? OR created_at::text LIKE ?)';
        let todaySurvParams = [...survParams, `${todayStr}%`, `${todayStr}%`];

        const totalSurvRes = await query(survSql, survParams);
        const todaySurvRes = await query(todaySurvSql, todaySurvParams);

        return {
          ...s,
          registrations_count: parseInt(totalRegRes[0]?.count || 0, 10),
          todays_registrations_count: parseInt(todayRegRes[0]?.count || 0, 10),
          surveys_count: parseInt(totalSurvRes[0]?.count || 0, 10),
          todays_surveys_count: parseInt(todaySurvRes[0]?.count || 0, 10),
        };
      })
    );

    cacheSet(cacheKey, withCounts);
    return res.json(withCounts);
  } catch (err) {
    console.error('Fetch surveyors error:', err);
    res.status(500).json({ error: 'Failed to fetch surveyors' });
  }
});

// DELETE /api/surveyors/:id - Admin/Co-Admin: Remove surveyor account
router.delete('/:id', authenticateToken, requireRole('admin', 'coadmin', 'superadmin'), async (req, res) => {
  try {
    await run("DELETE FROM users WHERE id = ? AND role = 'surveyor'", [req.params.id]);
    res.json({ message: 'Surveyor account removed successfully' });
  } catch (err) {
    console.error('Delete surveyor error:', err);
    res.status(500).json({ error: 'Failed to remove surveyor account' });
  }
});

export default router;
