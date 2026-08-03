import express from 'express';
import { query, run } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to generate unique Farmer ID without collision
const generateFarmerId = async () => {
  const year = new Date().getFullYear();
  const rows = await query('SELECT COUNT(*) as count FROM farmers');
  let nextNum = (rows[0]?.count || 0) + 1;
  let farmerId = `F-${year}-${String(nextNum).padStart(3, '0')}`;

  // Check collision and auto-increment until 100% unique ID is found
  let existing = await query('SELECT id FROM farmers WHERE farmer_id = ?', [farmerId]);
  while (existing && existing.length > 0) {
    nextNum += 1;
    farmerId = `F-${year}-${String(nextNum).padStart(3, '0')}`;
    existing = await query('SELECT id FROM farmers WHERE farmer_id = ?', [farmerId]);
  }

  return farmerId;
};

// POST /api/farmers - Register new farmer with photo & live GPS location
router.post('/', authenticateToken, async (req, res) => {
  const io = req.app.get('io');
  const {
    name,
    contact,
    location,
    gps_location,
    date,
    photo_url,
    soil_testing,
    water_testing,
    cow_dung_used,
    cow_dung_qty,
    crop,
    crop_reason,
    area,
    sowing_date,
    variety,
    seed_qty_per_acre,
    seed_type,
    sowing_type,
    harvest_date,
    yield: cropYield,
    expert_advice,
    crop_growth_stage,
    crop_height,
    flowering_status,
    seed_age,
  } = req.body;

  if (!name || name.trim().length < 2 || /\d/.test(name) || !/^[a-zA-Z\u0900-\u097F\s.']{2,60}$/.test(name.trim())) {
    return res.status(400).json({ error: 'Valid farmer name without numbers is required' });
  }

  if (!location) {
    return res.status(400).json({ error: 'Location is required' });
  }

  // Format contact number with +91 if 10 digits provided, or default to N/A
  let formattedContact = 'N/A';
  if (contact && contact.trim() !== '') {
    const digitsOnly = contact.replace(/\D/g, '');
    const cleanDigits = digitsOnly.length === 12 && digitsOnly.startsWith('91') ? digitsOnly.slice(2) : digitsOnly;
    if (cleanDigits.length === 10) {
      formattedContact = `+91 ${cleanDigits}`;
    } else {
      formattedContact = contact;
    }
  }

  try {
    const farmerId = await generateFarmerId();
    const currentDate = date || new Date().toISOString().split('T')[0];
    const surveyorName = req.user.name || req.user.username;
    const surveyorId = req.user.id;

    await run(
      `INSERT INTO farmers (
        farmer_id, name, contact, location, gps_location, date, photo_url,
        soil_testing, water_testing, cow_dung_used, cow_dung_qty,
        crop, crop_reason, area, sowing_date, variety,
        seed_qty_per_acre, seed_type, sowing_type, harvest_date,
        yield, expert_advice, crop_growth_stage, crop_height, flowering_status, seed_age, surveyor_id, surveyor_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        farmerId,
        name,
        formattedContact,
        location,
        gps_location || '',
        currentDate,
        photo_url || '',
        soil_testing || 'no',
        water_testing || 'no',
        cow_dung_used || 'no',
        cow_dung_qty || '',
        crop || '',
        crop_reason || '',
        area || '',
        sowing_date || '',
        variety || '',
        seed_qty_per_acre || '',
        seed_type || '',
        sowing_type || '',
        harvest_date || '',
        cropYield || '',
        expert_advice || 'no',
        crop_growth_stage || '',
        crop_height || '',
        flowering_status || '',
        seed_age || '',
        surveyorId,
        surveyorName,
      ]
    );

    const newFarmerEntry = {
      entry_type: 'registration',
      farmer_id: farmerId,
      name,
      contact,
      location,
      gps_location: gps_location || '',
      photo_url: photo_url || '',
      surveyor_name: surveyorName,
      timestamp: new Date().toISOString(),
    };

    // Broadcast live event to all connected admin clients!
    if (io) {
      io.emit('new_entry', newFarmerEntry);
    }

    res.status(201).json({
      message: 'Farmer registered successfully',
      farmer_id: farmerId,
    });
  } catch (err) {
    console.error('Farmer registration error:', err);
    res.status(500).json({ error: 'Failed to register farmer' });
  }
});

// GET /api/farmers - List all farmers
router.get('/', authenticateToken, async (req, res) => {
  const { search, location } = req.query;

  try {
    let sql = 'SELECT * FROM farmers WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (name LIKE ? OR farmer_id LIKE ? OR contact LIKE ? OR location LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (location) {
      sql += ' AND location LIKE ?';
      params.push(`%${location}%`);
    }

    sql += ' ORDER BY id DESC';

    const farmers = await query(sql, params);
    res.json(farmers);
  } catch (err) {
    console.error('Fetch farmers error:', err);
    res.status(500).json({ error: 'Failed to fetch farmers' });
  }
});

// GET /api/farmers/:farmer_id - Get single farmer details + visit logbook
router.get('/:farmer_id', authenticateToken, async (req, res) => {
  const { farmer_id } = req.params;

  try {
    const [farmers, visits] = await Promise.all([
      query('SELECT * FROM farmers WHERE farmer_id = ?', [farmer_id]),
      query('SELECT * FROM surveys WHERE farmer_id = ? ORDER BY visit_date DESC, id DESC', [farmer_id]),
    ]);

    if (farmers.length === 0) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    res.json({
      farmer: farmers[0],
      visits,
    });
  } catch (err) {
    console.error('Fetch farmer profile error:', err);
    res.status(500).json({ error: 'Failed to fetch farmer profile' });
  }
});

export default router;
