/**
 * Data Seeder - Generate millions of test files for demo
 * Run: node backend/scripts/seed-data.js
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Database configuration (Supabase compatible)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_DATABASE || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Sample data pools
const FILE_NAMES = [
  'document', 'report', 'presentation', 'spreadsheet', 'image',
  'video', 'audio', 'archive', 'database', 'backup',
  'config', 'log', 'source-code', 'binary', 'library',
  'certificate', 'invoice', 'contract', 'manual', 'tutorial',
  'dataset', 'model', 'checkpoint', 'snapshot', 'export',
  'import', 'migration', 'schema', 'index', 'cache',
];

const FILE_EXTENSIONS = [
  '.pdf', '.docx', '.xlsx', '.pptx', '.txt', '.csv', '.json',
  '.xml', '.jpg', '.png', '.mp4', '.mp3', '.zip', '.tar.gz',
  '.sql', '.db', '.log', '.py', '.js', '.ts', '.java', '.cpp',
];

const MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.zip': 'application/zip',
  '.sql': 'application/sql',
  '.py': 'text/x-python',
  '.js': 'application/javascript',
  '.ts': 'application/typescript',
};

const TAGS_POOL = [
  'important', 'draft', 'reviewed', 'archived', 'confidential',
  'public', 'internal', 'external', 'urgent', 'pending',
  'completed', 'active', 'deprecated', 'legacy', 'production',
  'staging', 'development', 'testing', 'backup', 'primary',
  'secondary', 'tertiary', 'critical', 'optional', 'required',
  '2023', '2024', '2025', '2026', 'Q1', 'Q2', 'Q3', 'Q4',
  'finance', 'engineering', 'marketing', 'sales', 'hr',
  'legal', 'compliance', 'security', 'operations', 'research',
];

const S3_BUCKETS = [
  'prod-data-storage',
  'dev-environment',
  'backup-archive',
  'user-uploads',
  'system-logs',
  'analytics-data',
  'ml-models',
  'customer-documents',
];

const OWNERS = [
  'user-alice', 'user-bob', 'user-charlie', 'user-diana',
  'user-eve', 'user-frank', 'user-grace', 'user-henry',
  'service-api', 'service-worker', 'service-cron', 'service-backup',
];

/**
 * Generate random file metadata
 */
function generateFile(index) {
  const nameBase = FILE_NAMES[Math.floor(Math.random() * FILE_NAMES.length)];
  const ext = FILE_EXTENSIONS[Math.floor(Math.random() * FILE_EXTENSIONS.length)];
  const name = `${nameBase}-${index}${ext}`;
  
  const sizeRanges = [
    { min: 1024, max: 102400 },           // 1KB - 100KB
    { min: 102400, max: 1048576 },        // 100KB - 1MB
    { min: 1048576, max: 10485760 },      // 1MB - 10MB
    { min: 10485760, max: 104857600 },    // 10MB - 100MB
    { min: 104857600, max: 1073741824 },  // 100MB - 1GB
  ];
  
  const sizeRange = sizeRanges[Math.floor(Math.random() * sizeRanges.length)];
  const size = Math.floor(Math.random() * (sizeRange.max - sizeRange.min) + sizeRange.min);
  
  const bucket = S3_BUCKETS[Math.floor(Math.random() * S3_BUCKETS.length)];
  const s3Key = `${bucket}/${nameBase}/${name}`;
  
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
  const owner = OWNERS[Math.floor(Math.random() * OWNERS.length)];
  
  // Random tags (1-5 tags per file)
  const numTags = Math.floor(Math.random() * 5) + 1;
  const tags = {};
  for (let i = 0; i < numTags; i++) {
    const tag = TAGS_POOL[Math.floor(Math.random() * TAGS_POOL.length)];
    tags[tag] = true;
  }
  
  // Random date in the last 2 years
  const now = Date.now();
  const twoYearsAgo = now - (2 * 365 * 24 * 60 * 60 * 1000);
  const createdAt = new Date(Math.random() * (now - twoYearsAgo) + twoYearsAgo);
  
  return {
    id: uuidv4(),
    s3_key: s3Key,
    bucket: bucket,
    name: name,
    size: size,
    mime_type: mimeType,
    owner_id: owner,
    created_at: createdAt,
    updated_at: new Date(),
    tags: tags,
    custom: {},
  };
}

/**
 * Insert files in batches
 */
async function insertBatch(files) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Insert files
    for (const f of files) {
      await client.query(
        `INSERT INTO files (id, s3_key, bucket, name, size, mime_type, owner_id, created_at, updated_at, is_deleted)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [f.id, f.s3_key, f.bucket, f.name, f.size, f.mime_type, f.owner_id, f.created_at, f.updated_at, false]
      );
      
      // Insert metadata
      await client.query(
        `INSERT INTO file_metadata (file_id, tags, custom) VALUES ($1, $2, $3)`,
        [f.id, JSON.stringify(f.tags), JSON.stringify(f.custom)]
      );
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Main seeder function
 */
async function seedData(numFiles = 10000) {
  console.log(`🚀 Starting data seeder: ${numFiles.toLocaleString()} files`);
  console.log(`📊 Database: ${process.env.DB_HOST || 'localhost'}/${process.env.DB_DATABASE || 'postgres'}`);
  
  try {
    const batchSize = 100; // Insert 100 files at a time for PostgreSQL
    const totalBatches = Math.ceil(numFiles / batchSize);
    
    console.log(`📦 Total batches: ${totalBatches}`);
    console.log(`⏱️  Estimated time: ~${Math.ceil(totalBatches * 0.3)} seconds\n`);
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const start = batch * batchSize;
      const end = Math.min(start + batchSize, numFiles);
      const files = [];
      
      for (let i = start; i < end; i++) {
        files.push(generateFile(i));
      }
      
      await insertBatch(files);
      
      if ((batch + 1) % 10 === 0 || batch === totalBatches - 1) {
        const progress = ((batch + 1) / totalBatches * 100).toFixed(1);
        console.log(`✅ Batch ${batch + 1}/${totalBatches} (${progress}%) - ${end.toLocaleString()} files inserted`);
      }
    }
    
    // Verify
    const result = await pool.query('SELECT COUNT(*) as count FROM files');
    console.log(`\n🎉 Seeding complete! Total files in database: ${parseInt(result.rows[0].count).toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  const numFiles = parseInt(process.argv[2]) || 10000;
  seedData(numFiles)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedData };
