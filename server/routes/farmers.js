import express from 'express';
import { query, run } from '../db.js';
import { authenticateToken, requireRole, getTeamAdminId } from '../middleware/auth.js';

const router = express.Router();

// ─── Helper: Generate sequential farmer ID ───
const generateFarmerId = async () => {
  const year = new Date().getFullYear();
  const rows = await query(
    "SELECT farmer_id FROM farmers WHERE farmer_id LIKE ?",
    [`F-${year}-%`]
  );

  let maxNum = 0;
  if (rows && rows.length > 0) {
    for (const r of rows) {
      const match = (r.farmer_id || '').match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }
  return `F-${year}-${String(maxNum + 1).padStart(3, '0')}`;
};

// ─── GET /api/farmers ─── Paginated, admin-scoped farmer list
router.get('/', authenticateToken, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;
  const search = req.query.search || '';

  try {
    let baseWhere = '';
    let params = [];

    const teamAdminId = getTeamAdminId(req.user);
    if (teamAdminId) {
      baseWhere = 'WHERE (f.admin_id = ? OR u.admin_id = ? OR f.surveyor_id = ?)';
      params = [teamAdminId, teamAdminId, teamAdminId];
    }

    if (search) {
      const searchParam = `%${search}%`;
      baseWhere += params.length ? ' AND' : ' WHERE';
      baseWhere += ' (f.name ILIKE ? OR f.farmer_id ILIKE ? OR f.contact ILIKE ?)';
      params.push(searchParam, searchParam, searchParam);
    }

    const farmers = await query(
      `SELECT f.*, u.name as surveyor_display_name,
              adm.name as admin_name, adm.username as admin_username,
              s2a.crop, s2a.area, s2a.season_name, s2a.is_active as has_active_season
       FROM farmers f
       LEFT JOIN users u ON u.id = f.surveyor_id
       LEFT JOIN users adm ON adm.id = COALESCE(f.admin_id, u.admin_id)
       LEFT JOIN form2a_seasonal s2a ON s2a.farmer_id = f.farmer_id AND s2a.is_active = true
       ${baseWhere}
       ORDER BY f.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countParams = params.slice(0, params.length); // all except limit/offset
    const total = await query(
      `SELECT COUNT(*) as count FROM farmers f LEFT JOIN users u ON u.id = f.surveyor_id ${baseWhere}`,
      countParams
    );

    return res.json({
      success: true,
      data: farmers,
      total: parseInt(total[0]?.count || 0),
      limit,
      offset,
    });
  } catch (err) {
    console.error('Get farmers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch farmers' });
  }
});

// ─── GET /api/farmers/:farmer_id ─── Get single farmer profile with all forms
router.get('/:farmer_id', authenticateToken, async (req, res) => {
  const { farmer_id } = req.params;
  try {
    const farmers = await query(
      `SELECT f.*, u.name as surveyor_display_name
       FROM farmers f
       LEFT JOIN users u ON u.id = f.surveyor_id
       WHERE f.farmer_id = ?`,
      [farmer_id]
    );
    if (farmers.length === 0) return res.status(404).json({ success: false, message: 'Farmer not found' });

    const farmer = farmers[0];

    // Get Admin Name
    let admin_name = 'System Admin';
    if (farmer.admin_id) {
      const adminRows = await query('SELECT name, username FROM users WHERE id = ?', [farmer.admin_id]);
      if (adminRows.length > 0) admin_name = adminRows[0].name || adminRows[0].username;
    }

    // Get Active Form 2A
    const form2aRows = await query(
      'SELECT * FROM form2a_seasonal WHERE farmer_id = ? AND is_active = true LIMIT 1',
      [farmer_id]
    );
    const form2a = form2aRows[0] || null;

    // Get ALL Form 2B visits for Profile Logbook History
    const visits = await query(
      `SELECT v.*, u.name as surveyor_display_name
       FROM form2b_visits v
       LEFT JOIN users u ON u.id = v.surveyor_id
       WHERE v.farmer_id = ?
       ORDER BY v.visit_date DESC`,
      [farmer_id]
    );

    const farmerObj = {
      ...farmer,
      admin_name,
      surveyor_name: farmer.surveyor_display_name || farmer.surveyor_name || 'System Admin',
      form2a,
    };

    return res.json({
      success: true,
      farmer: farmerObj,
      visits: visits || [],
      data: farmerObj,
    });
  } catch (err) {
    console.error('Fetch farmer profile error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch farmer profile' });
  }
});

// ─── POST /api/farmers ─── Register new farmer (idempotent via client_generated_id)
router.post('/', authenticateToken, async (req, res) => {
  const io = req.app.get('io');
  const {
    name, contact, location, gps_latitude, gps_longitude,
    date, total_land, ownership, client_generated_id,
  } = req.body;

  if (!name || !contact || !location) {
    return res.status(400).json({ success: false, message: 'Name, contact, and location are required' });
  }

  try {
    // ─── Idempotency: check client_generated_id ───
    if (client_generated_id) {
      const dup = await query('SELECT farmer_id FROM farmers WHERE client_generated_id::text = ?', [client_generated_id]);
      if (dup.length > 0) {
        return res.json({ success: true, message: 'Farmer already registered (idempotent)', data: { farmer_id: dup[0].farmer_id } });
      }
    }

    const adminId = req.user.role === 'superadmin' ? null : (req.user.admin_id || req.user.id);
    let farmer_id = '';
    let success = false;
    let attempts = 0;

    while (!success && attempts < 5) {
      attempts++;
      farmer_id = await generateFarmerId();
      try {
        await run(
          `INSERT INTO farmers (
            farmer_id, client_generated_id, name, contact, location,
            gps_latitude, gps_longitude, date, total_land, ownership,
            surveyor_id, surveyor_name, admin_id
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            farmer_id, client_generated_id || null,
            name.trim(), contact.trim(), location.trim(),
            gps_latitude || null, gps_longitude || null,
            date || new Date().toISOString().split('T')[0],
            total_land || '', ownership || 'Owned (निजी / अपनी)',
            req.user.id, req.user.name, adminId,
          ]
        );
        success = true;
      } catch (insertErr) {
        // Catch Postgres error code 23505 (unique constraint violation) or duplicate farmer_id key error
        if (
          (insertErr.code === '23505' || (insertErr.message && (insertErr.message.includes('farmers_farmer_id_key') || insertErr.message.includes('duplicate key')))) &&
          attempts < 5
        ) {
          console.warn(`Farmer ID collision on ${farmer_id}, retrying (attempt ${attempts + 1})...`);
          continue; // Retry with next ID
        }
        throw insertErr;
      }
    }

    if (io) io.emit('farmer_registered', { farmer_id, admin_id: adminId, surveyor_id: req.user.id });

    return res.status(201).json({ success: true, message: 'Farmer registered successfully', data: { farmer_id } });
  } catch (err) {
    console.error('Register farmer error:', err);
    res.status(500).json({ success: false, message: 'Failed to register farmer' });
  }
});

// ─── PUT /api/farmers/:farmer_id ─── Update farmer details
router.put('/:farmer_id', authenticateToken, requireRole('admin', 'coadmin', 'manager', 'superadmin'), async (req, res) => {
  const { farmer_id } = req.params;
  const { name, contact, location, gps_latitude, gps_longitude, total_land, ownership } = req.body;

  try {
    const existing = await query('SELECT * FROM farmers WHERE farmer_id = ?', [farmer_id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Farmer not found' });

    await run(
      `UPDATE farmers SET name = ?, contact = ?, location = ?, gps_latitude = ?, gps_longitude = ?,
       total_land = ?, ownership = ?, updated_at = NOW() WHERE farmer_id = ?`,
      [
        name || existing[0].name,
        contact || existing[0].contact,
        location || existing[0].location,
        gps_latitude !== undefined ? gps_latitude : existing[0].gps_latitude,
        gps_longitude !== undefined ? gps_longitude : existing[0].gps_longitude,
        total_land || existing[0].total_land,
        ownership || existing[0].ownership,
        farmer_id,
      ]
    );

    return res.json({ success: true, message: 'Farmer updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update farmer' });
  }
});

// ─── GET /api/farmers/stats/summary ─── Dashboard stats (admin-scoped)
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const adminId = getTeamAdminId(req.user);

    let farmerWhere = '';
    let farmerParams = [];
    if (adminId) {
      farmerWhere = 'FROM farmers f LEFT JOIN users u ON u.id = f.surveyor_id WHERE (f.admin_id = ? OR u.admin_id = ? OR f.surveyor_id = ?)';
      farmerParams = [adminId, adminId, adminId];
    } else {
      farmerWhere = 'FROM farmers f';
    }

    let visitWhere = '';
    let visitParams = [];
    if (adminId) {
      visitWhere = 'FROM form2b_visits v JOIN farmers f ON f.farmer_id = v.farmer_id LEFT JOIN users u ON u.id = v.surveyor_id WHERE (v.admin_id = ? OR f.admin_id = ? OR u.admin_id = ? OR v.surveyor_id = ?)';
      visitParams = [adminId, adminId, adminId, adminId];
    } else {
      visitWhere = 'FROM form2b_visits v';
    }

    const totalFarmers = await query(`SELECT COUNT(*) as count ${farmerWhere}`, farmerParams);
    const todayVisits = await query(
      `SELECT COUNT(*) as count ${visitWhere} ${adminId ? 'AND' : 'WHERE'} (v.visit_date::text LIKE ? OR v.created_at::text LIKE ?)`,
      [...visitParams, `${new Date().toISOString().split('T')[0]}%`, `${new Date().toISOString().split('T')[0]}%`]
    );
    const totalVisits = await query(`SELECT COUNT(*) as count ${visitWhere}`, visitParams);

    return res.json({
      success: true,
      data: {
        totalFarmers: parseInt(totalFarmers[0]?.count || 0),
        todayVisits: parseInt(todayVisits[0]?.count || 0),
        totalVisits: parseInt(totalVisits[0]?.count || 0),
      },
    });
  } catch (err) {
    console.error('Stats summary error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

export default router;
