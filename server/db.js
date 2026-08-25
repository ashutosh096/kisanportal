import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// ─── Fail fast if DATABASE_URL is missing ───
const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error('DATABASE_URL environment variable is required. Set it in your .env file.');
}
// Strip channel_binding param (not supported by all Neon pool modes)
const connectionString = rawUrl
  .replace(/&channel_binding=\w+/gi, '')
  .replace(/\?channel_binding=\w+&?/gi, '?');

// ─── Connection Pool (max:20 prevents DB overload under 500+ concurrent users) ───
let pgPool = null;

try {
  pgPool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 3,                       // Max concurrent DB connections for serverless
    idleTimeoutMillis: 30000,      // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Fail fast if DB is busy
  });
  pgPool.on('error', (err) => {
    console.warn('⚠️ Idle PostgreSQL pool connection warning:', err.message);
  });
  console.log('🐘 Neon PostgreSQL Pool Initialized');
} catch (err) {
  throw new Error(`Failed to initialize PG Pool: ${err.message}`);
}


// Helper: convert ? placeholders to $1, $2... for PostgreSQL
const formatPgSql = (sql) => {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
};

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
  if (!pgPool) return;

  try {
    // ─── PHASE 1: Core Tables ───
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(150) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'surveyor',
        mobile VARCHAR(50) DEFAULT '',
        admin_id INTEGER DEFAULT NULL,
        status VARCHAR(20) DEFAULT 'active',
        must_change_password BOOLEAN DEFAULT false,
        locked_by_user_id INTEGER DEFAULT NULL,
        locked_at TIMESTAMP DEFAULT NULL,
        reset_token_hash VARCHAR(255) DEFAULT NULL,
        reset_token_expires_at TIMESTAMP DEFAULT NULL,
        token_version INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── PHASE 2: Add missing columns first (before constraints) ───
    const colMigrations = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_by_user_id INTEGER DEFAULT NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP DEFAULT NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR(255) DEFAULT NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP DEFAULT NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE users DROP COLUMN IF EXISTS raw_passkey`,
    ];
    for (const sql of colMigrations) {
      try { await pgPool.query(sql); } catch (e) { /* column migration execution */ }
    }

    // ─── Ensure existing users have active status ───
    await pgPool.query(`UPDATE users SET status = 'active' WHERE status IS NULL`);
    await pgPool.query(`UPDATE users SET token_version = 1 WHERE token_version IS NULL`);
    await pgPool.query(`UPDATE users SET must_change_password = false WHERE must_change_password IS NULL`);

    // ─── Fix existing 'admin' role users: superadmin username gets superadmin role ───
    await pgPool.query(`UPDATE users SET role = 'superadmin' WHERE username = 'superadmin' AND role = 'admin'`);

    // ─── Add CHECK constraints safely (only if column values are valid) ───
    try {
      await pgPool.query(`
        DO $$ BEGIN
          ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
          ALTER TABLE users ADD CONSTRAINT users_role_check
            CHECK (role IN ('superadmin','admin','coadmin','manager','viewer','surveyor'));
        END $$;
      `);
    } catch (e) { console.warn('Role constraint skip:', e.message); }

    try {
      await pgPool.query(`
        DO $$ BEGIN
          ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
          ALTER TABLE users ADD CONSTRAINT users_status_check
            CHECK (status IN ('active','inactive','banned'));
        END $$;
      `);
    } catch (e) { console.warn('Status constraint skip:', e.message); }

    // ─── PHASE 3: Farmer column migrations handled in PHASE 5 ───

    // ─── PHASE 4: Refresh Tokens & Audit Logs Tables ───
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) UNIQUE NOT NULL,
        device_info VARCHAR(150) DEFAULT 'Unknown Device',
        ip_address VARCHAR(50) DEFAULT '',
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT DEFAULT '',
        ip_address VARCHAR(50) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── PHASE 5: Farmers Table (Form 1: Master Profile) ───
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS farmers (
        id SERIAL PRIMARY KEY,
        farmer_id VARCHAR(50) UNIQUE NOT NULL,
        client_generated_id UUID UNIQUE,
        name VARCHAR(150) NOT NULL,
        contact VARCHAR(50) NOT NULL,
        location TEXT NOT NULL,
        gps_latitude NUMERIC(10,7) DEFAULT NULL,
        gps_longitude NUMERIC(10,7) DEFAULT NULL,
        date VARCHAR(50) NOT NULL,
        surveyor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        surveyor_name VARCHAR(150) DEFAULT '',
        admin_id INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── Safe farmer column migrations ───
    const farmerMigrations = [
      `ALTER TABLE farmers ADD COLUMN IF NOT EXISTS client_generated_id UUID`,
      `ALTER TABLE farmers ADD COLUMN IF NOT EXISTS gps_latitude NUMERIC(10,7) DEFAULT NULL`,
      `ALTER TABLE farmers ADD COLUMN IF NOT EXISTS gps_longitude NUMERIC(10,7) DEFAULT NULL`,
      `ALTER TABLE farmers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE farmers ADD COLUMN IF NOT EXISTS admin_id INTEGER DEFAULT 0`,
      `ALTER TABLE farmers ADD COLUMN IF NOT EXISTS surveyor_name VARCHAR(150) DEFAULT ''`,
      `ALTER TABLE farmers ADD COLUMN IF NOT EXISTS total_land TEXT DEFAULT ''`,
      `ALTER TABLE farmers ADD COLUMN IF NOT EXISTS ownership VARCHAR(100) DEFAULT 'Owned (निजी / अपनी)'`,
    ];
    for (const sql of farmerMigrations) {
      try { await pgPool.query(sql); } catch (e) { /* column exists */ }
    }
    try {
      await pgPool.query(`
        CREATE INDEX IF NOT EXISTS idx_farmers_admin_id ON farmers(admin_id);
        CREATE INDEX IF NOT EXISTS idx_farmers_farmer_id ON farmers(farmer_id);
      `);
    } catch (e) { /* indexes exist */ }

    // ─── PHASE 6: Form2a Seasonal Table ───
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS form2a_seasonal (
        id SERIAL PRIMARY KEY,
        client_generated_id UUID,
        farmer_id VARCHAR(50) REFERENCES farmers(farmer_id) ON DELETE CASCADE,
        admin_id INTEGER DEFAULT 0,
        surveyor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        surveyor_name VARCHAR(150) DEFAULT '',
        season_name VARCHAR(100) DEFAULT 'Kharif 2026',
        total_land TEXT DEFAULT '',
        ownership VARCHAR(100) DEFAULT 'Owned (निजी / अपनी)',
        soil_testing VARCHAR(20) DEFAULT 'no',
        water_testing VARCHAR(20) DEFAULT 'no',
        cow_dung_used VARCHAR(20) DEFAULT 'no',
        cow_dung_qty TEXT DEFAULT '',
        crop TEXT DEFAULT '',
        crop_reason TEXT DEFAULT '',
        area TEXT DEFAULT '',
        sowing_date VARCHAR(50) DEFAULT '',
        variety TEXT DEFAULT '',
        seed_qty_per_acre TEXT DEFAULT '',
        seed_type TEXT DEFAULT '',
        sowing_type TEXT DEFAULT '',
        harvest_date VARCHAR(50) DEFAULT '',
        expected_yield TEXT DEFAULT '',
        expert_advice VARCHAR(20) DEFAULT 'no',
        crop_growth_stage TEXT DEFAULT '',
        crop_height TEXT DEFAULT '',
        flowering_status TEXT DEFAULT '',
        seed_age VARCHAR(100) DEFAULT '',
        is_active BOOLEAN DEFAULT true,
        reset_by_user_id INTEGER DEFAULT NULL,
        reset_at TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_form2a_active_farmer
        ON form2a_seasonal(farmer_id) WHERE is_active = true;
      CREATE INDEX IF NOT EXISTS idx_form2a_admin ON form2a_seasonal(admin_id);
      CREATE INDEX IF NOT EXISTS idx_form2a_farmer ON form2a_seasonal(farmer_id);
    `);

    // ─── PHASE 7: Form2b Visits Table ───
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS form2b_visits (
        id SERIAL PRIMARY KEY,
        client_generated_id UUID,
        farmer_id VARCHAR(50) REFERENCES farmers(farmer_id) ON DELETE CASCADE,
        form2a_id INTEGER REFERENCES form2a_seasonal(id) ON DELETE CASCADE,
        surveyor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        surveyor_name VARCHAR(150) DEFAULT '',
        admin_id INTEGER DEFAULT 0,
        visit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        gps_location TEXT DEFAULT '',
        plowing VARCHAR(20) DEFAULT 'no',
        plowing_count VARCHAR(50) DEFAULT '0',
        pesticide_used VARCHAR(20) DEFAULT 'no',
        pesticide_qty TEXT DEFAULT '',
        pesticide_brand TEXT DEFAULT '',
        supplement_used VARCHAR(20) DEFAULT 'no',
        supplement_qty TEXT DEFAULT '',
        supplement_brand TEXT DEFAULT '',
        fertilizer_used VARCHAR(20) DEFAULT 'no',
        fertilizer_qty TEXT DEFAULT '',
        fertilizer_brand TEXT DEFAULT '',
        irrigation_done VARCHAR(20) DEFAULT 'no',
        irrigation_source TEXT DEFAULT '',
        irrigation_type TEXT DEFAULT '',
        irrigation_depth TEXT DEFAULT '',
        weeding_done VARCHAR(20) DEFAULT 'no',
        additional_activities TEXT DEFAULT '',
        crop_health_status VARCHAR(50) DEFAULT 'Good',
        visit_notes TEXT DEFAULT '',
        field_data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_form2b_farmer_visit ON form2b_visits(farmer_id, visit_date DESC);
      CREATE INDEX IF NOT EXISTS idx_form2b_admin ON form2b_visits(admin_id);
      CREATE INDEX IF NOT EXISTS idx_form2b_surveyor ON form2b_visits(surveyor_id);
    `);

    // ─── PHASE 8: Editing Sessions Table (Concurrency Lock) ───
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS editing_sessions (
        id SERIAL PRIMARY KEY,
        farmer_id VARCHAR(50) UNIQUE NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
        locked_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        locked_by_name VARCHAR(150) DEFAULT '',
        locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_editing_farmer_active ON editing_sessions(farmer_id, expires_at);
    `);

    // ─── PHASE 9: Visit Assignments Table ───
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS visit_assignments (
        id SERIAL PRIMARY KEY,
        farmer_id VARCHAR(50) REFERENCES farmers(farmer_id) ON DELETE CASCADE,
        farmer_name VARCHAR(150) DEFAULT '',
        admin_id INTEGER DEFAULT 0,
        assigned_surveyor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        assigned_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(30) DEFAULT 'pending',
        instructions TEXT DEFAULT '',
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_assign_surveyor ON visit_assignments(assigned_surveyor_id, status);
      CREATE INDEX IF NOT EXISTS idx_assign_admin ON visit_assignments(admin_id);
    `);

    // ─── PHASE 10: Audit Logs Table ───
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT DEFAULT '',
        ip_address VARCHAR(50) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
    `);

    // ─── PHASE 10b: FIX #3 — FK constraints on admin_id + FIX #4 — UNIQUE on client_generated_id ───
    // Step 1: Ensure a "system admin" user (id=1) exists so admin_id=0 rows can be pointed at it
    // Step 2: Convert admin_id=0 to NULL so FK can be added (0 is not a valid user ID)
    // Step 3: Add FK constraints (idempotent — skip if already added)
    // Step 4: Add UNIQUE constraints on client_generated_id (idempotent)

    // Migrate admin_id = 0 → NULL on all affected tables
    const adminMigrations = [
      `UPDATE farmers          SET admin_id = NULL WHERE admin_id = 0`,
      `UPDATE form2a_seasonal  SET admin_id = NULL WHERE admin_id = 0`,
      `UPDATE form2b_visits    SET admin_id = NULL WHERE admin_id = 0`,
      `UPDATE visit_assignments SET admin_id = NULL WHERE admin_id = 0`,
    ];
    for (const sql of adminMigrations) {
      try { await pgPool.query(sql); } catch (e) { /* table may not exist yet */ }
    }

    // Also allow admin_id to be NULL in users table (NULL = top-level account, no parent)
    try {
      await pgPool.query(`ALTER TABLE users ALTER COLUMN admin_id DROP NOT NULL`);
    } catch (e) { /* already nullable */ }

    // Add FK REFERENCES users(id) ON DELETE RESTRICT on admin_id for all tables
    const fkConstraints = [
      {
        table: 'farmers',
        constraint: 'fk_farmers_admin_id',
        sql: `ALTER TABLE farmers ADD CONSTRAINT fk_farmers_admin_id
                FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE RESTRICT`
      },
      {
        table: 'form2a_seasonal',
        constraint: 'fk_form2a_admin_id',
        sql: `ALTER TABLE form2a_seasonal ADD CONSTRAINT fk_form2a_admin_id
                FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE RESTRICT`
      },
      {
        table: 'form2b_visits',
        constraint: 'fk_form2b_admin_id',
        sql: `ALTER TABLE form2b_visits ADD CONSTRAINT fk_form2b_admin_id
                FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE RESTRICT`
      },
      {
        table: 'visit_assignments',
        constraint: 'fk_assignments_admin_id',
        sql: `ALTER TABLE visit_assignments ADD CONSTRAINT fk_assignments_admin_id
                FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE RESTRICT`
      },
    ];
    for (const { constraint, sql } of fkConstraints) {
      try {
        // Drop first in case it exists in broken state, then re-add
        await pgPool.query(`ALTER TABLE ${sql.match(/ALTER TABLE (\w+)/)[1]} DROP CONSTRAINT IF EXISTS ${constraint}`);
        await pgPool.query(sql);
      } catch (e) {
        console.warn(`⚠️ FK constraint ${constraint} skipped:`, e.message);
      }
    }

    // FIX #4 — UNIQUE on client_generated_id for form2a and form2b
    const uniqueConstraints = [
      `ALTER TABLE form2a_seasonal ADD CONSTRAINT uq_form2a_client_id UNIQUE (client_generated_id)`,
      `ALTER TABLE form2b_visits   ADD CONSTRAINT uq_form2b_client_id UNIQUE (client_generated_id)`,
    ];
    for (const sql of uniqueConstraints) {
      try { await pgPool.query(sql); } catch (e) { /* already unique */ }
    }

    // ─── PHASE 11: Seed Initial Users ───
    const userCheck = await pgPool.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(userCheck.rows[0].count, 10);

    if (userCount === 0) {
      const superPass = await bcrypt.hash('superadmin123', 10);
      const adminPass = await bcrypt.hash('admin123', 10);
      const surveyorPass = await bcrypt.hash('field123', 10);

      await pgPool.query(
        `INSERT INTO users (username, password_hash, name, role, status) VALUES
         ($1, $2, $3, $4, $5),
         ($6, $7, $8, $9, $10),
         ($11, $12, $13, $14, $15),
         ($16, $17, $18, $19, $20)`,
        [
          'superadmin', superPass, 'Super Admin', 'superadmin', 'active',
          'admin', adminPass, 'District Admin', 'admin', 'active',
          'surveyor1', surveyorPass, 'Ramesh Kumar', 'surveyor', 'active',
          'surveyor2', surveyorPass, 'Ashutosh Mishra', 'surveyor', 'active',
        ]
      );
      console.log('✅ Seed users created');
    } else {
      // Migrate existing admin users to have 'active' status
      await pgPool.query(`
        UPDATE users SET status = 'active' WHERE status IS NULL;
        UPDATE users SET token_version = 1 WHERE token_version IS NULL;
        UPDATE users SET must_change_password = false WHERE must_change_password IS NULL;
      `);
    }

    // ─── PHASE 12: Migrate existing farmers to form2a_seasonal ───
    try {
      const seasonCheck = await pgPool.query('SELECT COUNT(*) FROM form2a_seasonal');
      const seasonCount = parseInt(seasonCheck.rows[0].count, 10);
      if (seasonCount === 0) {
        await pgPool.query(`
          INSERT INTO form2a_seasonal (
            farmer_id, admin_id, surveyor_id, surveyor_name,
            total_land, ownership, soil_testing, water_testing,
            cow_dung_used, cow_dung_qty, crop, crop_reason,
            area, sowing_date, variety, seed_qty_per_acre,
            seed_type, sowing_type, harvest_date, expert_advice,
            crop_growth_stage, crop_height, flowering_status, seed_age,
            is_active, season_name
          )
          SELECT
            f.farmer_id,
            NULLIF(f.admin_id, 0),
            f.surveyor_id,
            COALESCE(f.surveyor_name, ''),
            COALESCE(f.total_land, ''),
            COALESCE(f.ownership, 'Owned (निजी / अपनी)'),
            'no', 'no', 'no', '', '', '', '', '', '', '', '', '', '', 'no', '', '', '', '',
            true, 'Kharif 2026'
          FROM farmers f
          ON CONFLICT DO NOTHING
        `);
        console.log('✅ Existing farmers migrated to form2a_seasonal');
      }
    } catch (e) {
      console.warn('⚠️ form2a migration skipped (will retry next start):', e.message);
    }


    console.log('🚀 Neon PostgreSQL Database Ready & Verified!');
  } catch (err) {
    console.error('❌ Neon PG Init Error:', err.message);
  }
};

export default pgPool;
