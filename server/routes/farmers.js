import express from 'express';
import { query, run } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { cacheGet, cacheSet, cacheClear } from '../cache.js';

const router = express.Router();

// Helper to generate unique Farmer ID sequentially (+1 increment, no gaps)
const generateFarmerId = async () => {
  const year = new Date().getFullYear();
  const rows = await query(
    "SELECT farmer_id FROM farmers WHERE farmer_id LIKE ? ORDER BY id DESC",
    [`F-${year}-%`]
  );

  let maxNum = 0;
  if (rows && rows.length > 0) {
    rows.forEach((r) => {
      const match = (r.farmer_id || '').match(/F-\d+-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
  }

  const nextNum = maxNum + 1;
  return `F-${year}-${String(nextNum).padStart(3, '0')}`;
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

    cacheClear();

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

// GET /api/farmers - List farmers filtered by role (surveyor sees own, admin sees company team, superadmin sees all)
router.get('/', authenticateToken, async (req, res) => {
  const { search, location } = req.query;
  const user = req.user;

  const cacheKey = `farmers_${user.id}_${user.role}_${search || ''}_${location || ''}`;
  const cachedData = cacheGet(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    let sql = `SELECT f.*, 
                      COALESCE(a.name, 'System Admin') AS admin_name, 
                      COALESCE(a.username, 'admin') AS admin_username, 
                      COALESCE(a.id, 0) AS admin_user_id
               FROM farmers f
               LEFT JOIN users u ON f.surveyor_id = u.id OR LOWER(f.surveyor_name) = LOWER(u.username) OR LOWER(f.surveyor_name) = LOWER(u.name)
               LEFT JOIN users a ON u.admin_id = a.id OR (u.role = 'admin' AND u.id = a.id)
               WHERE 1=1`;
    const params = [];

    const isSuper = user.username === 'superadmin' || user.role === 'superadmin';

    // Data Isolation by Role (SuperAdmin sees ALL farmers)
    if (!isSuper) {
      if (user.role === 'surveyor') {
        const userAdminId = user.admin_id || user.id;
        sql += ` AND (
          f.surveyor_id = ?
          OR f.surveyor_id IN (
            SELECT id FROM users 
            WHERE admin_id = ? 
               OR id = ? 
               OR admin_id = (SELECT admin_id FROM users WHERE id = ?)
          )
          OR LOWER(f.surveyor_name) = LOWER(?)
          OR (f.surveyor_id IS NULL OR f.surveyor_id = 0)
        )`;
        params.push(user.id, userAdminId, userAdminId, user.id, user.name || user.username);
      } else if (user.role === 'admin') {
        sql += ` AND (f.surveyor_id IN (SELECT id FROM users WHERE admin_id = ? OR id = ? OR admin_id IS NULL OR admin_id = 0)
                      OR LOWER(f.surveyor_name) IN (SELECT LOWER(name) FROM users WHERE admin_id = ? OR id = ? OR admin_id IS NULL OR admin_id = 0))`;
        params.push(user.id, user.id, user.id, user.id);
      }
    }

    if (search) {
      sql += ' AND (LOWER(f.name) LIKE LOWER(?) OR LOWER(f.farmer_id) LIKE LOWER(?) OR LOWER(f.contact) LIKE LOWER(?) OR LOWER(f.location) LIKE LOWER(?))';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (location) {
      sql += ' AND LOWER(f.location) LIKE LOWER(?)';
      params.push(`%${location}%`);
    }

    sql += ' ORDER BY f.id DESC';

    const farmers = await query(sql, params);
    cacheSet(cacheKey, farmers, 30);
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
      query(
        `SELECT f.*, COALESCE(a.name, 'System Admin') as admin_name
         FROM farmers f
         LEFT JOIN users u ON f.surveyor_id = u.id OR LOWER(f.surveyor_name) = LOWER(u.username) OR LOWER(f.surveyor_name) = LOWER(u.name)
         LEFT JOIN users a ON u.admin_id = a.id OR (u.role = 'admin' AND u.id = a.id)
         WHERE f.farmer_id = ?`,
        [farmer_id]
      ),
      query('SELECT * FROM surveys WHERE farmer_id = ? ORDER BY visit_date DESC, id DESC', [farmer_id]),
    ]);

    if (farmers.length === 0) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    res.json({
      farmer: farmers[0],
      visits: visits || [],
    });
  } catch (err) {
    console.error('Fetch farmer profile error:', err);
    res.status(500).json({ error: 'Failed to fetch farmer profile' });
  }
});

export default router;
