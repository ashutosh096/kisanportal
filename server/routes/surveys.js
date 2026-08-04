import express from 'express';
import { query, run } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { cacheGet, cacheSet, cacheClear } from '../cache.js';

const router = express.Router();

// POST /api/surveys - Submit farm visit survey log with GPS location
router.post('/', authenticateToken, async (req, res) => {
  const io = req.app.get('io');
  const {
    farmer_id,
    visit_date,
    gps_location,
    plowing,
    plowing_count,
    pesticide_used,
    pesticide_qty,
    pesticide_brand,
    supplement_used,
    supplement_qty,
    supplement_brand,
    fertilizer_used,
    fertilizer_qty,
    fertilizer_brand,
    irrigation_done,
    irrigation_source,
    irrigation_type,
    irrigation_depth,
    weeding_done,
    additional_activities,
  } = req.body;

  if (!farmer_id || !visit_date) {
    return res.status(400).json({ error: 'Farmer ID and visit date are required' });
  }

  try {
    // Check if farmer exists
    const farmers = await query('SELECT * FROM farmers WHERE farmer_id = ?', [farmer_id]);
    if (farmers.length === 0) {
      return res.status(404).json({ error: 'Farmer not found with provided ID' });
    }

    const farmer = farmers[0];
    const surveyorName = req.user.name || req.user.username;
    const surveyorId = req.user.id;

    await run(
      `INSERT INTO surveys (
        farmer_id, visit_date, gps_location, plowing, plowing_count,
        pesticide_used, pesticide_qty, pesticide_brand,
        supplement_used, supplement_qty, supplement_brand,
        fertilizer_used, fertilizer_qty, fertilizer_brand,
        irrigation_done, irrigation_source, irrigation_type, irrigation_depth,
        weeding_done, additional_activities, surveyor_id, surveyor_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        farmer_id,
        visit_date,
        gps_location || '',
        plowing || 'no',
        plowing_count || '0',
        pesticide_used || 'no',
        pesticide_qty || '',
        pesticide_brand || '',
        supplement_used || 'no',
        supplement_qty || '',
        supplement_brand || '',
        fertilizer_used || 'no',
        fertilizer_qty || '',
        fertilizer_brand || '',
        irrigation_done || 'no',
        irrigation_source || '',
        irrigation_type || '',
        irrigation_depth || '',
        weeding_done || 'no',
        additional_activities || '',
        surveyorId,
        surveyorName,
      ]
    );

    const newSurveyEntry = {
      entry_type: 'survey',
      farmer_id,
      name: farmer.name,
      contact: farmer.contact,
      location: farmer.location,
      gps_location: gps_location || '',
      surveyor_name: surveyorName,
      visit_date,
      timestamp: new Date().toISOString(),
    };

    cacheClear();

    if (io) {
      io.emit('new_entry', newSurveyEntry);
    }

    res.status(201).json({
      message: 'Farm visit survey logged successfully',
    });
  } catch (err) {
    console.error('Submit survey error:', err);
    res.status(500).json({ error: 'Failed to submit farm visit survey' });
  }
});

// GET /api/surveys/live-feed - Live feed combining registrations & surveys (isolated by role)
router.get('/live-feed', authenticateToken, async (req, res) => {
  const user = req.user;

  const cacheKey = `live_feed_${user.id}_${user.role}`;
  const cachedFeed = cacheGet(cacheKey);
  if (cachedFeed) {
    return res.json(cachedFeed);
  }

  try {
    let regSql = `SELECT 'registration' as entry_type, f.farmer_id, f.name, f.contact, f.location, f.gps_location, f.photo_url, f.surveyor_name, f.created_at as timestamp, f.date as visit_date, COALESCE(a.name, 'System Admin') as admin_name
                  FROM farmers f
                  LEFT JOIN users u ON f.surveyor_id = u.id OR LOWER(f.surveyor_name) = LOWER(u.username) OR LOWER(f.surveyor_name) = LOWER(u.name)
                  LEFT JOIN users a ON u.admin_id = a.id OR (u.role = 'admin' AND u.id = a.id)
                  WHERE 1=1`;
    let surveySql = `SELECT 'survey' as entry_type, s.farmer_id, f.name, f.contact, f.location, s.gps_location, f.photo_url, s.surveyor_name, s.created_at as timestamp, s.visit_date, COALESCE(a.name, 'System Admin') as admin_name
                     FROM surveys s
                     JOIN farmers f ON s.farmer_id = f.farmer_id
                     LEFT JOIN users u ON s.surveyor_id = u.id OR LOWER(s.surveyor_name) = LOWER(u.username) OR LOWER(s.surveyor_name) = LOWER(u.name)
                     LEFT JOIN users a ON u.admin_id = a.id OR (u.role = 'admin' AND u.id = a.id)
                     WHERE 1=1`;
    const regParams = [];
    const surveyParams = [];

    const isSuper = user.username === 'superadmin' || user.role === 'superadmin';

    if (!isSuper) {
      if (user.role === 'surveyor') {
        const userAdminId = user.admin_id || user.id;
        const teamFilter = ` (
          surveyor_id = ? 
          OR surveyor_id IN (
            SELECT id FROM users 
            WHERE admin_id = ? 
               OR id = ? 
               OR admin_id = (SELECT admin_id FROM users WHERE id = ?)
          )
          OR LOWER(surveyor_name) = LOWER(?)
        )`;
        regSql += ` AND ${teamFilter}`;
        regParams.push(user.id, userAdminId, userAdminId, user.id, user.name || user.username);

        surveySql += ` AND (
          s.surveyor_id = ? 
          OR s.surveyor_id IN (
            SELECT id FROM users 
            WHERE admin_id = ? 
               OR id = ? 
               OR admin_id = (SELECT admin_id FROM users WHERE id = ?)
          )
          OR LOWER(s.surveyor_name) = LOWER(?)
        )`;
        surveyParams.push(user.id, userAdminId, userAdminId, user.id, user.name || user.username);
      } else if (user.role === 'admin') {
        regSql += ` AND (surveyor_id IN (SELECT id FROM users WHERE admin_id = ? OR id = ? OR admin_id IS NULL OR admin_id = 0)
                        OR LOWER(surveyor_name) IN (SELECT LOWER(name) FROM users WHERE admin_id = ? OR id = ? OR admin_id IS NULL OR admin_id = 0))`;
        regParams.push(user.id, user.id, user.id, user.id);

        surveySql += ` AND (s.surveyor_id IN (SELECT id FROM users WHERE admin_id = ? OR id = ? OR admin_id IS NULL OR admin_id = 0)
                          OR LOWER(s.surveyor_name) IN (SELECT LOWER(name) FROM users WHERE admin_id = ? OR id = ? OR admin_id IS NULL OR admin_id = 0))`;
        surveyParams.push(user.id, user.id, user.id, user.id);
      }
    }

    regSql += ' ORDER BY f.id DESC LIMIT 50';
    surveySql += ' ORDER BY s.id DESC LIMIT 50';

    const regList = await query(regSql, regParams);
    const surveyList = await query(surveySql, surveyParams);

    const combined = [...regList, ...surveyList].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    cacheSet(cacheKey, combined, 30);
    res.json(combined);
  } catch (err) {
    console.error('Fetch live feed error:', err);
    res.status(500).json({ error: 'Failed to fetch live feed' });
  }
});

export default router;
