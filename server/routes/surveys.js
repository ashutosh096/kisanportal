import express from 'express';
import { query, run } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

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

// GET /api/surveys/live-feed - Admin live feed combining registrations & surveys
router.get('/live-feed', authenticateToken, async (req, res) => {
  try {
    const regList = await query(
      `SELECT 'registration' as entry_type, farmer_id, name, contact, location, gps_location, photo_url, surveyor_name, created_at as timestamp, date as visit_date
       FROM farmers ORDER BY id DESC LIMIT 50`
    );

    const surveyList = await query(
      `SELECT 'survey' as entry_type, s.farmer_id, f.name, f.contact, f.location, s.gps_location, f.photo_url, s.surveyor_name, s.created_at as timestamp, s.visit_date
       FROM surveys s JOIN farmers f ON s.farmer_id = f.farmer_id
       ORDER BY s.id DESC LIMIT 50`
    );

    const combined = [...regList, ...surveyList].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    res.json(combined);
  } catch (err) {
    console.error('Fetch live feed error:', err);
    res.status(500).json({ error: 'Failed to fetch live feed' });
  }
});

export default router;
