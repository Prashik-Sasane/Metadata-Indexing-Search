/**
 * Database Migration Runner
 * Executes SQL migration files in order (PostgreSQL compatible)
 */

const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../config/db');

async function runMigrations() {
  console.log('[Migration] Starting migrations...');

  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = await fs.readdir(migrationsDir);
  
  // Filter and sort migration files
  const migrationFiles = files
    .filter(file => file.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  
  try {
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf-8');

      console.log(`[Migration] Running ${file}...`);
      
      try {
        // PostgreSQL can execute multiple statements in one query
        await client.query(sql);
        console.log(`[Migration] ✓ ${file} completed`);
      } catch (error) {
        console.error(`[Migration] ✗ ${file} failed:`, error.message);
        throw error;
      }
    }

    console.log('[Migration] All migrations completed successfully');
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('[Migration] Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };
