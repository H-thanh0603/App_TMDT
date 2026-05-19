#!/usr/bin/env bash
set -e

echo "============================================="
echo " Smart MiniMart AI - Setup Script"
echo "============================================="

command -v docker >/dev/null 2>&1 || { echo "X Docker missing"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "X Node.js missing"; exit 1; }

echo "[1/3] Khởi động Postgres..."
docker compose up -d postgres
sleep 10

echo "[2/3] Setup backend..."
cd backend
[ -f .env ] || cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init --skip-seed
npm run db:seed
cd ..

echo "[3/3] Setup mobile..."
cd mobile
[ -f .env ] || cp .env.example .env
npm install
cd ..

echo
echo "============================================="
echo " HOÀN TẤT!"
echo "============================================="
echo " Backend:  cd backend && npm run start:dev"
echo " OCR:      cd ocr-service && uvicorn app.main:app --port 5001"
echo " Mobile:   cd mobile && npx expo start"
echo
echo " Demo: customer@minimart.vn / 123456"
