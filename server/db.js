import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.VERCEL ? '/tmp/farmer_survey.db' : path.join(__dirname, 'farmer_survey.db');

const db = new sqlite3.Database(dbPath);

export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const initDb = async () => {
  db.serialize(async () => {
    // 1. Users table
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

    // 2. Farmers Registration table (with photo_url & gps_location)
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

    // Auto-migrations for existing DBs
    db.run(`ALTER TABLE farmers ADD COLUMN photo_url TEXT DEFAULT ''`, () => {});
    db.run(`ALTER TABLE farmers ADD COLUMN gps_location TEXT DEFAULT ''`, () => {});

    // 3. Surveys Visit table (with gps_location)
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (farmer_id) REFERENCES farmers(farmer_id)
      )
    `);

    db.run(`ALTER TABLE surveys ADD COLUMN gps_location TEXT DEFAULT ''`, () => {});

    // Seed default accounts if empty
    db.get('SELECT COUNT(*) as count FROM users', async (err, row) => {
      if (row && row.count === 0) {
        const adminPass = await bcrypt.hash('admin123', 10);
        const surveyorPass = await bcrypt.hash('field123', 10);

        db.run(
          `INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)`,
          ['admin', adminPass, 'System Admin', 'admin']
        );
        db.run(
          `INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)`,
          ['surveyor1', surveyorPass, 'Ramesh Kumar', 'surveyor']
        );
        console.log('✅ Default users seeded: admin / admin123 & surveyor1 / field123');
      }
    });
  });
};

export default db;
