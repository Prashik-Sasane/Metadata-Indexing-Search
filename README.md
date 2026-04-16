# Metadata Indexing & Search System
### *High-Performance, Large-Scale File Metadata Engine — Inspired by AWS S3*

> **Goal:** Build a system capable of indexing and searching metadata across **millions of files** with sub-millisecond lookup times — bypassing slow full-database scans using in-memory + on-disk data structures (DSA-first approach).

> **Status:** ✅ Backend with DSA Engine, PostgreSQL, and Docker infrastructure is **COMPLETE and READY TO USE**. See [QUICKSTART.md](QUICKSTART.md) to get started in 5 minutes.

---

## Table of Contents

1. [Problem Statement](#-problem-statement)
2. [System Architecture Overview](#-system-architecture-overview)
3. [DSA Core — The Brain of the System](#-dsa-core--the-brain-of-the-system)
4. [Technology Stack](#-technology-stack)
5. [Project Roadmap — Phase by Phase](#-project-roadmap--phase-by-phase)
6. [Folder Structure](#-folder-structure)
7. [API Design](#-api-design)
8. [Database Schema](#-database-schema)
9. [Infrastructure & Deployment](#-infrastructure--deployment)
10. [Performance Benchmarks & Goals](#-performance-benchmarks--goals)

---

## Problem Statement

In large-scale object storage systems like **AWS S3**, you can have **hundreds of millions of objects** (files). When a user searches for a file by name, tag, prefix, or date — **querying the raw database every time is catastrophically slow**:

- `SELECT * FROM files WHERE name LIKE 'project%'` does a **full table scan** — O(N)
- Even with B-Tree indexes in Postgres, prefix queries across 100M rows take **seconds**
- No pre-built index means repeated cold-reads and cache misses

### Our Solution

Build a **multi-layer indexing engine** in front of Postgres that uses:

| Layer | What it does | Data Structure |
|-------|-------------|----------------|
| **Prefix Search** | Autocomplete & fast prefix lookups | Trie |
| **Range Queries** | Date ranges, file size ranges | B+ Tree |
| **Balanced Lookup** | Equality searches with auto-rebalancing | AVL Tree |
| **Sorted Listings** | Top-K largest files, recently modified | Min/Max Heap |
| **Persistent On-Disk Index** | Durable multi-level sorted index | B Tree |

---

##  System Architecture Overview

<img width="1654" height="702" alt="image" src="https://github.com/user-attachments/assets/e9fb1fee-61e9-413f-997f-7bad68828117" />

---

## 🧠 DSA Core — The Brain of the System

### 1. 🌳 Trie — Prefix Search Engine

**Use Case:** Autocomplete, prefix-based filename search (`project/` → all files starting with `project/`)

```
Root
 ├── p
 │   └── r
 │       └── o
 │           └── j  → [project-alpha.pdf, project-beta.zip]
 └── r
     └── e
         └── p  → [report-2024.xlsx]
```

- **Insert:** O(L) where L = length of key
- **Prefix Search:** O(L + K) where K = number of results
- **Use in our system:** File path prefix lookups, bucket/folder traversal
- **Implementation:** Compressed Radix Trie (Patricia Trie) to save memory

---

### 2. 🌲 B+ Tree — Range Query Engine

**Use Case:** `WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31'`, `WHERE size BETWEEN 1MB AND 100MB`

```
Internal Nodes: [10 | 20 | 30]
Leaf Nodes:       [5,7,9] → [11,15,19] → [21,25,29] → [31,35]
                     ↑ Linked List for fast range scan ↑
```

- **Search:** O(log N)
- **Range Scan:** O(log N + K) — leaf linked list traversal
- **Use in our system:** Date range queries, file-size range filters, time-based sorting
- **Key advantage over B Tree:** Leaf nodes linked — no need to traverse tree for range

---

### 3. 🌴 B Tree — On-Disk Persistent Index

**Use Case:** Durable index that survives restarts, acts like a mini-LSM store for metadata

- All nodes (internal + leaf) store data → better for point lookups
- Used as the **WAL-backed persistent index** (write-ahead log)
- **Search:** O(log N)
- **Use in our system:** Persistent metadata index on disk, synced to Postgres on crash recovery

---

### 4. ⚖️ AVL Tree — Self-Balancing Equality Index

**Use Case:** Tag-based lookups (`tag = "production"`), owner-based lookups (`owner = "user123"`)

```
        30 (h=2)
       /         \
    20 (h=1)   40 (h=1)
    /    \
  10     25   ← Balanced, height never exceeds O(log N)
```

- **Search/Insert/Delete:** O(log N) — guaranteed
- **Balance Factor:** |height(left) - height(right)| ≤ 1
- **Use in our system:** Secondary index for metadata fields (tags, content-type, owner)
- **Why not Red-Black?** AVL has faster lookups (stricter balance), acceptable for read-heavy workloads

---

### 5. 📊 Heap — Top-K & Priority Queries

**Use Case:** "Show top 10 largest files", "Show 5 most recently uploaded", "Priority queue for indexing jobs"

```
Min-Heap (smallest at root):         Max-Heap (largest at root):
         1                                    100
       /   \                                /     \
      3     5                             80       90
     / \                                /  \
    8   7                             70   75
```

- **Get Min/Max:** O(1)
- **Insert:** O(log N)
- **Extract Min/Max:** O(log N)
- **Use in our system:**
  - `MinHeap` → Top-K largest files (keep K biggest, evict smaller)
  - `MaxHeap` → Least recently accessed files (for cache eviction)
  - **Priority Queue** → Ingest job scheduler (prioritize re-index jobs)

---

## 🛠️ Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Backend** | Go (Golang) | Extreme concurrency (goroutines), low GC pause, fast compilation, perfect for system-level work |
| **Frontend** | React + TypeScript | Component model, rich ecosystem, fast with Vite |
| **Database** | PostgreSQL | ACID compliance, JSONB for flexible metadata, robust indexing |
| **In-Memory Cache** | Redis | Hot-path metadata caching, pub/sub for index invalidation |
| **File Storage** | AWS S3 | Massively scalable object storage, event notifications via S3 Events |
| **Search Layer** | Custom DSA Engine (Go) | Hand-rolled Trie + B+Tree for ultimate performance |
| **Message Queue** | Apache Kafka | S3 event ingestion pipeline, async re-indexing |
| **Container Runtime** | Docker | Reproducible dev/prod environments |
| **Orchestration** | Kubernetes (K8s) | Auto-scaling, rolling deployments, horizontal pod autoscaling |
| **CI/CD** | GitHub Actions | Automated test, build, and deployment pipeline |
| **Monitoring** | Prometheus + Grafana | Real-time metrics, alerting |
| **Tracing** | Jaeger / OpenTelemetry | Distributed trace across microservices |
| **API Style** | RESTful + gRPC (internal) | REST for frontend, gRPC for inter-service speed |

---

## 🗺️ Project Roadmap — Phase by Phase

---

### 🔵 Phase 0: Foundation & Setup *(Week 1)*

> **Goal:** Repository, tooling, CI skeleton

- [ ] Initialize Go module (`go mod init`)
- [ ] Initialize React + TypeScript frontend (Vite)
- [ ] Set up `docker-compose.yml` for local dev (Postgres, Redis, Kafka, Zookeeper)
- [ ] Configure GitHub Actions CI pipeline (lint + test on PR)
- [ ] Define `.env` structure and secrets management (AWS credentials, DB URLs)
- [ ] Write `Makefile` for common commands (`make run`, `make test`, `make build`)

**Deliverable:** One-command local dev environment (`docker-compose up`)

---

### 🟢 Phase 1: DSA Engine — Core Data Structures *(Week 2–3)*

> **Goal:** Implement and unit-test all core data structures in Go

#### 1.1 Compressed Trie (Radix Trie)
```go
// pkg/index/trie.go
type TrieNode struct {
    children map[rune]*TrieNode
    isEnd    bool
    fileIDs  []string // UUIDs of files at this prefix
}
type Trie struct {
    root *TrieNode
    mu   sync.RWMutex // goroutine-safe
}
func (t *Trie) Insert(path string, fileID string) {}
func (t *Trie) PrefixSearch(prefix string) []string {}
func (t *Trie) Delete(path string) {}
```

#### 1.2 B+ Tree (Range Queries)
```go
// pkg/index/bplustree.go
type BPlusTree struct {
    root  *BPlusNode
    order int // max children per node
    mu    sync.RWMutex
}
func (b *BPlusTree) Insert(key int64, fileID string) {}
func (b *BPlusTree) RangeSearch(from, to int64) []string {}
func (b *BPlusTree) Delete(key int64) {}
```

#### 1.3 AVL Tree (Tag/Equality Index)
```go
// pkg/index/avltree.go
type AVLNode struct {
    key     string
    fileIDs []string
    height  int
    left    *AVLNode
    right   *AVLNode
}
func (a *AVLTree) Insert(key string, fileID string) {}
func (a *AVLTree) Search(key string) []string {}
func (a *AVLTree) rotateLeft(node *AVLNode) *AVLNode {}
func (a *AVLTree) rotateRight(node *AVLNode) *AVLNode {}
```

#### 1.4 Min/Max Heap (Top-K Queries)
```go
// pkg/index/heap.go
type FileHeap []FileEntry
func (h FileHeap) Len() int           { return len(h) }
func (h FileHeap) Less(i, j int) bool { return h[i].Size < h[j].Size }
func TopKLargestFiles(files []FileEntry, k int) []FileEntry {}
```

#### 1.5 B Tree (Disk Index)
```go
// pkg/index/btree.go
// Used for WAL-backed persistent index on disk
type BTreeDisk struct {
    pageSize int
    file     *os.File
    root     *BTreeDiskNode
}
```

- [ ] All structures implement a common `Index` interface
- [ ] 100% unit test coverage for all DSA operations
- [ ] Benchmark tests: 1M insertions, search latency measurement

**Deliverable:** `pkg/index/` — fully tested, benchmarked DSA package

---

### 🟡 Phase 2: Backend Services (Go) *(Week 4–6)*

> **Goal:** Three microservices wired to the index engine

#### 2.1 Ingest Service
- Listens to **Kafka** topic `s3.events.created`
- On new file upload → extract metadata (name, size, MIME, tags, S3 key, owner)
- Write metadata to **Postgres** (source of truth)
- Update **in-memory index** (Trie + B+Tree + AVL)
- Write to **WAL (B Tree disk index)** for crash recovery

```
S3 Upload → S3 Event Notification → Kafka → Ingest Service
                                              ├── Postgres INSERT
                                              ├── Trie.Insert(path)
                                              ├── BPlusTree.Insert(size)
                                              ├── BPlusTree.Insert(createdAt)
                                              └── AVLTree.Insert(tag)
```

#### 2.2 Search Service
- `GET /search?prefix=project/` → Trie prefix search → return file IDs → hydrate from Redis/Postgres
- `GET /search?sizeMin=1MB&sizeMax=100MB` → B+Tree range scan
- `GET /search?tag=production` → AVL Tree lookup
- `GET /search?topK=10&sort=size` → Heap extraction
- Results ranked and paginated

#### 2.3 Metadata Service
- CRUD for file metadata
- `GET /files/:id` — fetch single file metadata
- `PUT /files/:id/tags` — update tags (triggers index update)
- `DELETE /files/:id` — remove from all indexes + Postgres
- Serves presigned S3 URLs for file download

#### 2.4 Index Manager (Internal)
- Holds all in-memory structures as singleton
- Handles concurrent read/write with `sync.RWMutex`
- Periodic **snapshot** to disk (every 5 min)
- **WAL replay** on startup for crash recovery
- Goroutine pool for parallel index updates

**Deliverables:**
- [ ] 3 Go services with clean handler/service/repository layers
- [ ] REST API documented with Swagger/OpenAPI
- [ ] Integration tests using `testcontainers-go` (spins up real Postgres + Redis)

---

### 🟠 Phase 3: Frontend (React + TypeScript) *(Week 7–8)*

> **Goal:** Intuitive search UI + file management dashboard

#### Pages & Components

```
src/
├── pages/
│   ├── Dashboard/     # Stats: total files, storage, recent uploads
│   ├── Search/        # Search bar with autocomplete (Trie-backed)
│   ├── FileDetail/    # File metadata, tags, download link
│   └── Upload/        # Upload files to S3 via presigned URL
├── components/
│   ├── SearchBar/     # Debounced input, prefix suggestions dropdown
│   ├── FileTable/     # Sortable, paginated results table
│   ├── TagFilter/     # Multi-select tag filter panel
│   ├── SizeFilter/    # Range slider (maps to B+Tree range query)
│   └── DateFilter/    # Date picker range (maps to B+Tree date query)
└── api/
    └── client.ts      # Axios API client with interceptors
```

**Key Features:**
- [ ] Real-time autocomplete powered by Trie prefix API (debounced, 300ms)
- [ ] Advanced filter panel (size range, date range, tags, content-type)
- [ ] Top-K largest/recent files dashboard widget (Heap API)
- [ ] File upload with progress tracking (presigned S3 URL)
- [ ] Dark mode, responsive design

---

### 🔴 Phase 4: Database Schema & Migrations *(Week 4 — parallel with Phase 2)*

> **Goal:** Postgres schema optimized to be the source of truth

```sql
-- Core file metadata table
CREATE TABLE files (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    s3_key      TEXT NOT NULL UNIQUE,
    bucket      TEXT NOT NULL,
    name        TEXT NOT NULL,
    size        BIGINT NOT NULL,          -- bytes
    mime_type   TEXT,
    owner_id    UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    is_deleted  BOOLEAN DEFAULT FALSE
);

-- Flexible metadata/tags as JSONB
CREATE TABLE file_metadata (
    file_id     UUID REFERENCES files(id) ON DELETE CASCADE,
    tags        JSONB DEFAULT '{}',       -- {"env": "prod", "team": "backend"}
    custom      JSONB DEFAULT '{}'        -- arbitrary key-value pairs
);

-- Postgres B-Tree indexes as backup (for complex joins)
CREATE INDEX idx_files_name ON files USING btree(name);
CREATE INDEX idx_files_size ON files USING btree(size);
CREATE INDEX idx_files_created ON files USING btree(created_at);
CREATE INDEX idx_tags ON file_metadata USING gin(tags);  -- GIN for JSONB
```

- [ ] Use `golang-migrate` for versioned migrations
- [ ] Seed script with 1M+ synthetic file records for benchmarking
- [ ] Read replica setup for query isolation

---

### 🟣 Phase 5: Infrastructure & DevOps *(Week 9–10)*

> **Goal:** Production-grade containerized deployment

#### Docker
```yaml
# docker-compose.yml (local dev)
services:
  postgres:    # image: postgres:16
  redis:       # image: redis:7-alpine
  kafka:       # image: confluentinc/cp-kafka
  zookeeper:   # image: confluentinc/cp-zookeeper
  ingest:      # builds: ./backend/ingest-service
  search:      # builds: ./backend/search-service
  metadata:    # builds: ./backend/metadata-service
  frontend:    # builds: ./frontend
```

#### Kubernetes (Production)
```
k8s/
├── namespaces/
├── deployments/
│   ├── search-deployment.yaml     # 3 replicas, HPA (CPU > 70%)
│   ├── ingest-deployment.yaml     # 2 replicas
│   └── metadata-deployment.yaml  # 3 replicas
├── services/
├── ingress/                       # Nginx ingress controller
├── configmaps/
├── secrets/                       # AWS creds via K8s secrets
└── hpa/                           # Horizontal Pod Autoscaler
```

#### AWS Architecture
```
Route 53 → CloudFront (CDN) → ALB → K8s Ingress → Go Services
S3 Buckets (user files + static frontend assets)
S3 Event Notifications → SNS → SQS → Kafka Connector → Ingest Service
RDS PostgreSQL (Multi-AZ) + ElastiCache Redis
EKS (Elastic Kubernetes Service)
```

- [ ] Terraform scripts for AWS resource provisioning
- [ ] GitHub Actions: build image → push ECR → deploy to EKS
- [ ] Helm chart for the entire application
- [ ] Secrets management with AWS Secrets Manager

---

### ⚫ Phase 6: Observability & Performance *(Week 11)*

> **Goal:** See everything, alert on anomalies, hit performance targets

#### Monitoring Stack
```yaml
# Prometheus scrapes all Go services (/metrics endpoint)
# Grafana dashboards:
#   - Search latency P50/P95/P99
#   - Index size (Trie nodes, B+Tree nodes)
#   - Ingest throughput (files/sec)
#   - Cache hit rate (Redis)
```

#### Distributed Tracing
```go
// Every request gets a trace ID via OpenTelemetry
// Jaeger UI shows: HTTP → Search Service → Trie Lookup → Redis → Response
```

- [ ] Custom Go metrics: trie depth, b+tree node count, heap size
- [ ] Alert rules: P99 latency > 100ms, error rate > 1%, disk index lag > 30s
- [ ] Load test with `k6` (10k concurrent users, 1M file dataset)

---

### 🏁 Phase 7: End-to-End Testing & Launch *(Week 12)*

- [ ] E2E tests with Playwright (frontend → API → index → response)
- [ ] Chaos engineering: kill index service, verify WAL recovery
- [ ] Security: JWT auth, rate limiting, presigned URL expiry
- [ ] Documentation: Swagger UI, Architecture ADRs, runbooks
- [ ] Performance report (benchmarks vs raw Postgres queries)

---

## 📁 Folder Structure

```
Metadata-Indexing-Search/
│
├── backend/
│   ├── cmd/
│   │   ├── ingest/          # main.go for ingest service
│   │   ├── search/          # main.go for search service
│   │   └── metadata/        # main.go for metadata service
│   ├── pkg/
│   │   ├── index/           # ← DSA ENGINE
│   │   │   ├── trie.go
│   │   │   ├── bplustree.go
│   │   │   ├── btree.go
│   │   │   ├── avltree.go
│   │   │   ├── heap.go
│   │   │   └── manager.go   # IndexManager: orchestrates all indexes
│   │   ├── models/          # File, Metadata, User structs
│   │   ├── repository/      # Postgres queries (sqlx / pgx)
│   │   ├── cache/           # Redis client wrappers
│   │   ├── storage/         # AWS S3 client wrappers
│   │   ├── kafka/           # Kafka producer/consumer
│   │   └── logger/          # Structured logging (zap)
│   ├── internal/
│   │   ├── handlers/        # HTTP + gRPC handlers
│   │   └── middleware/      # Auth, rate-limit, tracing
│   └── go.mod
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── store/           # Zustand or Redux Toolkit
│   ├── package.json
│   └── vite.config.ts
│
├── k8s/                     # Kubernetes manifests
├── terraform/               # AWS infrastructure as code
├── migrations/              # SQL migration files
├── scripts/                 # Seed, benchmark, and utility scripts
├── .github/workflows/       # CI/CD pipelines
├── docker-compose.yml
├── Makefile
└── README.md
```

---

## 🔌 API Design

### Search Endpoints

| Method | Endpoint | Query Params | DSA Used | Description |
|--------|----------|-------------|----------|-------------|
| `GET` | `/api/v1/search` | `prefix=` | **Trie** | Prefix search on file paths |
| `GET` | `/api/v1/search` | `sizeMin=&sizeMax=` | **B+ Tree** | Size range query |
| `GET` | `/api/v1/search` | `from=&to=` (dates) | **B+ Tree** | Date range query |
| `GET` | `/api/v1/search` | `tag=` | **AVL Tree** | Tag equality lookup |
| `GET` | `/api/v1/search` | `topK=&sort=size` | **Max Heap** | Top-K largest files |
| `GET` | `/api/v1/search` | `topK=&sort=recent` | **Min Heap** | K most recent files |

### File Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/files/upload-url` | Get presigned S3 upload URL |
| `GET` | `/api/v1/files/:id` | Get file metadata |
| `PUT` | `/api/v1/files/:id/tags` | Update file tags (re-indexes AVL) |
| `DELETE` | `/api/v1/files/:id` | Soft delete (removes from indexes) |
| `GET` | `/api/v1/files` | List files (paginated) |

---

## 🗄️ Database Schema

```
users ──────────────────────────────────────────┐
  id, email, name, created_at                   │
                                                 │ (owner_id FK)
files ──────────────────────────────────────────┘
  id, s3_key, bucket, name, size,
  mime_type, owner_id, created_at,
  updated_at, is_deleted
      │
      │ (file_id FK)
file_metadata
  file_id, tags (JSONB), custom (JSONB)

index_snapshots              ← B Tree WAL checkpoints
  id, snapshot_at, s3_path, checksum

audit_log                    ← Immutable event log
  id, file_id, action, actor_id, timestamp
```

---

## ☁️ Infrastructure & Deployment

```
┌─────────────────── AWS Cloud ───────────────────────────────┐
│                                                             │
│  Route53 → CloudFront → ALB → EKS Cluster                  │
│                                  │                         │
│                          ┌───────┴──────────┐              │
│                          │  Node Group      │              │
│                          │  ┌────────────┐  │              │
│                          │  │search pods │  │              │
│                          │  │ingest pods │  │              │
│                          │  │metadata    │  │              │
│                          │  │  pods      │  │              │
│                          │  └────────────┘  │              │
│                          └──────────────────┘              │
│  RDS PostgreSQL ──────────────────────────────────────────  │
│  ElastiCache Redis ───────────────────────────────────────  │
│  MSK (Kafka) ─────────────────────────────────────────────  │
│  S3 (file storage + frontend assets) ─────────────────────  │
│  ECR (container registry) ────────────────────────────────  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 Performance Benchmarks & Goals

| Operation | Dataset Size | Target Latency | Expected DSA Complexity |
|-----------|-------------|----------------|------------------------|
| Prefix search (Trie) | 10M files | **< 5ms** | O(L + K) |
| Range query (B+Tree) | 10M files | **< 10ms** | O(log N + K) |
| Tag lookup (AVL) | 10M files | **< 3ms** | O(log N) |
| Top-K query (Heap) | 10M files | **< 2ms** | O(K log N) |
| Full-text DB scan (raw SQL) | 10M files | ~**5–15 seconds** ❌ | O(N) |

> ✅ **Target: 1000x faster than raw DB queries at scale**

---

## 🚀 Getting Started (Local Dev)

```bash
# 1. Clone the repo
git clone https://github.com/your-username/Metadata-Indexing-Search.git
cd Metadata-Indexing-Search

# 2. Copy environment file
cp .env.example .env
# Fill in AWS credentials, DB URLs, etc.

# 3. Start all services (Postgres, Redis, Kafka, Go services, React)
docker-compose up --build

# 4. Run database migrations
make migrate

# 5. Seed with 1M synthetic files
make seed

# 6. Open the app
# Frontend: http://localhost:3000
# API:      http://localhost:8080
# Swagger:  http://localhost:8080/swagger
```

---

## 📚 Learning Resources

| Topic | Resource |
|-------|---------|
| Tries in Go | [Writing a Trie in Go](https://iximiuz.com/en/posts/go-tries/) |
| B+ Trees explained | [B+ Tree Visualizer](https://www.cs.usfca.edu/~galles/visualization/BPlusTree.html) |
| AVL Trees | [AVL Tree Rotations](https://en.wikipedia.org/wiki/AVL_tree) |
| Go concurrency | [Go by Example: Goroutines](https://gobyexample.com/goroutines) |
| AWS S3 Events | [S3 Event Notifications](https://docs.aws.amazon.com/AmazonS3/latest/userguide/NotificationHowTo.html) |
| Kafka in Go | [Sarama Kafka Library](https://github.com/IBM/sarama) |
| Kubernetes | [K8s Official Docs](https://kubernetes.io/docs/) |

---

## 🤝 Contributing

1. Fork → Feature branch (`git checkout -b feat/trie-optimization`)
2. Write tests first (TDD)
3. Implement
4. `make lint && make test`
5. Pull Request with benchmark results

---

## 📄 License

MIT License — see [LICENSE](LICENSE) file.

---

<div align="center">
  <strong>Built with ❤️ using Go · React · PostgreSQL · AWS · Kubernetes</strong><br/>
  <em>Making metadata search 1000x faster through DSA-first engineering</em>
</div>
