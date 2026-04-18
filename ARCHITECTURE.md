# Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + TS)                       │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Search.tsx  │  │ Dashboard.tsx│  │  Nodes.tsx   │              │
│  │              │  │              │  │              │              │
│  │ • Live search│  │ • Live stats │  │ • DSA metrics│              │
│  │ • Debounce   │  │ • Auto-refr  │  │ • Auto-refr  │              │
│  │ • Suggestions│  │ • File count │  │ • Node count │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                  │                       │
│         └─────────────────┼──────────────────┘                       │
│                           │                                          │
│                  ┌────────▼────────┐                                 │
│                  │   API Client    │                                 │
│                  │  (axios + RQ)   │                                 │
│                  └────────┬────────┘                                 │
└───────────────────────────┼─────────────────────────────────────────┘
                            │ HTTP Requests
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                       BACKEND (Express + Node.js)                    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     app.js                                    │  │
│  │  • Startup: DB → IndexManager → AWS Validation → Listen     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                       │
│         ┌───────────────────┼───────────────────┐                  │
│         ▼                   ▼                   ▼                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│  │File Routes  │    │Search Routes│    │  Middleware │            │
│  │             │    │             │    │  • Helmet   │            │
│  │ POST /files │    │ GET /search │    │  • CORS     │            │
│  │ GET /files  │    │ GET /stats  │    │  • Rate Lim │            │
│  │ DELETE      │    │ GET /suggest│    │  • Morgan   │            │
│  └──────┬──────┘    └──────┬──────┘    └─────────────┘            │
│         │                  │                                       │
│         ▼                  ▼                                       │
│  ┌─────────────┐    ┌─────────────┐                                │
│  │  File Ctrl  │    │ Search Ctrl │                                │
│  │             │    │             │                                │
│  │ ← shared IndexManager singleton →                               │
│  └──────┬──────┘    └──────┬──────┘                                │
│         │                  │                                       │
│         ▼                  ▼                                       │
│  ┌─────────────┐    ┌─────────────┐                                │
│  │File Service │    │Search Service│                               │
│  │             │    │             │                                │
│  │ MetadataSvc │    │ hydrateFiles│                                │
│  │ S3 Presigned│    │ paginate    │                                │
│  └──────┬──────┘    └──────┬──────┘                                │
└─────────┼──────────────────┼───────────────────────────────────────┘
          │                  │
          ▼                  ▼
┌──────────────────┐  ┌──────────────────────────────────┐
│   MySQL Database │  │      DSA IndexManager            │
│                  │  │                                   │
│  ┌────────────┐  │  │  ┌────────────────────────────┐ │
│  │ files      │  │  │  │ In-Memory Indexes          │ │
│  │ file_meta  │  │  │  │ • Trie (prefix search)     │ │
│  │ audit_log  │  │  │  │ • B+ Tree (range queries)  │ │
│  └────────────┘  │  │  │ • AVL Tree (tags/owner)    │ │
│                  │  │  │ • Heap (top-K)             │ │
│  CRUD Operations │  │  │ • B-Tree Disk (persistent) │ │
│  Hydration       │  │  └────────────────────────────┘ │
│                  │  │                                   │
└──────────────────┘  │  O(log N) Search Performance     │
                      └──────────────────────────────────┘
                                    │
                                    │
                      ┌─────────────▼──────────────┐
                      │      AWS S3 Storage         │
                      │                             │
                      │  • File uploads             │
                      │  • Presigned URLs           │
                      │  • Download access          │
                      └─────────────────────────────┘
```

## Data Flow Examples

### 1. Search Flow
```
User types "doc" in Search.tsx
    ↓ (300ms debounce)
searchAPI.search({ prefix: "doc" })
    ↓
GET /api/v1/search?prefix=doc
    ↓
SearchController.search()
    ↓
SearchService.search()
    ↓
IndexManager.search()
    ├─→ Trie.prefixSearch("doc") → [file IDs]
    └─→ Returns file IDs
    ↓
SearchService.hydrateFiles([IDs])
    ├─→ MySQL: SELECT * FROM files WHERE id IN (...)
    └─→ Returns full file metadata
    ↓
Response: { files: [...], performance: {...} }
    ↓
Search.tsx displays results
```

### 2. Create File Flow
```
User creates file metadata
    ↓
POST /api/v1/files { s3_key, name, size, tags }
    ↓
FileController.createFile()
    ↓
IngestService.createFile()
    ├─→ MySQL: INSERT INTO files
    ├─→ MySQL: INSERT INTO file_metadata
    └─→ IndexManager.insertFile()
         ├─→ Trie.insert(name)
         ├─→ B+Tree.insert(size)
         ├─→ AVL.insert(tags)
         └─→ Heap.insert(file)
    ↓
Response: { success: true, data: file }
```

### 3. Dashboard Stats Flow
```
Dashboard.tsx mounts
    ↓
useQuery fetches searchAPI.getStats()
    ↓
GET /api/v1/search/stats
    ↓
SearchController.getSearchStats()
    ↓
SearchService.getSearchStats()
    ├─→ IndexManager.getStats()
    │    ├─→ Trie stats (nodeCount, height)
    │    ├─→ B+Tree stats (nodeCount, height)
    │    └─→ AVL stats (nodeCount, height)
    └─→ MySQL queries
         ├─→ SELECT COUNT(*) FROM files
         └─→ SELECT SUM(size) FROM files
    ↓
Response: { dsaIndexes: {...}, database: {...} }
    ↓
Dashboard.tsx displays metrics
    ↓ (auto-refresh every 10s)
Repeat...
```

## DSA Structure Usage

| Query Type | DSA Used | Complexity | Example |
|------------|----------|------------|---------|
| Prefix search ("doc") | Trie | O(L) | Find all files starting with "doc" |
| Size range (1MB-10MB) | B+ Tree | O(log N + K) | Find files between sizes |
| Date range (Jan-Mar) | B+ Tree | O(log N + K) | Find files in date range |
| Tag lookup ("important") | AVL Tree | O(log N) | Find files with specific tag |
| Owner lookup (UUID) | AVL Tree | O(log N) | Find files by owner |
| Top 10 largest | Max-Heap | O(K log N) | Get largest files |
| Top 10 recent | Max-Heap | O(K log N) | Get most recent files |

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **TanStack Query** - Data fetching & caching
- **Axios** - HTTP client
- **TailwindCSS** - Styling
- **React Router** - Navigation
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MySQL** - Database (with connection pooling)
- **Zod** - Input validation
- **AWS SDK v3** - S3 integration
- **Helmet** - Security headers
- **CORS** - Cross-origin support
- **Rate Limiter** - Request throttling

### DSA Structures (Custom Implementation)
- **Radix Trie** - Compressed prefix tree
- **B+ Tree** - Balanced tree for ranges
- **AVL Tree** - Self-balancing BST
- **Min/Max Heap** - Priority queue
- **B-Tree Disk** - Persistent storage with WAL

## Performance Characteristics

### Search Performance
- **Trie prefix search**: O(L) where L = query length
  - Example: "document" → 8 character traversals → instant
- **B+ Tree range**: O(log N + K) where N = total nodes, K = results
  - Example: 1M files → ~20 node visits → milliseconds
- **AVL lookup**: O(log N) guaranteed balanced
  - Example: 100K tags → ~17 comparisons → fast

### Database Performance
- **Connection pool**: 20 concurrent connections
- **Query optimization**: Single query hydration with IN clause
- **Pagination**: LIMIT/OFFSET for large result sets

### Memory Usage
- **In-memory indexes**: Fast but requires RAM
- **Periodic snapshots**: Every 5 minutes to disk
- **WAL (Write-Ahead Log)**: Crash recovery

## Deployment Considerations

### Production Setup
```
Load Balancer
    ↓
[Backend Instance 1] ─┐
[Backend Instance 2] ─┤──→ Shared MySQL Cluster
[Backend Instance 3] ─┘
    ↓
[Redis Cache] (optional)
    ↓
[AWS S3] (file storage)
```

### Scaling
- **Horizontal**: Multiple backend instances
- **Index synchronization**: Need Redis/MsgQueue for multi-instance
- **Database**: MySQL replication for read scaling
- **S3**: Already distributed globally

### Monitoring
- Backend logs (morgan)
- Database slow query log
- DSA performance metrics
- AWS CloudWatch for S3

## Key Implementation Details

### IndexManager Singleton
All controllers share ONE IndexManager instance:
```javascript
// backend/src/services/indexManagerSingleton.js
let indexManagerInstance = null;

function getIndexManager() {
  if (!indexManagerInstance) {
    indexManagerInstance = new IndexManager();
  }
  return indexManagerInstance;
}
```

### MySQL IN Clause Fix
Dynamic placeholder generation for array parameters:
```javascript
const placeholders = fileIDs.map(() => '?').join(',');
const result = await query(
  `SELECT * FROM files WHERE id IN (${placeholders})`,
  fileIDs
);
```

### AWS S3 Validation
Credentials checked on startup:
```javascript
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.warn('[WARNING] AWS credentials not configured');
}
```

### Frontend API Integration
All pages connected to real API:
```typescript
// Search with debounce
const { data } = useQuery({
  queryKey: ['search', query],
  queryFn: () => searchAPI.search({ prefix: query }),
  enabled: query.length > 0,
});

// Auto-refresh stats
const { data } = useQuery({
  queryKey: ['stats'],
  queryFn: () => searchAPI.getStats(),
  refetchInterval: 10000,
});
```
