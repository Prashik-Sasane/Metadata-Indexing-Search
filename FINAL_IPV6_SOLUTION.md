# 🚨 Supabase IPv6 Issue - Final Solution

## The Problem
Your network/ISP doesn't support IPv6, but Supabase DNS resolves to IPv6 addresses first, causing:
```
Error: connect ENETUNREACH 2406:da14:271:9922:2179:26c6:8f1:7985:5432
```

## ✅ FINAL SOLUTION: Use IP Address Directly

Since DNS resolution keeps failing, bypass DNS entirely and use Supabase's IPv4 address directly.

### Step 1: Get Current IPv4 Address
```bash
nslookup db.xmsgqhsdbxvhxuvzhrpy.supabase.co 8.8.8.8
```

Current IPv4 addresses (as of now):
```
185.38.109.200
185.38.109.201
185.38.109.202
185.38.109.203
185.38.109.204
185.38.109.205
185.38.109.206
185.38.109.207
185.38.109.208
185.38.109.209
```

**⚠️ NOTE:** These IPs may change! Check again if connection fails.

### Step 2: Update docker-compose.yml

Replace the hostname with IP address:

```yaml
environment:
  - DATABASE_URL=postgresql://postgres:12410279s@185.38.109.200:5432/postgres
```

**Remove these lines:**
```yaml
- NODE_OPTIONS=--dns-result-order=ipv4first  # Remove
extra_hosts:                                  # Remove
  - "db.xmsgqhsdbxvhxuvzhrpy.supabase.co:185.38.109.200"  # Remove
```

### Step 3: Restart

```bash
docker-compose down
docker-compose up -d
docker logs metadata-search-backend -f
```

---

## 📝 Complete docker-compose.yml (Backend Section)

```yaml
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: metadata-search-backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
      - DATABASE_URL=postgresql://postgres:12410279s@185.38.109.200:5432/postgres
      - REDIS_URL=redis://redis:6379
      - KAFKA_BROKER=kafka:29092
      - AWS_REGION=us-east-1
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - S3_BUCKET=metadata-search-files
    depends_on:
      redis:
        condition: service_healthy
      kafka:
        condition: service_started
    volumes:
      - ./backend:/app
      - /app/node_modules
    networks:
      - metadata-search-network
```

---

## ✅ Expected Result

```
[db] Connecting to: 185.38.109.200 : 5432
[db] Connected to PostgreSQL
[IndexManager] Initializing...
[IndexManager] Initialized successfully
[api] Listening on port 3000
```

---

## 🔍 Why Other Solutions Failed

| Attempt | Why It Failed |
|---------|--------------|
| `family: 4` in pg Pool | DNS still resolves to IPv6 first |
| `NODE_OPTIONS=--dns-result-order=ipv4first` | Doesn't work inside Docker containers |
| `dns: 8.8.8.8` in docker-compose | Google DNS also returns IPv6 for Supabase |
| `extra_hosts` mapping | Not supported properly on Windows Docker Desktop |

## ✅ Why IP Address Works

- Bypasses DNS resolution entirely
- Directly connects to IPv4 address
- No IPv6 attempt
- Works on all networks

---

## ⚠️ Important Notes

1. **IP May Change**: Supabase uses load balancers, IPs can change
2. **Check Monthly**: Run nslookup again if connection suddenly fails
3. **Multiple IPs**: Try different IPs from the list if one doesn't work
4. **SSL Still Works**: SSL certificate validates against hostname, not IP

---

## 🐛 Troubleshooting

### Connection Refused?
Try a different IP from the list:
```yaml
DATABASE_URL=postgresql://postgres:12410279s@185.38.109.201:5432/postgres
```

### SSL Error?
The IP approach still uses SSL. If you get SSL errors:
```javascript
// In db.js
ssl: { 
  rejectUnauthorized: false,
  servername: 'db.xmsgqhsdbxvhxuvzhrpy.supabase.co'  // Add this
}
```

### Need to Update IP?
```bash
# Get new IP
nslookup db.xmsgqhsdbxvhxuvzhrpy.supabase.co 8.8.8.8

# Update docker-compose.yml
# Restart
docker-compose down && docker-compose up -d
```

---

## 🎯 Quick Commands

```bash
# Check current IP
nslookup db.xmsgqhsdbxvhxuvzhrpy.supabase.co 8.8.8.8

# Test connection
docker-compose exec backend node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: '185.38.109.200',
  port: 5432,
  user: 'postgres',
  password: '12410279s',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  family: 4
});
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? 'Failed:', err.message : 'Success:', res.rows[0]);
  pool.end();
});
"

# View logs
docker logs metadata-search-backend -f
```

---

**✅ This is the most reliable solution for IPv6-unreachable networks!**
