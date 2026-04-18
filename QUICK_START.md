# 🚀 Quick Start Guide

Get your Metadata Indexing Search engine running in 5 minutes!

## Prerequisites Check
```bash
node --version    # Should be v18+
mysql --version   # Should be 8.0+
```

## Step 1: Backend Setup (2 minutes)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file (if not exists)
# Edit with your MySQL credentials:
#   DB_HOST=localhost
#   DB_USER=your_mysql_user
#   DB_PASSWORD=your_mysql_password
```

**⚠️ IMPORTANT:** 
- Use `DB_HOST=localhost` for local development
- Use `DB_HOST=mysql` ONLY if running in Docker Compose

### Setup Database
```bash
# Create database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS metadata_search;"

# Run migrations (if script exists)
npm run migrate

# OR manually create tables:
mysql -u root -p metadata_search < migrations/001_create_tables.sql
```

### Start Backend
```bash
npm start
```

You should see:
```
[db] Connected to MySQL
[IndexManager] Singleton created
[IndexManager] Initializing...
[IndexManager] Initialized successfully
[api] Starting server...
[api] Listening on port 3000
[api] Environment: development
```

✅ **Backend is running!**

---

## Step 2: Frontend Setup (1 minute)

Open a **new terminal**:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

✅ **Frontend is running!**

---

## Step 3: Test It! (2 minutes)

### Option A: Use the UI
1. Open browser: http://localhost:5173
2. Navigate to different pages:
   - **/** - Landing page
   - **/dashboard** - Live statistics
   - **/search** - Search interface (main feature!)
   - **/nodes** - DSA structure visualization

### Option B: Use curl

#### 1. Create a test file
```bash
curl -X POST http://localhost:3000/api/v1/files \
  -H "Content-Type: application/json" \
  -d '{
    "s3_key": "test/document.pdf",
    "bucket": "test-bucket",
    "name": "document.pdf",
    "size": 1024000,
    "mime_type": "application/pdf",
    "tags": {"important": true, "draft": true}
  }'
```

#### 2. Create another file
```bash
curl -X POST http://localhost:3000/api/v1/files \
  -H "Content-Type: application/json" \
  -d '{
    "s3_key": "test/report-2024.xlsx",
    "bucket": "test-bucket",
    "name": "report-2024.xlsx",
    "size": 2048000,
    "mime_type": "application/vnd.ms-excel",
    "tags": {"report": true, "2024": true}
  }'
```

#### 3. Search for files
```bash
# Search by prefix
curl "http://localhost:3000/api/v1/search?prefix=doc"

# Get statistics
curl http://localhost:3000/api/v1/search/stats
```

#### 4. List all files
```bash
curl http://localhost:3000/api/v1/files
```

---

## Step 4: Explore the UI

### Pages Available
- **/** - Landing page with Trie simulator
- **/dashboard** - Live statistics and metrics (auto-refresh every 10s)
- **/search** - Search interface with debounced search (main feature!)
- **/nodes** - DSA structure visualization (auto-refresh every 5s)
- **/files/:id** - File details and tag management

### What to Try
1. **Dashboard**: See live stats update every 10 seconds
2. **Search**: Type "doc" or "report" and watch results appear with 300ms debounce
3. **Nodes**: See Trie, B+ Tree, and AVL metrics in real-time
4. **File Detail**: Click on a file to view details and manage tags

---

## 🔧 Troubleshooting

### MySQL Connection Failed
```bash
# Check if MySQL is running
mysql -u root -p

# If not running, start it:
# Windows:
net start MySQL80
# Mac:
brew services start mysql
# Linux:
sudo systemctl start mysql
```

### ETIMEDOUT Error
**Problem:** `DB_HOST=mysql` in `.env`  
**Solution:** Change to `DB_HOST=localhost` for local development

### Port Already in Use
```bash
# Change backend port
# Edit backend/.env
PORT=3001

# Frontend will auto-select new port
```

### AWS S3 Errors
- S3 is **optional** for basic functionality
- File metadata operations work without AWS
- Only presigned URL generation requires AWS credentials
- Set dummy values to suppress warnings:
  ```
  AWS_ACCESS_KEY_ID=dummy
  AWS_SECRET_ACCESS_KEY=dummy
  S3_BUCKET=dummy-bucket
  ```

### Frontend Can't Connect to Backend
- Check backend is running on port 3000
- Verify `VITE_API_URL=http://localhost:3000/api/v1` in frontend/.env
- Check browser console (F12) for CORS errors

---

## ✅ What's Working Now

| Feature | Status |
|---------|--------|
| Create file metadata | ✅ Working |
| Search files (prefix) | ✅ Working |
| Get statistics | ✅ Working |
| View file details | ✅ Working |
| Update tags | ✅ Working |
| Delete files | ✅ Working |
| Live dashboard | ✅ Working |
| DSA visualization | ✅ Working |
| AWS S3 upload | ⚠️ Needs AWS creds |
| AWS S3 download | ⚠️ Needs AWS creds |

---

## 📚 Next Steps

### Learn More
- Read `IMPLEMENTATION_COMPLETE.md` for detailed changes
- Read `ARCHITECTURE.md` for system design
- Read `SETUP_GUIDE.md` for production setup

### Add More Features
1. **Kafka Integration**: Uncomment code in `ingestService.js`
2. **Redis Caching**: Add Redis for query caching
3. **File Upload UI**: Implement actual S3 uploads
4. **Authentication**: Add JWT auth
5. **Advanced Filters**: Date range, size range UI

### Performance Testing
```bash
# Test DSA structures
node backend/test-dsa.js

# Search performance
curl "http://localhost:3000/api/v1/search?prefix=test&topK=10&sort=size"
```

---

## 📖 API Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/files` | Create file metadata |
| GET | `/api/v1/files` | List all files |
| GET | `/api/v1/files/:id` | Get file details |
| PUT | `/api/v1/files/:id/tags` | Update tags |
| DELETE | `/api/v1/files/:id` | Delete file |
| GET | `/api/v1/search` | Search files |
| GET | `/api/v1/search/stats` | Get statistics |
| GET | `/api/v1/search/suggestions` | Get autocomplete suggestions |
| POST | `/api/v1/files/upload-url` | Get S3 presigned upload URL |
| GET | `/api/v1/files/:id/download-url` | Get S3 presigned download URL |

---

## 🆘 Need Help?

- **Backend logs**: Check terminal running `npm start`
- **Frontend logs**: Open browser console (F12)
- **API testing**: Use Postman or curl commands above
- **Documentation**: See other .md files in project root

---

**🎉 You're all set! Enjoy your high-performance metadata search engine!**

```
Frontend: http://localhost:5173
Backend:  http://localhost:3000
API Docs: See table above
```
