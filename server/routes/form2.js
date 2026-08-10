import express from 'express';
import { query, run } from '../db.js';
import { authenticateToken, requireRole, getTeamAdminId } from '../middleware/auth.js';

const router = express.Router();

// Helper: Check farmer team scope
const checkFarmerTeamScope = async (farmer_id, user) => {
  const farmers = await query('SELECT * FROM farmers WHERE farmer_id = ?', [farmer_id]);
  if (farmers.length === 0) return { status: 404, message: 'Farmer not found' };
  const farmer = farmers[0];
  const userAdminId = getTeamAdminId(user);
  if (userAdminId && farmer.admin_id && farmer.admin_id !== userAdminId) {
    return { status: 403, message: 'Access denied: Farmer not in your team' };
  }
  return { farmer };
};

// ─── GET /api/form2/2a/:farmer_id ─── Get active Form2a for a farmer
router.get('/2a/:farmer_id', authenticateToken, async (req, res) => {
  const { farmer_id } = req.params;
  try {
    const scope = await checkFarmerTeamScope(farmer_id, req.user);
    if (scope.status) return res.status(scope.status).json({ success: false, message: scope.message });

    const rows = await query(
      `SELECT * FROM form2a_seasonal WHERE farmer_id = ? AND is_active = true LIMIT 1`,
      [farmer_id]
    );
    return res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch Form 2a' });
  }
});

// ─── GET /api/form2/2a/:farmer_id/history ─── Get Form2a seasonal history
router.get('/2a/:farmer_id/history', authenticateToken, async (req, res) => {
  const { farmer_id } = req.params;
  try {
    const scope = await checkFarmerTeamScope(farmer_id, req.user);
    if (scope.status) return res.status(scope.status).json({ success: false, message: scope.message });

    const rows = await query(
      `SELECT f2a.*, u.name as reset_by_name
       FROM form2a_seasonal f2a
       LEFT JOIN users u ON u.id = f2a.reset_by_user_id
       WHERE f2a.farmer_id = ? AND f2a.is_active = false
       ORDER BY f2a.reset_at DESC`,
      [farmer_id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch Form 2a history' });
  }
});

// ─── DELETE /api/form2/2a/:farmer_id ─── Soft-reset active Form2a (admin only, keeps Form2B history)
router.delete('/2a/:farmer_id', authenticateToken, requireRole('admin', 'coadmin', 'superadmin'), async (req, res) => {
  const { farmer_id } = req.params;
  try {
    const scope = await checkFarmerTeamScope(farmer_id, req.user);
    if (scope.status) return res.status(scope.status).json({ success: false, message: scope.message });

    const rows = await query(
      `SELECT id FROM form2a_seasonal WHERE farmer_id = ? AND is_active = true LIMIT 1`,
      [farmer_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No active Form 2A found for this farmer' });
    }

    await run(
      `UPDATE form2a_seasonal SET is_active = false, reset_by_user_id = ?, reset_at = NOW() WHERE farmer_id = ? AND is_active = true`,
      [req.user.id, farmer_id]
    );

    return res.json({
      success: true,
      message: 'Form 2A has been reset. Form 2B visit history is preserved. A new Form 2A can now be filled.',
    });
  } catch (err) {
    console.error('Form 2A reset error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset Form 2A' });
  }
});

// ─── GET /api/form2/surveyor/:surveyor_id/stats ─── Surveyor dashboard stats for admin view
router.get('/surveyor/:surveyor_id/stats', authenticateToken, requireRole('admin', 'coadmin', 'manager', 'viewer', 'superadmin'), async (req, res) => {
  const { surveyor_id } = req.params;
  const todayStr = new Date().toISOString().split('T')[0];
  try {
    const surveyor = await query(`SELECT id, name, username, mobile, status, created_at FROM users WHERE id = ? AND role = 'surveyor'`, [surveyor_id]);
    if (surveyor.length === 0) return res.status(404).json({ success: false, message: 'Surveyor not found' });

    const [totalReg, todayReg, totalVisits, todayVisits, recentFarmers, recentVisits] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM farmers WHERE surveyor_id = ?`, [surveyor_id]),
      query(`SELECT COUNT(*) as count FROM farmers WHERE surveyor_id = ? AND created_at::text LIKE ?`, [surveyor_id, `${todayStr}%`]),
      query(`SELECT COUNT(*) as count FROM form2b_visits WHERE surveyor_id = ?`, [surveyor_id]),
      query(`SELECT COUNT(*) as count FROM form2b_visits WHERE surveyor_id = ? AND visit_date::text LIKE ?`, [surveyor_id, `${todayStr}%`]),
      query(`SELECT farmer_id, name, contact, location, created_at FROM farmers WHERE surveyor_id = ? ORDER BY created_at DESC LIMIT 5`, [surveyor_id]),
      query(`SELECT v.farmer_id, v.visit_date, v.gps_location, f.name as farmer_name FROM form2b_visits v LEFT JOIN farmers f ON f.farmer_id = v.farmer_id WHERE v.surveyor_id = ? ORDER BY v.created_at DESC LIMIT 5`, [surveyor_id]),
    ]);

    return res.json({
      success: true,
      data: {
        surveyor: surveyor[0],
        stats: {
          totalReg: parseInt(totalReg[0]?.count || 0, 10),
          todayReg: parseInt(todayReg[0]?.count || 0, 10),
          totalVisits: parseInt(totalVisits[0]?.count || 0, 10),
          todayVisits: parseInt(todayVisits[0]?.count || 0, 10),
        },
        recentFarmers,
        recentVisits,
      },
    });
  } catch (err) {
    console.error('Surveyor stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch surveyor stats' });
  }
});

router.post('/2a', authenticateToken, async (req, res) => {
  const {
    farmer_id, client_generated_id, season_name, total_land, ownership,
    soil_testing, water_testing, cow_dung_used, cow_dung_qty,
    crop, crop_reason, area, sowing_date, variety, seed_qty_per_acre,
    seed_type, sowing_type, harvest_date, expected_yield, expert_advice,
    crop_growth_stage, crop_height, flowering_status, seed_age,
  } = req.body;

  if (!farmer_id) {
    return res.status(400).json({ success: false, message: 'farmer_id is required' });
  }

  try {
    // Get farmer to confirm admin scope
    const farmers = await query('SELECT * FROM farmers WHERE farmer_id = ?', [farmer_id]);
    if (farmers.length === 0) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }
    const farmer = farmers[0];

    // Admin scope check: surveyor must belong to same admin
    if (req.user.role === 'surveyor') {
      const adminId = req.user.admin_id || 0;
      if (farmer.admin_id !== adminId && farmer.admin_id !== 0) {
        return res.status(403).json({ success: false, message: 'Farmer not in your admin team' });
      }
    }

    // Check active season
    const existing = await query(
      'SELECT * FROM form2a_seasonal WHERE farmer_id = ? AND is_active = true LIMIT 1',
      [farmer_id]
    );

    const adminId = farmer.admin_id || req.user.admin_id || null;

    if (existing.length > 0) {
      // ─── FIX #7: Check editing lock before writing ───
      const lockCheck = await query(
        'SELECT * FROM editing_sessions WHERE farmer_id = ? AND expires_at > NOW()',
        [farmer_id]
      );
      if (lockCheck.length > 0 && lockCheck[0].locked_by_user_id !== req.user.id) {
        return res.status(409).json({
          success: false,
          message: `Currently being edited by ${lockCheck[0].locked_by_name}. Please wait or refresh.`,
          error: { code: 'LOCK_CONFLICT', lockedBy: lockCheck[0].locked_by_name },
        });
      }

      // ─── FIX #6: Conflict detection — compare server updated_at vs client baseline ───
      if (!req.body.force) {
        const serverUpdatedAt = existing[0].updated_at ? new Date(existing[0].updated_at).getTime() : 0;
        const clientBaseline  = req.body.baseline_updated_at ? new Date(req.body.baseline_updated_at).getTime() : 0;
        if (serverUpdatedAt > clientBaseline && clientBaseline > 0) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'SYNC_CONFLICT',
              details: 'Record was updated more recently on the server. Choose which version to keep.',
            },
            data: existing[0], // return server version for the diff modal
          });
        }
      }

      // Update existing active Form2a
      await run(
        `UPDATE form2a_seasonal SET
          season_name = ?, total_land = ?, ownership = ?,
          soil_testing = ?, water_testing = ?, cow_dung_used = ?, cow_dung_qty = ?,
          crop = ?, crop_reason = ?, area = ?, sowing_date = ?,
          variety = ?, seed_qty_per_acre = ?, seed_type = ?, sowing_type = ?,
          harvest_date = ?, expected_yield = ?, expert_advice = ?,
          crop_growth_stage = ?, crop_height = ?, flowering_status = ?, seed_age = ?,
          surveyor_id = ?, surveyor_name = ?, updated_at = NOW()
         WHERE farmer_id = ? AND is_active = true`,
        [
          season_name || 'Kharif 2026', total_land || '', ownership || 'Owned (निजी / अपनी)',
          soil_testing || 'no', water_testing || 'no', cow_dung_used || 'no', cow_dung_qty || '',
          crop || '', crop_reason || '', area || '', sowing_date || '',
          variety || '', seed_qty_per_acre || '', seed_type || '', sowing_type || '',
          harvest_date || '', expected_yield || '', expert_advice || 'no',
          crop_growth_stage || '', crop_height || '', flowering_status || '', seed_age || '',
          req.user.id, req.user.name,
          farmer_id,
        ]
      );
      return res.json({ success: true, message: 'Form 2a updated successfully' });
    }


    // Idempotency check via client_generated_id
    if (client_generated_id) {
      const dup = await query('SELECT id FROM form2a_seasonal WHERE client_generated_id = ?', [client_generated_id]);
      if (dup.length > 0) {
        return res.json({ success: true, message: 'Form 2a already saved (idempotent)', data: { id: dup[0].id } });
      }
    }

    // Create new active Form2a
    const result = await run(
      `INSERT INTO form2a_seasonal (
        client_generated_id, farmer_id, admin_id, surveyor_id, surveyor_name,
        season_name, total_land, ownership, soil_testing, water_testing,
        cow_dung_used, cow_dung_qty, crop, crop_reason, area, sowing_date,
        variety, seed_qty_per_acre, seed_type, sowing_type,
        harvest_date, expected_yield, expert_advice,
        crop_growth_stage, crop_height, flowering_status, seed_age,
        is_active
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)
       RETURNING id`,
      [
        client_generated_id || null, farmer_id, adminId, req.user.id, req.user.name,
        season_name || 'Kharif 2026', total_land || '', ownership || 'Owned (निजी / अपनी)',
        soil_testing || 'no', water_testing || 'no',
        cow_dung_used || 'no', cow_dung_qty || '', crop || '', crop_reason || '',
        area || '', sowing_date || '', variety || '', seed_qty_per_acre || '',
        seed_type || '', sowing_type || '', harvest_date || '', expected_yield || '',
        expert_advice || 'no', crop_growth_stage || '', crop_height || '', flowering_status || '', seed_age || '',
      ]
    );

    // Emit real-time update
    const io = req.app.get('io');
    if (io) io.emit('form2a_updated', { farmer_id, admin_id: adminId });

    return res.status(201).json({ success: true, message: 'Form 2a created successfully', data: { id: result.lastID } });
  } catch (err) {
    console.error('Form2a error:', err);
    res.status(500).json({ success: false, message: 'Failed to save Form 2a' });
  }
});

// ─── POST /api/form2/2a/:farmer_id/reset ─── Admin seasonal reset
router.post('/2a/:farmer_id/reset', authenticateToken, requireRole('admin', 'coadmin', 'superadmin'), async (req, res) => {
  const { farmer_id } = req.params;

  try {
    // Deactivate current season (archive it)
    await run(
      `UPDATE form2a_seasonal SET is_active = false, reset_by_user_id = ?, reset_at = NOW(), updated_at = NOW()
       WHERE farmer_id = ? AND is_active = true`,
      [req.user.id, farmer_id]
    );

    // Log audit
    await run(
      `INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)`,
      [req.user.id, 'FORM2A_SEASON_RESET', `Reset Form2a season for farmer: ${farmer_id}`, req.ip || '']
    );

    const io = req.app.get('io');
    if (io) io.emit('form2a_reset', { farmer_id });

    return res.json({ success: true, message: 'Season reset successfully. Surveyor can now fill new Form 2a.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reset season' });
  }
});

// ─── GET /api/form2/2b/recent ─── Recent team activity feed for Admin Dashboard
router.get('/2b/recent', authenticateToken, async (req, res) => {
  const user = req.user;
  try {
    const adminId = getTeamAdminId(user);

    const regSql = `
      SELECT 'registration' as entry_type, f.farmer_id, f.name, f.contact, f.location, f.gps_latitude, f.gps_longitude, f.surveyor_name, f.created_at as timestamp, f.date as visit_date
      FROM farmers f
      LEFT JOIN users u ON u.id = f.surveyor_id
      ${adminId ? 'WHERE (f.admin_id = ? OR u.admin_id = ? OR f.surveyor_id = ?)' : ''}
      ORDER BY f.id DESC LIMIT 30
    `;

    const visitSql = `
      SELECT 'survey' as entry_type, v.farmer_id, f.name, f.contact, f.location, v.gps_location, v.surveyor_name, v.created_at as timestamp, v.visit_date
      FROM form2b_visits v
      JOIN farmers f ON v.farmer_id = f.farmer_id
      LEFT JOIN users u ON u.id = v.surveyor_id
      ${adminId ? 'WHERE (v.admin_id = ? OR f.admin_id = ? OR u.admin_id = ? OR v.surveyor_id = ?)' : ''}
      ORDER BY v.id DESC LIMIT 30
    `;

    const regParams = adminId ? [adminId, adminId, adminId] : [];
    const visitParams = adminId ? [adminId, adminId, adminId, adminId] : [];

    const regList = await query(regSql, regParams);
    const visitList = await query(visitSql, visitParams);

    const combined = [...regList, ...visitList].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    return res.json(combined);
  } catch (err) {
    console.error('Fetch recent feed error:', err);
    res.status(500).json({ error: 'Failed to fetch recent activity feed' });
  }
});

// ─── GET /api/form2/2b/:farmer_id ─── Get Form2b visits for a farmer
router.get('/2b/:farmer_id', authenticateToken, async (req, res) => {
  const { farmer_id } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const scope = await checkFarmerTeamScope(farmer_id, req.user);
    if (scope.status) return res.status(scope.status).json({ success: false, message: scope.message });

    const visits = await query(
      `SELECT v.*, u.name as surveyor_display_name
       FROM form2b_visits v
       LEFT JOIN users u ON u.id = v.surveyor_id
       WHERE v.farmer_id = ?
       ORDER BY v.visit_date DESC
       LIMIT ? OFFSET ?`,
      [farmer_id, limit, offset]
    );

    const total = await query('SELECT COUNT(*) as count FROM form2b_visits WHERE farmer_id = ?', [farmer_id]);

    return res.json({ success: true, data: visits, total: parseInt(total[0]?.count || 0), limit, offset });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch Form 2b visits' });
  }
});

// ─── POST /api/form2/2b ─── Submit a farm visit (idempotent)
router.post('/2b', authenticateToken, async (req, res) => {
  const {
    farmer_id, form2a_id, client_generated_id,
    visit_date, gps_location, plowing, plowing_count,
    pesticide_used, pesticide_qty, pesticide_brand,
    supplement_used, supplement_qty, supplement_brand,
    fertilizer_used, fertilizer_qty, fertilizer_brand,
    irrigation_done, irrigation_source, irrigation_type, irrigation_depth,
    weeding_done, additional_activities,
    crop_health_status, visit_notes, field_data,
  } = req.body;

  if (!farmer_id) {
    return res.status(400).json({ success: false, message: 'farmer_id is required' });
  }

  // Require an active Form2a before Form2b
  if (!form2a_id) {
    return res.status(400).json({ success: false, message: 'form2a_id is required. Please ensure Form 2a is filled first.' });
  }

  try {
    // Idempotency check
    if (client_generated_id) {
      const dup = await query('SELECT id FROM form2b_visits WHERE client_generated_id = ?', [client_generated_id]);
      if (dup.length > 0) {
        return res.json({ success: true, message: 'Visit already saved (idempotent)', data: { id: dup[0].id } });
      }
    }

    // Get farmer for admin scope
    const farmers = await query('SELECT * FROM farmers WHERE farmer_id = ?', [farmer_id]);
    if (farmers.length === 0) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    // ─── FIX #7: Check editing lock before writing Form2b ───
    const lockCheck = await query(
      'SELECT * FROM editing_sessions WHERE farmer_id = ? AND expires_at > NOW()',
      [farmer_id]
    );
    if (lockCheck.length > 0 && lockCheck[0].locked_by_user_id !== req.user.id) {
      return res.status(409).json({
        success: false,
        message: `Currently being edited by ${lockCheck[0].locked_by_name}. Please wait.`,
        error: { code: 'LOCK_CONFLICT', lockedBy: lockCheck[0].locked_by_name },
      });
    }

    const adminId = farmers[0].admin_id || req.user.admin_id || null;


    const result = await run(
      `INSERT INTO form2b_visits (
        client_generated_id, farmer_id, form2a_id, surveyor_id, surveyor_name, admin_id,
        visit_date, gps_location, plowing, plowing_count,
        pesticide_used, pesticide_qty, pesticide_brand,
        supplement_used, supplement_qty, supplement_brand,
        fertilizer_used, fertilizer_qty, fertilizer_brand,
        irrigation_done, irrigation_source, irrigation_type, irrigation_depth,
        weeding_done, additional_activities,
        crop_health_status, visit_notes, field_data
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [
        client_generated_id || null, farmer_id, form2a_id, req.user.id, req.user.name, adminId,
        visit_date || new Date().toISOString(), gps_location || '',
        plowing || 'no', plowing_count || '0',
        pesticide_used || 'no', pesticide_qty || '', pesticide_brand || '',
        supplement_used || 'no', supplement_qty || '', supplement_brand || '',
        fertilizer_used || 'no', fertilizer_qty || '', fertilizer_brand || '',
        irrigation_done || 'no', irrigation_source || '', irrigation_type || '', irrigation_depth || '',
        weeding_done || 'no', additional_activities || '',
        crop_health_status || 'Good', visit_notes || '',
        JSON.stringify(field_data || {}),
      ]
    );

    // Emit real-time update
    const io = req.app.get('io');
    if (io) io.emit('form2b_submitted', { farmer_id, admin_id: adminId, surveyor_id: req.user.id });

    return res.status(201).json({ success: true, message: 'Farm visit saved successfully', data: { id: result.lastID } });
  } catch (err) {
    console.error('Form2b error:', err);
    res.status(500).json({ success: false, message: 'Failed to save farm visit' });
  }
});

export default router;
