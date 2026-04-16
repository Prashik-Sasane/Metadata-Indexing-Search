const mysql = require('mysql2/promise');

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'root',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_DATABASE || 'metadata_search',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'secret',
  connectionLimit: 20, // Maximum number of clients in the pool
  idleTimeout: 30000, // Close idle clients after 30 seconds
  connectTimeout: 2000, // Return an error after 2 seconds if connection could not be established
});

async function connectDB() {
  try {
    const connection = await pool.getConnection();
    console.log('[db] Connected to MySQL');
    connection.release();
    return pool;
  } catch (error) {
    console.error('[db] MySQL connection error:', error.message);
    throw error;
  }
}

// Helper function to execute queries
async function query(text, params) {
  const start = Date.now();
  // MySQL returns [rows, fields] instead of a result object with rows and rowCount
  const [rows] = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('[db] Executed query', { text, duration, rows: rows.length || (rows.affectedRows ? rows.affectedRows : 0) });
  // Map rows property to keep compatibility with existing PG code expectations
  return { rows, rowCount: rows.length || rows.affectedRows || 0 };
}

module.exports = { connectDB, pool, query };
