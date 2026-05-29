const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.PGSTRING || '';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS portals (
      id SERIAL PRIMARY KEY,
      name TEXT,
      base_url TEXT NOT NULL UNIQUE,
      primary_flag BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT now()
    );
  `);
}

module.exports = { pool, ensureTable };
