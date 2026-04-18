# 🚀 Supabase Setup Guide

Complete guide to setting up PostgreSQL database with Supabase for your Metadata Search Engine.

---

## Why Supabase?

✅ **Free tier**: 500MB database, 2 projects  
✅ **PostgreSQL**: Full-featured relational database  
✅ **Auto-scaling**: Grows with your needs  
✅ **Built-in API**: RESTful and GraphQL APIs  
✅ **Row Level Security**: Built-in auth and permissions  
✅ **Dashboard**: Easy-to-use UI for managing data  
✅ **Backups**: Automatic daily backups  

---

## Step 1: Create Supabase Account

### 1.1 Sign Up
1. Go to https://supabase.com
2. Click **Start your project**
3. Sign up with GitHub, Google, or Email
4. Verify your email

### 1.2 Create New Project
1. Click **New Project**
2. Configure:
   - **Name**: `metadata-search`
   - **Database Password**: (create a strong password - save this!)
   - **Region**: Choose closest to you (e.g., US East)
   - **Pricing Plan**: Free
3. Click **Create new project**
4. Wait 2-3 minutes for setup

---

## Step 2: Get Connection Details

### 2.1 Database Credentials
After project is created:

1. Go to **Settings** (gear icon in sidebar)
2. Click **Database**
3. Copy these values:
   ```
   Host: db.xxxxxxxxx.supabase.co
   Port: 5432
   Database: postgres
   User: postgres
   Password: (your password from step 1.2)
   ```

### 2.2 Connection String
You'll also see a connection string like:
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxx.supabase.co:5432/postgres
```

---

## Step 3: Configure Backend

### 3.1 Update .env File
Create or edit `backend/.env`:

```env
# Node Environment
NODE_ENV=development
PORT=3000

# PostgreSQL / Supabase Database
DB_HOST=db.xxxxxxxxx.supabase.co
DB_PORT=5432
DB_DATABASE=postgres
DB_USER=postgres
DB_PASSWORD=your_supabase_password

# AWS S3 (Optional - for file storage)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1

# CORS (for frontend)
CORS_ORIGIN=http://localhost:5173
```

**⚠️ IMPORTANT:**
- Replace `db.xxxxxxxxx.supabase.co` with your actual Supabase host
- Replace `your_supabase_password` with your actual password

---

## Step 4: Install Dependencies

```bash
cd backend

# Install pg (PostgreSQL client)
npm install pg

# Remove mysql2 (no longer needed)
npm uninstall mysql2
```

**Or just reinstall all dependencies:**
```bash
npm install
```

---

## Step 5: Run Migrations

### Option A: Using Migration Script
```bash
cd backend
npm run migrate
```

### Option B: Using Supabase SQL Editor
1. Go to Supabase Dashboard
2. Click **SQL Editor** in sidebar
3. Click **New query**
4. Copy content from `backend/migrations/001_create_tables.sql`
5. Click **Run**
6. Verify tables created successfully

---

## Step 6: Seed Data

### Quick Setup
```bash
# Double-click this file:
setup-demo.bat
```

### Manual Setup
```bash
cd backend

# Seed 10,000 files (quick demo)
node scripts/seed-data.js 10000

# Seed 100,000 files (standard demo)
node scripts/seed-data.js 100000

# Seed 1,000,000 files (impressive demo)
node scripts/seed-data.js 1000000
```

---

## Step 7: Start Backend

```bash
cd backend
npm start
```

You should see:
```
[db] Connected to PostgreSQL
[IndexManager] Singleton created
[IndexManager] Initializing...
[IndexManager] Initialized successfully
[api] Starting server...
[api] Listening on port 3000
[api] Environment: development
```

---

## Step 8: Test Connection

### Test Database
```bash
# Using Supabase Dashboard
1. Go to Table Editor
2. Click on 'files' table
3. You should see seeded data
```

### Test API
```bash
# Test search endpoint
curl "http://localhost:3000/api/v1/search?prefix=document"

# Get statistics
curl http://localhost:3000/api/v1/search/stats
```

---

## 🎯 Supabase Features You Can Use

### 1. Table Editor
- View and edit data visually
- Filter and sort data
- Export to CSV

### 2. SQL Editor
- Run custom queries
- Test indexes
- Analyze performance

### 3. API Auto-generation
Supabase automatically creates REST APIs for your tables:

```bash
# Get all files
GET https://xxxxxxxxx.supabase.co/rest/v1/files

# Filter by size
GET https://xxxxxxxxx.supabase.co/rest/v1/files?size=gte.1000000

# Search by name
GET https://xxxxxxxxx.supabase.co/rest/v1/files?name=ilike.*document*
```

**API Key:** Found in Settings → API

### 4. Real-time Subscriptions
Listen to database changes:
```javascript
const channel = supabase
  .channel('files')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'files' },
    (payload) => console.log('Change received!', payload)
  )
  .subscribe()
```

### 5. Database Backups
- Automatic daily backups (Free tier)
- Manual backups on demand
- Point-in-time recovery (Pro tier)

---

## 📊 Database Schema (PostgreSQL Optimized)

### Tables Created:
1. **files** - Core file metadata
2. **file_metadata** - JSONB tags and custom metadata
3. **users** - User accounts
4. **audit_log** - Change tracking
5. **index_snapshots** - DSA index checkpoints

### PostgreSQL-Specific Optimizations:

#### UUID Primary Keys
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```
- Better for distributed systems
- No auto-increment conflicts
- Supabase generates automatically

#### JSONB Columns
```sql
tags JSONB,
custom JSONB
```
- Binary JSON format (faster than JSON)
- Supports indexing
- Rich query capabilities

#### GIN Index on JSONB
```sql
CREATE INDEX idx_file_metadata_tags ON file_metadata USING GIN (tags);
```
- **Super fast tag searches!**
- Example query:
  ```sql
  SELECT * FROM file_metadata 
  WHERE tags @> '{"important": true}';
  ```

#### Timestamps with Timezone
```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
```
- Always stores UTC
- Automatic timezone conversion
- Better for global apps

#### Auto-updating Trigger
```sql
CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```
- Automatically updates `updated_at` on changes
- No need to manually set it

---

## 🔍 PostgreSQL vs MySQL Improvements

| Feature | MySQL | PostgreSQL | Benefit |
|---------|-------|------------|---------|
| JSON Type | JSON | **JSONB** | 2-3x faster queries |
| Indexing | Basic | **GIN indexes** | Fast JSONB searches |
| UUID | Manual | **gen_random_uuid()** | Auto-generation |
| Arrays | No | **Native arrays** | Better for tags |
| Full-text | Limited | **Excellent** | Built-in search |
| Concurrency | Table locks | **MVCC** | Better performance |
| CTEs | Basic | **Advanced** | Complex queries |
| Window Functions | Limited | **Full support** | Analytics |

---

## 💰 Pricing

### Free Tier (Perfect for Demo)
- ✅ 500MB database
- ✅ 2 projects
- ✅ 1GB bandwidth/month
- ✅ Daily backups
- ✅ Community support
- ✅ **Unlimited API requests**

### Pro Tier ($25/month)
- ✅ 8GB database
- ✅ Unlimited projects
- ✅ 10GB bandwidth/month
- ✅ Point-in-time recovery
- ✅ Priority support

### For Your Demo:
**Free tier is more than enough!**
- 100,000 files ≈ 50-100MB
- Well within 500MB limit
- No credit card required

---

## 🛡️ Security Best Practices

### 1. Environment Variables
Never commit `.env` file:
```bash
# Already in .gitignore
.env
```

### 2. Connection Pooling
Supabase provides built-in connection pooling:
```
Host: db.xxxxxxxxx.supabase.co
Port: 5432
```

For high traffic, use:
```
Host: aws-0-xx-x.pooler.supabase.com
Port: 6543
```

### 3. Row Level Security (Optional)
Enable RLS for multi-tenant apps:
```sql
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own files"
ON files FOR SELECT
USING (owner_id = auth.uid());
```

### 4. API Keys
- **anon key**: Client-side (safe to expose)
- **service_role key**: Server-side (NEVER expose!)

---

## 🐛 Troubleshooting

### Issue: Can't connect to Supabase
**Error:** `connection timeout`

**Fix:**
```bash
# Check your .env
DB_HOST=db.xxxxxxxxx.supabase.co  # No https://
DB_PORT=5432
DB_PASSWORD=correct_password  # Check for typos

# Test connection
psql -h db.xxxxxxxxx.supabase.co -U postgres -d postgres
```

### Issue: Migration fails
**Error:** `relation already exists`

**Fix:**
- Tables already created
- Safe to ignore
- Or drop tables and re-run:
  ```sql
  DROP TABLE IF EXISTS index_snapshots, audit_log, file_metadata, files, users CASCADE;
  ```

### Issue: Seed script fails
**Error:** `duplicate key value violates unique constraint`

**Fix:**
- Clear existing data:
  ```sql
  TRUNCATE files, file_metadata CASCADE;
  ```
- Re-run seed script

### Issue: Slow queries
**Fix:**
```sql
-- Check indexes
SELECT * FROM pg_indexes WHERE tablename = 'files';

-- Analyze table
ANALYZE files;

-- Check query plan
EXPLAIN ANALYZE SELECT * FROM files WHERE name LIKE 'document%';
```

---

## 📈 Monitoring

### Supabase Dashboard
1. **Database** → Table size
2. **Settings** → API usage
3. **Logs** → Query logs (Pro tier)

### Manual Checks
```sql
-- Table sizes
SELECT 
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Row counts
SELECT 
  schemaname,
  relname AS table_name,
  n_live_tup AS row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

---

## 🚀 Deploy to Production

### Supabase Production Project
1. Create separate project for production
2. Use different database credentials
3. Set up CI/CD for migrations
4. Enable automated backups

### Environment Variables (Production)
```env
NODE_ENV=production
DB_HOST=db.production.supabase.co
DB_PASSWORD=production_password
CORS_ORIGIN=https://your-frontend.vercel.app
```

---

## 📚 Resources

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **JSONB Guide**: https://supabase.com/docs/guides/database/jsonb
- **SQL Editor**: https://supabase.com/docs/guides/database/sql-editor
- **API Reference**: https://supabase.com/docs/reference/javascript/introduction

---

## ✅ Quick Checklist

- [ ] Supabase account created
- [ ] Project created (Free tier)
- [ ] Database password saved
- [ ] Connection details copied
- [ ] backend/.env updated with Supabase credentials
- [ ] Dependencies installed (`npm install pg`)
- [ ] Migrations run successfully
- [ ] Data seeded (10K-100K files)
- [ ] Backend started without errors
- [ ] API endpoints tested
- [ ] Frontend connected and working

---

**🎉 Your Metadata Search Engine is now running on PostgreSQL with Supabase!**
