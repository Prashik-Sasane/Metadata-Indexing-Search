const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const { Pool } = require('pg');

// Use DATABASE_URL from environment (docker-compose / .env)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[db] ERROR: DATABASE_URL is missing!");
  process.exit(1);
}

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },  // Required for Supabase
  // family: 4  // Optional extra force IPv4 (only if needed)
});

// Connect DB function
async function connectDB() {
  try {
    const client = await pool.connect();
    console.log("[db] Connected to PostgreSQL");
    client.release();
    return pool;
  } catch (error) {
    console.error("[db] PostgreSQL connection error:", error.message);
    throw error;
  }
}

// Query helper
async function query(text, params) {
  // This codebase uses `?` placeholders in SQL, but node-postgres (`pg`)
  // expects `$1, $2, ...`. Convert them here to keep the rest of the code clean.
  let paramIndex = 0;
  const transformedText = text.replace(/\?/g, () => `$${++paramIndex}`);

  const start = Date.now();
  const result = await pool.query(transformedText, params);
  const duration = Date.now() - start;

  console.log(`[db] Query executed in ${duration} ms`);
  return result;
}

module.exports = {
  connectDB,
  pool,
  query
};