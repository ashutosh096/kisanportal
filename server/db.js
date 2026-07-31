import pg from 'pg';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PG_URL = 'postgresql://neondb_owner:npg_cjB9kYbn3VOy@ep-odd-mud-aysraj8p-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const connectionString = process.env.DATABASE_URL || DEFAULT_PG_URL;

let pgPool = null;
let sqliteDb = null;
let isVercelJson = false;

// Helper to convert SQLite ? placeholders to PostgreSQL $1, $2, $3...
const formatPgSql = (sql) => {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
};

// 1. Initialize Neon PostgreSQL Connection
try {
  pgPool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  console.log('🐘 Neon PostgreSQL Pool Initialized');
} catch (err) {
  console.warn('⚠️ Failed to initialize PG Pool, falling back to local storage:', err.message);
}

export const query = async (sql, params = []) => {
  if (pgPool) {
    try {
      const pgSql = formatPgSql(sql);
      const res = await pgPool.query(pgSql, params);
      return res.rows;
    } catch (err) {
      console.error('PG Query error, trying SQLite fallback:', err.message);
    }
  }

  if (sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // JSON Fallback
  return loadJsonDbQueries(sql, params);
};

export const run = async (sql, params = []) => {
  if (pgPool) {
    try {
      const pgSql = formatPgSql(sql);
      const res = await pgPool.query(pgSql, params);
      const lastID = res.rows[0]?.id || Date.now();
      return { lastID, changes: res.rowCount || 1 };
    } catch (err) {
      console.error('PG Run error, trying fallback:', err.message);
    }
  }

  if (sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  return saveJsonDbRuns(sql, params);
};

export const initDb = async () => {
  if (pgPool) {
    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(150) NOT NULL,
          role VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS farmers (
          id SERIAL PRIMARY KEY,
          farmer_id VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(150) NOT NULL,
          contact VARCHAR(50) NOT NULL,
          location VARCHAR(255) NOT NULL,
          gps_location VARCHAR(100) DEFAULT '',
          date VARCHAR(50) NOT NULL,
          photo_url TEXT DEFAULT '',
          soil_testing VARCHAR(20) DEFAULT 'no',
          water_testing VARCHAR(20) DEFAULT 'no',
          cow_dung_used VARCHAR(20) DEFAULT 'no',
          cow_dung_qty VARCHAR(100) DEFAULT '',
          crop VARCHAR(100) DEFAULT '',
          crop_reason VARCHAR(255) DEFAULT '',
          area VARCHAR(100) DEFAULT '',
          sowing_date VARCHAR(50) DEFAULT '',
          variety VARCHAR(100) DEFAULT '',
          seed_qty_per_acre VARCHAR(100) DEFAULT '',
          seed_type VARCHAR(100) DEFAULT '',
          sowing_type VARCHAR(100) DEFAULT '',
          harvest_date VARCHAR(50) DEFAULT '',
          yield VARCHAR(100) DEFAULT '',
          expert_advice VARCHAR(20) DEFAULT 'no',
          surveyor_id INT,
          surveyor_name VARCHAR(150) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS surveys (
          id SERIAL PRIMARY KEY,
          farmer_id VARCHAR(50) NOT NULL,
          visit_date VARCHAR(50) NOT NULL,
          gps_location VARCHAR(100) DEFAULT '',
          plowing VARCHAR(20) DEFAULT 'no',
          plowing_count VARCHAR(50) DEFAULT '0',
          pesticide_used VARCHAR(20) DEFAULT 'no',
          pesticide_qty VARCHAR(100) DEFAULT '',
          pesticide_brand VARCHAR(100) DEFAULT '',
          supplement_used VARCHAR(20) DEFAULT 'no',
          supplement_qty VARCHAR(100) DEFAULT '',
          supplement_brand VARCHAR(100) DEFAULT '',
          fertilizer_used VARCHAR(20) DEFAULT 'no',
          fertilizer_qty VARCHAR(100) DEFAULT '',
          fertilizer_brand VARCHAR(100) DEFAULT '',
          irrigation_done VARCHAR(20) DEFAULT 'no',
          irrigation_source VARCHAR(100) DEFAULT '',
          irrigation_type VARCHAR(100) DEFAULT '',
          irrigation_depth VARCHAR(100) DEFAULT '',
          weeding_done VARCHAR(20) DEFAULT 'no',
          additional_activities TEXT DEFAULT '',
          surveyor_id INT,
          surveyor_name VARCHAR(150) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Seed initial users if table is empty
      const userCheck = await pgPool.query('SELECT COUNT(*) FROM users');
      if (parseInt(userCheck.rows[0].count, 10) === 0) {
        const adminPass = await bcrypt.hash('admin123', 10);
        const surveyorPass = await bcrypt.hash('field123', 10);

        await pgPool.query(
          `INSERT INTO users (username, password_hash, name, role) VALUES 
           ($1, $2, $3, $4),
           ($5, $6, $7, $8),
           ($9, $10, $11, $12),
           ($13, $14, $15, $16)`,
          [
            'admin', adminPass, 'System Admin', 'admin',
            'surveyor1', surveyorPass, 'Ramesh Kumar', 'surveyor',
            'ashu01', surveyorPass, 'Ashutosh Mishra', 'surveyor',
            'krissh', surveyorPass, 'Krish Verma', 'surveyor'
          ]
        );
        console.log('✅ Neon PostgreSQL Initial Users Seeded Successfully');
      }

      console.log('🚀 Neon PostgreSQL Database Ready & Verified!');
      return;
    } catch (err) {
      console.error('❌ Neon PG Init Error, initializing SQLite/JSON fallback:', err);
    }
  }

  // Fallback to native SQLite
  try {
    const sqliteModule = await import('sqlite3');
    const sqlite3 = sqliteModule.default || sqliteModule;
    const dbPath = path.join(__dirname, 'farmer_survey.db');
    sqliteDb = new sqlite3.Database(dbPath);
    console.log('📁 Using local SQLite driver');
  } catch (e) {
    isVercelJson = true;
    console.log('📄 Using JSON file driver');
  }
};

// JSON Fallback Helpers
const vercelDbPath = '/tmp/farmer_data.json';
const loadJsonDb = async () => {
  try {
    if (fs.existsSync(vercelDbPath)) {
      return JSON.parse(fs.readFileSync(vercelDbPath, 'utf8'));
    }
  } catch (e) {}
  const adminPass = await bcrypt.hash('admin123', 10);
  const surveyorPass = await bcrypt.hash('field123', 10);
  return {
    users: [
      { id: 1, username: 'admin', password_hash: adminPass, name: 'System Admin', role: 'admin' },
      { id: 2, username: 'surveyor1', password_hash: surveyorPass, name: 'Ramesh Kumar', role: 'surveyor' },
    ],
    farmers: [],
    surveys: [],
  };
};

const saveJsonDb = (data) => {
  try {
    fs.writeFileSync(vercelDbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
};

const loadJsonDbQueries = async (sql, params) => {
  const data = await loadJsonDb();
  const lower = sql.toLowerCase();
  if (lower.includes('from users')) {
    let list = [...data.users];
    if (lower.includes("role = 'surveyor'")) list = list.filter((u) => u.role === 'surveyor');
    if (lower.includes('where username =')) list = list.filter((u) => u.username === params[0]);
    if (lower.includes('count(*)')) return [{ count: list.length }];
    return list;
  }
  if (lower.includes('from farmers')) {
    let list = [...data.farmers];
    if (lower.includes('where farmer_id =')) list = list.filter((f) => f.farmer_id === params[0]);
    if (lower.includes('count(*)')) return [{ count: list.length }];
    return list;
  }
  if (lower.includes('from surveys')) {
    let list = [...data.surveys];
    if (lower.includes('where farmer_id =')) list = list.filter((s) => s.farmer_id === params[0]);
    return list;
  }
  return [];
};

const saveJsonDbRuns = async (sql, params) => {
  const data = await loadJsonDb();
  const lower = sql.toLowerCase();
  if (lower.includes('insert into farmers')) {
    const newF = { farmer_id: params[0], name: params[1], contact: params[2], location: params[3], gps_location: params[4], date: params[5], photo_url: params[6] };
    data.farmers.unshift(newF);
    saveJsonDb(data);
    return { lastID: Date.now(), changes: 1 };
  }
  return { lastID: 0, changes: 0 };
};

export default pgPool;
