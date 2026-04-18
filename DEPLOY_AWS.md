# 🌩️ AWS Deployment Guide - Backend

Complete guide to deploying your Metadata Search backend on AWS.

---

## Architecture Overview

```
Internet
    ↓
[Route 53] (DNS)
    ↓
[CloudFront] (CDN - Optional)
    ↓
[Application Load Balancer]
    ↓
[EC2 Instances] (Auto Scaling Group)
    ├─ Backend Node.js App
    └─ PM2 Process Manager
    ↓
[RDS MySQL] (Managed Database)
    ↓
[S3 Bucket] (File Storage)
```

---

## Step 1: AWS Setup (Prerequisites)

### 1.1 Create AWS Account
- Go to https://aws.amazon.com
- Create free tier account
- Set up billing alerts

### 1.2 Install AWS CLI
```bash
# Windows (using winget)
winget install Amazon.AWSCLI

# Or download from: https://aws.amazon.com/cli/

# Configure CLI
aws configure
# Enter: Access Key, Secret Key, Region (us-east-1), Output (json)
```

---

## Step 2: Database - Amazon RDS MySQL

### 2.1 Create RDS Instance
```bash
# Using AWS Console:
1. Go to RDS Dashboard
2. Create Database
3. Choose: MySQL
4. Template: Free Tier
5. Settings:
   - DB Instance Class: db.t3.micro
   - Storage: 20 GB
   - Master Username: admin
   - Master Password: (secure password)
6. Connectivity:
   - VPC: Default
   - Public Access: Yes (for development)
   - Security Group: Create new
7. Database name: metadata_search
8. Create
```

### 2.2 Get Connection Details
```bash
# After creation, note:
- Endpoint: metadata-search.xxxxx.us-east-1.rds.amazonaws.com
- Port: 3306
- Username: admin
- Password: (your password)
```

### 2.3 Create Database Schema
```bash
# Connect to RDS
mysql -h metadata-search.xxxxx.us-east-1.rds.amazonaws.com \
      -u admin -p metadata_search < backend/migrations/001_create_tables.sql
```

---

## Step 3: File Storage - Amazon S3

### 3.1 Create S3 Bucket
```bash
# Using AWS CLI
aws s3api create-bucket \
  --bucket metadata-search-files-$(date +%s) \
  --region us-east-1

# Or via Console:
1. Go to S3 Dashboard
2. Create Bucket
3. Name: metadata-search-files-unique
4. Region: us-east-1
5. Block all public access: Yes
6. Create
```

### 3.2 Create IAM User for S3 Access
```bash
# Create IAM User
aws iam create-user --user-name metadata-search-app

# Attach S3 policy
aws iam attach-user-policy \
  --user-name metadata-search-app \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Create access keys
aws iam create-access-key --user-name metadata-search-app
# Save the AccessKeyId and SecretAccessKey
```

---

## Step 4: Compute - Amazon EC2

### 4.1 Launch EC2 Instance
```bash
# Using AWS Console:
1. Go to EC2 Dashboard
2. Launch Instance
3. Name: metadata-search-backend
4. AMI: Ubuntu 22.04 LTS
5. Instance Type: t3.micro (Free Tier)
6. Key Pair: Create new or use existing
7. Security Group:
   - Allow SSH (22) from your IP
   - Allow HTTP (3000) from anywhere
8. Storage: 20 GB
9. Launch
```

### 4.2 Connect to EC2
```bash
# SSH into instance
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### 4.3 Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install MySQL client (for migrations)
sudo apt install -y mysql-client

# Verify installations
node --version
npm --version
pm2 --version
```

### 4.4 Deploy Application
```bash
# Clone your repository
git clone https://github.com/yourusername/metadata-search.git
cd metadata-search/backend

# Install dependencies
npm install --production

# Create .env file
cat > .env << EOF
NODE_ENV=production
PORT=3000

# Database (RDS)
DB_HOST=metadata-search.xxxxx.us-east-1.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=your_secure_password
DB_NAME=metadata_search
DB_POOL_SIZE=20

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=metadata-search-files-unique
AWS_REGION=us-east-1

# CORS (Add your frontend URL)
CORS_ORIGIN=https://your-frontend.vercel.app,http://localhost:5173
EOF

# Run migrations
npm run migrate

# Seed data (optional - for demo)
node scripts/seed-data.js 100000
```

### 4.5 Start with PM2
```bash
# Start application
pm2 start app.js --name "metadata-search-api"

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command shown

# Monitor
pm2 logs
pm2 status
pm2 monit
```

---

## Step 5: Security Group Configuration

### 5.1 Update RDS Security Group
```bash
# Allow EC2 to access RDS
1. Go to RDS Dashboard
2. Select your database
3. Security Group → Inbound Rules
4. Add Rule:
   - Type: MySQL/Aurora (3306)
   - Source: Custom (EC2 Security Group ID)
5. Save
```

### 5.2 EC2 Security Group (Already configured)
- Inbound: Port 3000 (0.0.0.0/0)
- Inbound: Port 22 (Your IP)
- Outbound: All traffic

---

## Step 6: Load Balancer (Optional - For Production)

### 6.1 Create Application Load Balancer
```bash
# Using AWS Console:
1. Go to EC2 → Load Balancers
2. Create Application Load Balancer
3. Name: metadata-search-alb
4. Scheme: Internet-facing
5. Listeners: HTTP (80)
6. Availability Zones: Select 2
7. Security Group: Create new (allow port 80)
8. Target Group:
   - Protocol: HTTP
   - Port: 3000
   - Health Check: /api/v1/search/stats
9. Register EC2 instances
10. Create
```

### 6.2 Update .env
```env
# No changes needed - PM2 handles port 3000
# ALB routes traffic to port 3000
```

---

## Step 7: Domain & SSL (Optional)

### 7.1 Route 53 DNS
```bash
# Register domain or use existing
1. Go to Route 53
2. Create Hosted Zone
3. Add A Record → Point to ALB DNS
```

### 7.2 SSL Certificate (AWS Certificate Manager)
```bash
# Request certificate
1. Go to ACM Dashboard
2. Request Public Certificate
3. Domain: api.yourdomain.com
4. Validation: DNS
5. Add to ALB Listener (HTTPS 443)
```

---

## Step 8: Environment Configuration

### Backend .env (Production)
```env
NODE_ENV=production
PORT=3000

# Database
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=secure_password
DB_NAME=metadata_search
DB_POOL_SIZE=20

# AWS S3
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET=metadata-search-files-1234567890
AWS_REGION=us-east-1

# CORS
CORS_ORIGIN=https://your-frontend.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging
LOG_LEVEL=info
```

### Frontend .env.production
```env
VITE_API_URL=https://api.yourdomain.com/api/v1
# OR
VITE_API_URL=http://your-ec2-public-ip:3000/api/v1
```

---

## Step 9: Testing

### 9.1 Test Backend
```bash
# Test health check
curl http://your-ec2-ip:3000/api/v1/search/stats

# Test search
curl "http://your-ec2-ip:3000/api/v1/search?prefix=document"

# Test file creation
curl -X POST http://your-ec2-ip:3000/api/v1/files \
  -H "Content-Type: application/json" \
  -d '{
    "s3_key": "test/file.pdf",
    "bucket": "your-bucket",
    "name": "file.pdf",
    "size": 1024000,
    "mime_type": "application/pdf"
  }'
```

### 9.2 Test Frontend
```bash
# Update frontend env
VITE_API_URL=http://your-ec2-ip:3000/api/v1

# Build and deploy to Vercel
cd frontend
vercel --prod
```

---

## Step 10: Monitoring & Maintenance

### 10.1 CloudWatch Logs
```bash
# PM2 logs to CloudWatch (optional)
# Install CloudWatch agent
sudo apt install -y amazon-cloudwatch-agent

# Configure and start
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a configure
```

### 10.2 RDS Monitoring
- Go to RDS Dashboard → Your Database
- Monitor: CPU, Memory, Connections, Storage
- Set up CloudWatch Alarms

### 10.3 EC2 Monitoring
- Go to EC2 Dashboard → Your Instance
- Monitor: CPU, Network, Status Checks
- Set up Auto Scaling (optional)

### 10.4 Backups
```bash
# RDS Automated Backups (enabled by default)
# - Retention: 7 days
# - Backup Window: Configure in RDS settings

# Manual snapshots
aws rds create-db-snapshot \
  --db-instance-identifier metadata-search \
  --db-snapshot-identifier manual-backup-$(date +%Y%m%d)
```

---

## 💰 Cost Estimation (Monthly)

| Service | Configuration | Cost |
|---------|--------------|------|
| EC2 t3.micro | 1 vCPU, 1GB RAM | $8.76 |
| RDS t3.micro | MySQL, 20GB | $12.41 |
| S3 | 10GB storage | $0.23 |
| Data Transfer | 1GB outbound | $0.09 |
| **Total** | | **~$21.49/month** |

**Free Tier (First 12 months):**
- EC2: 750 hours/month ✅ FREE
- RDS: 750 hours/month ✅ FREE
- S3: 5GB ✅ FREE
- **Total: $0 for first year!**

---

## 🚀 Quick Deploy Commands

```bash
# 1. Setup EC2
ssh -i key.pem ubuntu@EC2_IP
sudo apt update && sudo apt install -y nodejs mysql-client
sudo npm install -g pm2

# 2. Deploy app
git clone https://github.com/yourusername/metadata-search.git
cd metadata-search/backend
npm install --production

# 3. Configure
# Edit .env with your RDS and S3 credentials

# 4. Migrate & Seed
npm run migrate
node scripts/seed-data.js 100000

# 5. Start
pm2 start app.js --name "metadata-search-api"
pm2 save
pm2 startup
```

---

## 🐛 Troubleshooting

### Issue: Can't connect to RDS
**Fix:**
```bash
# Check security group
aws ec2 describe-security-groups --group-ids sg-xxxxx

# Test connection from EC2
mysql -h your-rds-endpoint.rds.amazonaws.com -u admin -p
```

### Issue: PM2 not starting
**Fix:**
```bash
pm2 logs
pm2 restart metadata-search-api
# Check app.js for errors
```

### Issue: CORS errors
**Fix:**
```env
# Update .env
CORS_ORIGIN=https://your-frontend.vercel.app
```

### Issue: S3 access denied
**Fix:**
```bash
# Check IAM permissions
aws iam get-user --user-name metadata-search-app

# Test S3 access
aws s3 ls s3://your-bucket
```

---

## 📞 Support

- **AWS Docs**: https://docs.aws.amazon.com
- **EC2 Guide**: https://docs.aws.amazon.com/ec2
- **RDS Guide**: https://docs.aws.amazon.com/rds
- **S3 Guide**: https://docs.aws.amazon.com/s3

---

**🎉 Your backend is now deployed on AWS!**
