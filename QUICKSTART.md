# Metadata Indexing & Search System - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- Docker and Docker Compose installed
- (Optional) AWS credentials for S3 integration

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd Metadata-Indexing-Search

# 2. Copy environment file
cp backend/.env.example backend/.env

# 3. Start all services (PostgreSQL, Redis, Kafka, Backend)
docker-compose up -d

# 4. Check logs
docker-compose logs -f backend

# 5. API is now running at http://localhost:3000
```

### Option 2: Local Development

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Start PostgreSQL locally (or use Docker)
docker run -d --name postgres \
  -e POSTGRES_DB=metadata_search \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=secret \
  -p 5432:5432 \
  postgres:16-alpine

# 3. Run migrations
npm run migrate

# 4. Start the server
npm run dev
```

## 📡 API Endpoints

### Search Endpoints

```bash
# Prefix search (Trie-powered)
GET http://localhost:3000/api/v1/search?prefix=project/

# Size range query (B+ Tree-powered)
GET http://localhost:3000/api/v1/search?sizeMin=1048576&sizeMax=104857600

# Tag search (AVL Tree-powered)
GET http://localhost:3000/api/v1/search?tag=production

# Top-K largest files (Heap-powered)
GET http://localhost:3000/api/v1/search?topK=10&sort=size

# Get autocomplete suggestions
GET http://localhost:3000/api/v1/search/suggestions?prefix=proj

# Get index statistics
GET http://localhost:3000/api/v1/search/stats
```

### File Management Endpoints

```bash
# Create file metadata
POST http://localhost:3000/api/v1/files
{
  "s3_key": "project/file.pdf",
  "bucket": "my-bucket",
  "name": "file.pdf",
  "size": 1048576,
  "mime_type": "application/pdf",
  "tags": {"production": true, "backend": true}
}

# Get file by ID
GET http://localhost:3000/api/v1/files/:id

# Update file tags
PUT http://localhost:3000/api/v1/files/:id/tags
{
  "tags": {"production": true, "frontend": true}
}

# Delete file
DELETE http://localhost:3000/api/v1/files/:id

# List files with pagination
GET http://localhost:3000/api/v1/files?page=1&limit=50

# Get presigned upload URL
POST http://localhost:3000/api/v1/files/upload-url
{
  "fileName": "document.pdf",
  "mimeType": "application/pdf"
}
```

## 🧪 Testing the DSA Engine

### Create a test file:

```bash
curl -X POST http://localhost:3000/api/v1/files \
  -H "Content-Type: application/json" \
  -d '{
    "s3_key": "projects/backend/api.pdf",
    "bucket": "test-bucket",
    "name": "api.pdf",
    "size": 2048576,
    "mime_type": "application/pdf",
    "tags": {"backend": true, "api": true}
  }'
```

### Search by prefix:

```bash
curl http://localhost:3000/api/v1/search?prefix=projects/
```

### Search by size range:

```bash
curl http://localhost:3000/api/v1/search?sizeMin=1000000&sizeMax=5000000
```

### Search by tag:

```bash
curl http://localhost:3000/api/v1/search?tag=backend
```

## 📊 Architecture Overview

```
User Request
     ↓
Express.js API (Port 3000)
     ↓
┌─────────────────────────────────┐
│  In-Memory DSA Indexes          │
│  ├─ Trie (Prefix Search)        │
│  ├─ B+ Tree (Range Queries)     │
│  ├─ AVL Tree (Tag Lookups)      │
│  ├─ Heap (Top-K Queries)        │
│  └─ B-Tree Disk (WAL/Persistence)│
└─────────────────────────────────┘
     ↓
PostgreSQL (Source of Truth)
```

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server (with nodemon)
npm run dev

# Start production server
npm start

# Run benchmarks (coming soon)
npm run benchmark
```

## 📈 Performance Targets

| Operation | Dataset | Target Latency | DSA Complexity |
|-----------|---------|----------------|----------------|
| Prefix search (Trie) | 1M files | < 5ms | O(L + K) |
| Range query (B+Tree) | 1M files | < 10ms | O(log N + K) |
| Tag lookup (AVL) | 1M files | < 3ms | O(log N) |
| Top-K (Heap) | 1M files | < 2ms | O(K log N) |
| Raw SQL LIKE | 1M files | ~5-15s ❌ | O(N) |

## 🐛 Troubleshooting

### PostgreSQL connection error
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Database migrations failed
```bash
# Drop and recreate database
docker-compose down -v
docker-compose up -d
```

## 📚 Next Steps

1. **Frontend Development**: Set up React + TypeScript frontend (Phase 4)
2. **AWS Integration**: Connect to real AWS S3, Kafka (Phase 5)
3. **Kubernetes Deployment**: Deploy to EKS (Phase 6)
4. **Performance Testing**: Run benchmarks with 1M+ files (Phase 7)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details
