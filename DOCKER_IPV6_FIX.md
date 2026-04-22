# 🐳 Docker IPv6 Fix - Supabase Connection

## Problem
```
Error: connect ENETUNREACH 2406:da14:271:9922:2179:26c6:8f1:7985:5432
```

Docker is trying to connect to Supabase via IPv6, which is not reachable.

---

## ✅ Solution Applied

### 1. Added IPv4-First DNS Resolution
```yaml
# docker-compose.yml
environment:
  - NODE_OPTIONS=--dns-result-order=ipv4first
```

This forces Node.js to prefer IPv4 addresses when resolving DNS.

### 2. Force IPv4 in PostgreSQL Pool
```javascript
// config/db.js & seed-data.js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4  // Force IPv4
});
```

### 3. Use DATABASE_URL Instead of Individual Variables
```yaml
# docker-compose.yml
environment:
  - DATABASE_URL=postgresql://postgres:12410279s@db.xmsgqhsdbxvhxuvzhrpy.supabase.co:5432/postgres
```

### 4. Removed Local PostgreSQL Service
Since you're using Supabase cloud, we removed the local postgres container.

---

## 🚀 How to Run

### Start Services:
```bash
# Stop existing containers
docker-compose down

# Remove old volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Check logs
docker logs metadata-search-backend -f
```

### Expected Output:
```
◇ injecting env (9) from .env
[IndexManager] Singleton created
[db] Connected to PostgreSQL
[IndexManager] Initializing...
[IndexManager] Initialized successfully
[api] Starting server...
[api] Listening on port 3000
[api] Environment: development
```

---

## 📝 Current Configuration

### docker-compose.yml
```yaml
services:
  backend:
    environment:
      - NODE_OPTIONS=--dns-result-order=ipv4first
      - DATABASE_URL=postgresql://postgres:12410279s@db.xmsgqhsdbxvhxuvzhrpy.supabase.co:5432/postgres
```

### db.js
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4  // IPv4 only
});
```

---

## 🔍 Why This Works

### The Problem:
- Docker DNS resolves Supabase hostname to IPv6 address
- IPv6 network is not reachable (ENETUNREACH)
- Connection fails

### The Fix:
1. **NODE_OPTIONS=--dns-result-order=ipv4first**
   - Tells Node.js to try IPv4 first
   - Falls back to IPv6 only if IPv4 fails

2. **family: 4**
   - Forces PostgreSQL client to use IPv4 sockets
   - Ignores IPv6 addresses completely

3. **DATABASE_URL**
   - Single connection string (cleaner)
   - Supabase standard format
   - Includes SSL settings

---

## ✅ Verification

### Test Connection:
```bash
# Inside backend container
docker-compose exec backend node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('Failed:', err);
  else console.log('Success:', res.rows[0]);
  pool.end();
});
"
```

### Expected Output:
```
Success: { now: 2024-01-15T10:30:45.123Z }
```

---

## 🐛 Troubleshooting

### Still Getting IPv6 Error?
```bash
# 1. Completely remove containers and images
docker-compose down -v
docker system prune -a

# 2. Rebuild
docker-compose build --no-cache

# 3. Start
docker-compose up -d
```

### Check DNS Resolution:
```bash
docker-compose exec backend node -e "
const dns = require('dns');
dns.lookup('db.xmsgqhsdbxvhxuvzhrpy.supabase.co', (err, address, family) => {
  console.log('Address:', address);
  console.log('Family:', family === 4 ? 'IPv4' : 'IPv6');
});
"
```

Should output:
```
Address: 123.45.67.89
Family: IPv4
```

---

## 📚 Additional Resources

- **Node.js DNS Options**: https://nodejs.org/api/cli.html#--dns-result-orderorder
- **pg Connection**: https://node-postgres.com/apis/pool
- **Supabase Connection**: https://supabase.com/docs/guides/database/connecting-to-postgres

---

**✅ IPv6 issue fixed! Your backend should now connect to Supabase successfully!**
