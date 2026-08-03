import pg from 'pg';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PG_URL = 'postgresql://neondb_owner:npg_i7JpMqnZILx9@ep-odd-mud-aysraj8p-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const rawUrl = process.env.DATABASE_URL || DEFAULT_PG_URL;
const connectionString = rawUrl.replace(/&channel_binding=\w+/gi, '').replace(/\?channel_binding=\w+&?/gi, '?');

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
    const pgSql = formatPgSql(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows;
  }
  throw new Error('PostgreSQL Connection Pool not initialized');
};

export const run = async (sql, params = []) => {
  if (pgPool) {
    const pgSql = formatPgSql(sql);
    const res = await pgPool.query(pgSql, params);
    const lastID = res.rows[0]?.id || Date.now();
    return { lastID, changes: res.rowCount || 1 };
  }
  throw new Error('PostgreSQL Connection Pool not initialized');
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
          mobile VARCHAR(50) DEFAULT '',
          raw_passkey VARCHAR(100) DEFAULT 'field123',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR(50) DEFAULT '';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS raw_passkey VARCHAR(100) DEFAULT 'field123';

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
          crop_growth_stage VARCHAR(100) DEFAULT '',
          crop_height VARCHAR(100) DEFAULT '',
          flowering_status VARCHAR(100) DEFAULT '',
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

        -- Automatic migrations
        ALTER TABLE surveys ADD COLUMN IF NOT EXISTS irrigation_depth VARCHAR(100) DEFAULT '';
        ALTER TABLE farmers ADD COLUMN IF NOT EXISTS crop_growth_stage VARCHAR(100) DEFAULT '';
        ALTER TABLE farmers ADD COLUMN IF NOT EXISTS crop_height VARCHAR(100) DEFAULT '';
        ALTER TABLE farmers ADD COLUMN IF NOT EXISTS flowering_status VARCHAR(100) DEFAULT '';
        ALTER TABLE farmers ADD COLUMN IF NOT EXISTS seed_age VARCHAR(100) DEFAULT '';

        CREATE INDEX IF NOT EXISTS idx_farmers_id_desc ON farmers(id DESC);
        CREATE INDEX IF NOT EXISTS idx_farmers_fid ON farmers(farmer_id);
        CREATE INDEX IF NOT EXISTS idx_surveys_fid ON surveys(farmer_id);
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
      }

      console.log('🚀 Neon PostgreSQL Database Ready & Verified!');
    } catch (err) {
      console.error('❌ Neon PG Init Error:', err.message);
    }
  }
};

export default pgPool;
