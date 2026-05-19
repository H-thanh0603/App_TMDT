@echo off
chcp 65001 >nul
echo =============================================
echo  Smart MiniMart AI - Setup Script (Windows)
echo =============================================
echo.

echo [1/4] Kiem tra Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo  X Docker chua duoc cai. Tai: https://docs.docker.com/desktop/install/windows-install/
    pause
    exit /b 1
)
echo  OK Docker

echo [2/4] Kiem tra Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo  X Node.js chua duoc cai. Tai: https://nodejs.org/
    pause
    exit /b 1
)
echo  OK Node.js
node --version

echo [3/4] Khoi dong Postgres...
docker compose up -d postgres
if errorlevel 1 (
    echo  X Khong khoi dong duoc Postgres
    pause
    exit /b 1
)
echo  Cho Postgres ready (10s)...
timeout /t 10 /nobreak >nul

echo [4/4] Setup backend...
cd backend
if not exist .env copy .env.example .env
call npm install
call npx prisma generate
call npx prisma migrate dev --name init --skip-seed
call npm run db:seed
cd ..

echo.
echo =============================================
echo  HOAN TAT!
echo =============================================
echo.
echo  Backend:  cd backend ^&^& npm run start:dev
echo  OCR:      cd ocr-service ^&^& uvicorn app.main:app --port 5001
echo  Mobile:   cd mobile ^&^& npm install ^&^& npx expo start
echo.
echo  Demo:  customer@minimart.vn / 123456
echo.
pause
