# 🚀 Deploy to Vercel - Quick Guide

## Fastest Way (3 Steps)

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login
```bash
vercel login
```

### 3. Deploy
```bash
# Double-click this file on Windows
deploy.bat

# OR run manually
cd frontend
vercel --prod
```

---

## ⚠️ Before Deploying

### You MUST have:
1. ✅ **Backend deployed** to cloud (not localhost)
   - Recommended: Render.com (free)
   - Alternative: Railway.app, AWS, GCP
   
2. ✅ **Backend URL** with HTTPS
   - Example: `https://your-api.onrender.com`

3. ✅ **CORS configured** in backend
   - Add your Vercel URL to allowed origins

---

## Set Environment Variable

After first deploy:
```bash
vercel env add VITE_API_URL production
# Enter: https://your-backend-url.com/api/v1
```

Then redeploy:
```bash
vercel --prod
```

---

## 📚 Full Documentation

See [DEPLOY_VERCEL.md](../DEPLOY_VERCEL.md) for complete guide including:
- GitHub integration
- Custom domains
- Troubleshooting
- Backend deployment options

---

## 🎯 Quick Commands

| Command | Description |
|---------|-------------|
| `vercel` | Deploy to preview |
| `vercel --prod` | Deploy to production |
| `vercel env add` | Add environment variable |
| `vercel logs` | View logs |
| `vercel ls` | List deployments |

---

## 🔗 Example Setup

**Frontend**: `https://my-app.vercel.app`  
**Backend**: `https://my-api.onrender.com`  

**Env Variable**:
```
VITE_API_URL=https://my-api.onrender.com/api/v1
```

---

**Need help?** Check [DEPLOY_VERCEL.md](../DEPLOY_VERCEL.md)
