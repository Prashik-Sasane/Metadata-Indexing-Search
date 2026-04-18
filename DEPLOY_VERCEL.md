# 🚀 Deploy to Vercel Guide

## Prerequisites
- ✅ Vercel account (free): https://vercel.com
- ✅ GitHub/GitLab/Bitbucket account
- ✅ Backend deployed and accessible via HTTPS

---

## Option 1: Deploy via Vercel CLI (Recommended)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy Frontend
```bash
cd frontend
vercel
```

**First time setup:**
- Set up and deploy? **Y**
- Which scope? **Select your account**
- Link to existing project? **N**
- Project name? **metadata-search-frontend** (or your choice)
- Directory? **./frontend**
- Override settings? **N**

### Step 4: Set Environment Variables
```bash
vercel env add VITE_API_URL production
# Enter your backend URL: https://your-backend-url.com/api/v1
```

### Step 5: Deploy to Production
```bash
vercel --prod
```

---

## Option 2: Deploy via Vercel Dashboard (GUI)

### Step 1: Push to GitHub
```bash
cd d:\Metadata-Indexing-Search
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/metadata-search.git
git push -u origin main
```

### Step 2: Import to Vercel
1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 3: Add Environment Variables
In Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_API_URL` | `https://your-backend.com/api/v1` | Production |
| `VITE_API_URL` | `http://localhost:3000/api/v1` | Development |

### Step 4: Deploy
Click **Deploy** button!

---

## ⚠️ IMPORTANT: Backend Configuration

### Your Backend MUST be:
1. **Deployed to a cloud service** (not localhost)
2. **Accessible via HTTPS**
3. **CORS configured** to allow your Vercel URL

### Backend Deployment Options:

#### Option A: Render (Free)
- https://render.com
- Deploy Node.js app
- Get URL: `https://your-app.onrender.com`

#### Option B: Railway (Free tier)
- https://railway.app
- Deploy with MySQL
- Get URL: `https://your-app.railway.app`

#### Option C: AWS/GCP/Azure
- Deploy to cloud VM
- Use domain with SSL

### Update Backend CORS:
In `backend/app.js`, update CORS settings:
```javascript
app.use(
  cors({
    origin: [
      'http://localhost:5173',  // Local dev
      'https://your-vercel-app.vercel.app',  // Production
    ],
    credentials: true,
  })
);
```

### Update Frontend .env:
```env
# For production deployment
VITE_API_URL=https://your-backend-url.com/api/v1
```

---

## 📝 Environment Variables

### Create `.env.production` in frontend folder:
```env
VITE_API_URL=https://your-backend-url.com/api/v1
```

### Add to vercel.json (alternative):
```json
{
  "env": {
    "VITE_API_URL": "https://your-backend-url.com/api/v1"
  }
}
```

---

## 🔧 Pre-Deployment Checklist

- [ ] Backend is deployed and accessible via HTTPS
- [ ] CORS is configured in backend to allow Vercel domain
- [ ] `VITE_API_URL` environment variable is set in Vercel
- [ ] All API endpoints are working
- [ ] Build succeeds locally: `npm run build`
- [ ] No hardcoded localhost URLs in code

---

## 🧪 Test Before Deploy

### 1. Test Build Locally
```bash
cd frontend
npm run build
npm run preview
# Check http://localhost:4173
```

### 2. Test with Production API
```bash
# Update .env temporarily
VITE_API_URL=https://your-backend-url.com/api/v1

# Build and test
npm run build
npm run preview
```

### 3. Verify All Pages Work
- [ ] Landing page loads
- [ ] Dashboard shows stats
- [ ] Search works
- [ ] Nodes page shows DSA metrics
- [ ] File detail page works

---

## 🚀 Deployment Commands

### Deploy to Preview
```bash
vercel
```
Creates a preview URL: `https://project-name-xxxx.vercel.app`

### Deploy to Production
```bash
vercel --prod
```
Updates production URL: `https://project-name.vercel.app`

### Check Deploy Status
```bash
vercel ls
```

---

## 🔗 Post-Deployment

### 1. Custom Domain (Optional)
```bash
vercel domains add yourdomain.com
```

### 2. Check Logs
```bash
vercel logs
```

### 3. View Analytics
Dashboard → Analytics → Real-time visitors

---

## 🐛 Common Issues

### Issue: Build Fails
**Error**: TypeScript errors  
**Fix**: 
```bash
npm run build  # Fix errors locally first
```

### Issue: API Calls Fail
**Error**: CORS error or 404  
**Fix**:
- Check `VITE_API_URL` is set correctly
- Verify backend CORS allows your Vercel domain
- Test backend URL in browser

### Issue: Page Not Found on Refresh
**Fix**: Already handled in `vercel.json` with rewrites

### Issue: Environment Variables Not Working
**Fix**:
```bash
# Redeploy with env vars
vercel env pull .env.production
vercel --prod
```

---

## 📊 Vercel Features You Get

✅ **Automatic HTTPS**  
✅ **Global CDN**  
✅ **Automatic deployments on git push**  
✅ **Preview deployments**  
✅ **Analytics**  
✅ **Serverless functions** (if needed)  
✅ **Custom domains**  
✅ **Edge network**  

---

## 🎯 Quick Deploy Summary

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
cd frontend
vercel --prod

# 4. Set environment variable
vercel env add VITE_API_URL production
# Enter: https://your-backend.com/api/v1

# 5. Redeploy with env
vercel --prod
```

---

## 🌐 Example URLs

**Frontend (Vercel)**: `https://metadata-search.vercel.app`  
**Backend (Render)**: `https://metadata-search-api.onrender.com`  

**Environment Variable**:
```
VITE_API_URL=https://metadata-search-api.onrender.com/api/v1
```

---

## 📞 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Vite Deployment**: https://vitejs.dev/guide/static-deploy.html
- **Support**: Check Vercel dashboard logs

---

**🎉 Your app is now live on Vercel!**
