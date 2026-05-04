require('dotenv').config();

const dns = require('dns');
const { URL } = require('url');

dns.setDefaultResultOrder('ipv4first');

const { Pool } = require('pg');

// Use DATABASE_URL from environment (docker-compose / .env)
const connectionString = process.env.DATABASE_URL;

let pool = null;
let isConnected = false;

function getSslConfig() {
  const sslMode = (process.env.DATABASE_SSL || '').toLowerCase();

  if (sslMode === 'true' || sslMode === 'require') {
    return { rejectUnauthorized: false };
  }

  if (sslMode === 'false' || sslMode === 'disable') {
    return false;
  }

  try {
    const { hostname } = new URL(connectionString);
    const isLocalHost = ['localhost', '127.0.0.1'].includes(hostname);
    return isLocalHost ? false : undefined;
  } catch (error) {
    return false;
  }
}

// Only create pool if DATABASE_URL is configured
if (connectionString) {
  const poolConfig = { connectionString };
  const sslConfig = getSslConfig();
  if (sslConfig) {
    poolConfig.ssl = sslConfig;
  }
  pool = new Pool(poolConfig);
}

// Connect DB function — graceful failure
async function connectDB() {
  if (!connectionString) {
    console.warn('[db] DATABASE_URL not set — running in DSA-only mode');
    return null;
  }

  try {
    const client = await pool.connect();
    console.log('[db] Connected to PostgreSQL');
    isConnected = true;
    client.release();
    return pool;
  } catch (error) {
    console.warn('[db] PostgreSQL not available — running in DSA-only mode:', error.message);
    isConnected = false;
    return null;
  }
}

// Query helper — returns empty result if DB not available
async function query(text, params) {
  if (!pool || !isConnected) {
    return { rows: [], rowCount: 0 };
  }

  try {
    // Convert ? placeholders to $N for pg
    let paramIndex = 0;
    const transformedText = text.replace(/\?/g, () => `$${++paramIndex}`);

    const start = Date.now();
    const result = await pool.query(transformedText, params);
    const duration = Date.now() - start;

    if (duration > 100) {
      console.log(`[db] Slow query: ${duration}ms`);
    }
    return result;
  } catch (error) {
    console.warn(`[db] Query failed:`, error.message);
    return { rows: [], rowCount: 0 };
  }
}

module.exports = {
  connectDB,
  pool,
  query,
  isConnected: () => isConnected,
};
