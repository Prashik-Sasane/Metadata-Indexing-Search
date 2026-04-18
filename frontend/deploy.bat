@echo off
REM 🚀 Quick Deploy Script for Vercel (Windows)
REM Usage: deploy.bat

echo.
echo ========================================
echo 🚀 Starting Vercel Deployment...
echo ========================================
echo.

REM Check if Vercel CLI is installed
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Vercel CLI not found. Installing...
    call npm install -g vercel
    echo.
)

REM Navigate to frontend directory
cd /d "%~dp0"

echo 📦 Building frontend...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Build failed! Please fix errors before deploying.
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Build successful!
echo.
echo 🌐 Deploying to Vercel...
echo.

REM Deploy
call vercel --prod

echo.
echo ========================================
echo 🎉 Deployment complete!
echo ========================================
echo.
echo ⚠️  Don't forget to set your environment variables:
echo    vercel env add VITE_API_URL production
echo.
pause
