#!/bin/bash

# 🚀 Quick Deploy Script for Vercel
# Usage: ./deploy.sh

echo "🚀 Starting Vercel Deployment..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Navigate to frontend directory
cd "$(dirname "$0")"

echo "📦 Building frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix errors before deploying."
    exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""
echo "🌐 Deploying to Vercel..."
echo ""

# Deploy
vercel --prod

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "⚠️  Don't forget to set your environment variables:"
echo "   vercel env add VITE_API_URL production"
echo ""
