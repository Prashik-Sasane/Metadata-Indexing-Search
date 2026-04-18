@echo off
REM 🚀 Quick Setup Script for Demo
REM This will seed your database with test data

echo.
echo ========================================
echo 🚀 Metadata Search - Quick Setup
echo ========================================
echo.

echo Step 1: Checking database connection...
cd /d "%~dp0backend"

REM Test database connection
node -e "const mysql = require('mysql2/promise'); (async () => { try { const conn = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'metadata_search' }); console.log('✅ Database connected!'); await conn.end(); } catch(e) { console.log('❌ Database connection failed: ' + e.message); process.exit(1); } })()"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Cannot connect to database!
    echo Please check your .env file and make sure MySQL is running.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 2: Seeding Data
echo ========================================
echo.
echo How many files do you want to generate?
echo.
echo [1] 10,000 files (quick demo - 10 seconds)
echo [2] 100,000 files (standard demo - 2 minutes)
echo [3] 1,000,000 files (impressive demo - 20 minutes)
echo.
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" set NUM_FILES=10000
if "%choice%"=="2" set NUM_FILES=100000
if "%choice%"=="3" set NUM_FILES=1000000

if "%NUM_FILES%"=="" (
    echo Invalid choice. Using 10,000 files.
    set NUM_FILES=10000
)

echo.
echo 📦 Seeding %NUM_FILES% files...
echo This may take a few minutes...
echo.

node scripts/seed-data.js %NUM_FILES%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Seeding failed!
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ Setup Complete!
echo ========================================
echo.
echo Your database now has test data.
echo.
echo Next steps:
echo 1. Start backend: npm start
echo 2. Start frontend: cd ..\frontend ^&^& npm run dev
echo 3. Open browser: http://localhost:5173
echo 4. Try searching for: "document", "report", "config"
echo.
echo 📖 See DEMO_GUIDE.md for presentation tips!
echo.
pause
