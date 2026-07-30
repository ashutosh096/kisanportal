import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;
let isVercel = !!process.env.VERCEL;

// Vercel Ephemeral JSON Data Store
const vercelDbPath = '/tmp/farmer_data.json';

const getInitialData = async () => {
  const adminPass = await bcrypt.hash('admin123', 10);
  const surveyorPass = await bcrypt.hash('field123', 10);

  return {
    users: [
      { id: 1, username: 'admin', password_hash: adminPass, name: 'System Admin', role: 'admin', created_at: new Date().toISOString() },
      { id: 2, username: 'surveyor1', password_hash: surveyorPass, name: 'Ramesh Kumar', role: 'surveyor', created_at: new Date().toISOString() },
      { id: 3, username: 'ashu01', password_hash: surveyorPass, name: 'Ashutosh Mishra', role: 'surveyor', created_at: new Date().toISOString() }
    ],
    farmers: [
      {
        id: 1,
        farmer_id: 'F-2026-001',
        name: 'Ram Singh',
        contact: '9876543210',
        location: 'Kanpur, Kanpur Nagar, Uttar Pradesh',
        gps_location: '26.516701° N, 80.226379° E',
        date: '2026-07-30',
        photo_url: '',
        soil_testing: 'yes',
        water_testing: 'yes',
        cow_dung_used: 'yes',
        cow_dung_qty: '500kg',
        crop: 'Wheat (गेहूं)',
        crop_reason: 'High yield',
        area: '2 Acres',
        sowing_date: '2026-06-15',
        variety: 'HD-2967',
        seed_qty_per_acre: '40kg',
        seed_type: 'Hybrid',
        sowing_type: 'Line Sowing',
        harvest_date: '2026-10-15',
        yield: '25 Quintal',
        expert_advice: 'yes',
        surveyor_id: 2,
        surveyor_name: 'Ramesh Kumar',
        created_at: new Date().toISOString()
      }
    ],
    surveys: []
  };
};

const loadVercelDb = async () => {
  try {
    if (fs.existsSync(vercelDbPath)) {
      const content = fs.readFileSync(vercelDbPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn('Vercel JSON DB load error:', err);
  }
  const initial = await getInitialData();
  saveVercelDb(initial);
  return initial;
};

const saveVercelDb = (data) => {
  try {
    fs.writeFileSync(vercelDbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('Vercel JSON DB save error:', err);
  }
};

// Initialize DB Engine (Native SQLite or Vercel JSON Store)
try {
  if (!isVercel) {
    const dbPath = path.join(__dirname, 'farmer_survey.db');
    db = new sqlite3.Database(dbPath);
  }
} catch (e) {
  console.warn('SQLite native module failed, falling back to Vercel JSON Engine:', e.message);
  isVercel = true;
}

export const query = async (sql, params = []) => {
  if (!isVercel && db) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Vercel Driver Implementation
  const data = await loadVercelDb();
  const lowerSql = sql.toLowerCase();

  if (lowerSql.includes('from users')) {
    let list = [...data.users];
    if (lowerSql.includes("role = 'surveyor'")) {
      list = list.filter((u) => u.role === 'surveyor');
    }
    if (lowerSql.includes('where username =')) {
      list = list.filter((u) => u.username === params[0]);
    }
    if (lowerSql.includes('where id =')) {
      list = list.filter((u) => u.id === Number(params[0]));
    }
    if (lowerSql.includes('count(*)')) {
      return [{ count: list.length }];
    }
    return list;
  }

  if (lowerSql.includes('from farmers')) {
    let list = [...data.farmers];
    if (lowerSql.includes('where farmer_id =')) {
      list = list.filter((f) => f.farmer_id === params[0]);
    }
    if (lowerSql.includes('like') || lowerSql.includes('contact =')) {
      const term = (params[0] || '').replace(/%/g, '').toLowerCase();
      list = list.filter(
        (f) =>
          f.farmer_id.toLowerCase().includes(term) ||
          f.contact.includes(term) ||
          f.name.toLowerCase().includes(term) ||
          f.location.toLowerCase().includes(term)
      );
    }
    return list;
  }

  if (lowerSql.includes('from surveys')) {
    let list = [...data.surveys];
    if (lowerSql.includes('where farmer_id =')) {
      list = list.filter((s) => s.farmer_id === params[0]);
    }
    return list;
  }

  return [];
};

export const run = async (sql, params = []) => {
  if (!isVercel && db) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  // Vercel Driver Run Implementation
  const data = await loadVercelDb();
  const lowerSql = sql.toLowerCase();

  if (lowerSql.includes('insert into users')) {
    const newUser = {
      id: Date.now(),
      username: params[0],
      password_hash: params[1],
      name: params[2],
      role: params[3],
      created_at: new Date().toISOString(),
    };
    data.users.push(newUser);
    saveVercelDb(data);
    return { lastID: newUser.id, changes: 1 };
  }

  if (lowerSql.includes('insert into farmers')) {
    const newFarmer = {
      id: Date.now(),
      farmer_id: params[0],
      name: params[1],
      contact: params[2],
      location: params[3],
      gps_location: params[4],
      date: params[5],
      photo_url: params[6],
      soil_testing: params[7],
      water_testing: params[8],
      cow_dung_used: params[9],
      cow_dung_qty: params[10],
      crop: params[11],
      crop_reason: params[12],
      area: params[13],
      sowing_date: params[14],
      variety: params[15],
      seed_qty_per_acre: params[16],
      seed_type: params[17],
      sowing_type: params[18],
      harvest_date: params[19],
      yield: params[20],
      expert_advice: params[21],
      surveyor_id: params[22],
      surveyor_name: params[23],
      created_at: new Date().toISOString(),
    };
    data.farmers.unshift(newFarmer);
    saveVercelDb(data);
    return { lastID: newFarmer.id, changes: 1 };
  }

  if (lowerSql.includes('insert into surveys')) {
    const newSurvey = {
      id: Date.now(),
      farmer_id: params[0],
      visit_date: params[1],
      gps_location: params[2],
      plowing: params[3],
      plowing_count: params[4],
      pesticide_used: params[5],
      pesticide_qty: params[6],
      pesticide_brand: params[7],
      supplement_used: params[8],
      supplement_qty: params[9],
      supplement_brand: params[10],
      fertilizer_used: params[11],
      fertilizer_qty: params[12],
      fertilizer_brand: params[13],
      irrigation_done: params[14],
      irrigation_source: params[15],
      irrigation_type: params[16],
      irrigation_depth: params[17],
      weeding_done: params[18],
      additional_activities: params[19],
      surveyor_id: params[20],
      surveyor_name: params[21],
      created_at: new Date().toISOString(),
    };
    data.surveys.unshift(newSurvey);
    saveVercelDb(data);
    return { lastID: newSurvey.id, changes: 1 };
  }

  if (lowerSql.includes('delete from farmers')) {
    data.farmers = data.farmers.filter((f) => f.farmer_id !== params[0]);
    saveVercelDb(data);
    return { lastID: 0, changes: 1 };
  }

  if (lowerSql.includes('delete from users')) {
    data.users = data.users.filter((u) => u.id !== Number(params[0]));
    saveVercelDb(data);
    return { lastID: 0, changes: 1 };
  }

  return { lastID: 0, changes: 0 };
};

export const initDb = async () => {
  if (!isVercel && db) {
    db.serialize(async () => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'surveyor')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS farmers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          farmer_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          contact TEXT NOT NULL,
          location TEXT NOT NULL,
          gps_location TEXT DEFAULT '',
          date TEXT NOT NULL,
          photo_url TEXT DEFAULT '',
          soil_testing TEXT DEFAULT 'no',
          water_testing TEXT DEFAULT 'no',
          cow_dung_used TEXT DEFAULT 'no',
          cow_dung_qty TEXT DEFAULT '',
          crop TEXT DEFAULT '',
          crop_reason TEXT DEFAULT '',
          area TEXT DEFAULT '',
          sowing_date TEXT DEFAULT '',
          variety TEXT DEFAULT '',
          seed_qty_per_acre TEXT DEFAULT '',
          seed_type TEXT DEFAULT '',
          sowing_type TEXT DEFAULT '',
          harvest_date TEXT DEFAULT '',
          yield TEXT DEFAULT '',
          expert_advice TEXT DEFAULT 'no',
          surveyor_id INTEGER,
          surveyor_name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS surveys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          farmer_id TEXT NOT NULL,
          visit_date TEXT NOT NULL,
          gps_location TEXT DEFAULT '',
          plowing TEXT DEFAULT 'no',
          plowing_count TEXT DEFAULT '0',
          pesticide_used TEXT DEFAULT 'no',
          pesticide_qty TEXT DEFAULT '',
          pesticide_brand TEXT DEFAULT '',
          supplement_used TEXT DEFAULT 'no',
          supplement_qty TEXT DEFAULT '',
          supplement_brand TEXT DEFAULT '',
          fertilizer_used TEXT DEFAULT 'no',
          fertilizer_qty TEXT DEFAULT '',
          fertilizer_brand TEXT DEFAULT '',
          irrigation_done TEXT DEFAULT 'no',
          irrigation_source TEXT DEFAULT '',
          irrigation_type TEXT DEFAULT '',
          irrigation_depth TEXT DEFAULT '',
          weeding_done TEXT DEFAULT 'no',
          additional_activities TEXT DEFAULT '',
          surveyor_id INTEGER,
          surveyor_name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.get('SELECT COUNT(*) as count FROM users', async (err, row) => {
        if (row && row.count === 0) {
          const adminPass = await bcrypt.hash('admin123', 10);
          const surveyorPass = await bcrypt.hash('field123', 10);
          db.run(`INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)`, ['admin', adminPass, 'System Admin', 'admin']);
          db.run(`INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)`, ['surveyor1', surveyorPass, 'Ramesh Kumar', 'surveyor']);
        }
      });
    });
  } else {
    await loadVercelDb();
  }
};

export default db;
