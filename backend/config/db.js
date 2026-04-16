const { Pool } = require('pg');

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'metadata_search',
  user: process.env.PG_USER || 'admin',
  password: process.env.PG_PASSWORD || 'secret',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

async function connectDB() {
  try {
    const client = await pool.connect();
    console.log('[db] Connected to PostgreSQL');
    client.release();
    return pool;
  } catch (error) {
    console.error('[db] PostgreSQL connection error:', error.message);
    throw error;
  }
}

// Helper function to execute queries
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('[db] Executed query', { text, duration, rows: res.rowCount });
  return res;
}

module.exports = { connectDB, pool, query };
