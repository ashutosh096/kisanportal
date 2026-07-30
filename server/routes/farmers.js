import express from 'express';
import { query, run } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to generate unique Farmer ID
const generateFarmerId = async () => {
  const year = new Date().getFullYear();
  const rows = await query('SELECT COUNT(*) as count FROM farmers');
  const nextNum = (rows[0]?.count || 0) + 1;
  const formattedNum = String(nextNum).padStart(3, '0');
  return `F-${year}-${formattedNum}`;
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
  } = req.body;

  if (!name || !contact || !location) {
    return res.status(400).json({ error: 'Farmer name, contact number, and location are required' });
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
        yield, expert_advice, surveyor_id, surveyor_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        farmerId,
        name,
        contact,
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
    const farmers = await query('SELECT * FROM farmers WHERE farmer_id = ?', [farmer_id]);
    if (farmers.length === 0) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    const farmer = farmers[0];
    const visits = await query(
      'SELECT * FROM surveys WHERE farmer_id = ? ORDER BY visit_date DESC, id DESC',
      [farmer_id]
    );

    res.json({
      farmer,
      visits,
    });
  } catch (err) {
    console.error('Fetch farmer profile error:', err);
    res.status(500).json({ error: 'Failed to fetch farmer profile' });
  }
});

export default router;
