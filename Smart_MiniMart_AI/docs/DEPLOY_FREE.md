# Deploy free-tier: Neon (Postgres) + Render (API)
# Mục tiêu: BE public HTTPS, data VN tạm, COD trước.

## Stack free đề xuất

| Layer | Service | Free tier note |
|---|---|---|
| DB | **Neon** Postgres | ~0.5GB, sleep khi idle |
| API | **Render** Web Service (Docker) | Sleep ~15 phút không traffic (cold start 30–60s) |
| Repo | GitHub `H-thanh0603/App_TMDT` | auto deploy on push |
| Mobile | Expo Go trỏ URL Render | đổi `EXPO_PUBLIC_API_URL` |

> Railway/Fly cũng được; Render + Neon là cặp free phổ biến, không cần thẻ nếu còn free plan.

---

## A. Tạo database Neon (3 phút)

1. Vào https://console.neon.tech → Sign up (GitHub OK)
2. **New Project**
   - Name: `smart-minimart`
   - Region: **Singapore** (gần VN) nếu có
   - Postgres 16
3. Copy **Connection string** dạng:
   ```
   postgresql://USER:PASS@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Lưu lại → đây là `DATABASE_URL` production.

### Đẩy schema lên Neon (máy local)

```bash
cd Smart_MiniMart_AI/backend

# tạm export (PowerShell)
$env:DATABASE_URL="postgresql://...neon.../neondb?sslmode=require"

npx prisma migrate deploy
```

### (Khuyến nghị) seed users + demo sau migrate

Cách 1 — chạy seed trỏ Neon từ máy:

```bash
$env:DATABASE_URL="postgresql://...neon..."
npm run db:seed
npm run db:seed:demo
```

Cách 2 — dump/restore data local (nặng hơn, giữ 339 SP VN):

```bash
docker exec minimart-postgres pg_dump -U minimart -d smart_minimart -Fc -f /tmp/mm.dump
docker cp minimart-postgres:/tmp/mm.dump ./mm.dump
# restore: dùng neonctl hoặc psql với connection string Neon
```

Với free tier, **seed base + demo** thường đủ; import full VN crawl có thể làm bước 2.

---

## B. Deploy API lên Render (5–8 phút)

### Cách 1 — Blueprint (nhanh)

1. Push code có `render.yaml` + `backend/Dockerfile` lên `main`
2. https://dashboard.render.com → **New** → **Blueprint**
3. Connect repo `H-thanh0603/App_TMDT`
4. Render đọc `Smart_MiniMart_AI/render.yaml`
5. Vào service **smart-minimart-api** → **Environment** set tay:
   - `DATABASE_URL` = Neon connection string
   - `DEEPSEEK_API_KEY` = key thật (hoặc để trống → AI fallback mock)
   - `AI_ENCRYPTION_KEY` = 64 hex (local `.env` đang có)
6. **Manual Deploy**

### Cách 2 — Web Service thủ công

1. New → Web Service → repo GitHub
2. Root directory: `Smart_MiniMart_AI/backend`
3. Runtime: **Docker**
4. Dockerfile path: `Dockerfile`
5. Instance: **Free**
6. Health check path: `/api/v1/health`
7. Env như trên

### Sau khi deploy xong

URL dạng:
```
https://smart-minimart-api.onrender.com/api/v1/health
https://smart-minimart-api.onrender.com/api/v1/docs
```

Smoke:

```bash
python scripts/smoke_api.py https://YOUR-SERVICE.onrender.com/api/v1
```

---

## C. Mobile trỏ production

File `Smart_MiniMart_AI/mobile/.env`:

```env
EXPO_PUBLIC_API_URL=https://YOUR-SERVICE.onrender.com/api/v1
EXPO_PUBLIC_APP_NAME=Smart MiniMart AI
EXPO_PUBLIC_DEMO_MODE=true
```

Rồi:

```bash
cd mobile
npx expo start --go --clear
```

> Free Render **sleep** khi idle → request đầu 30–90s. Mở `/health` trước khi demo.

---

## D. Checklist go-live (Phase 1)

- [ ] Neon project + `migrate deploy`
- [ ] Seed users (5 account `123456`)
- [ ] Render service Live (health 200)
- [ ] Swagger public mở được
- [ ] Smoke script pass trên URL public
- [ ] Mobile `.env` trỏ HTTPS
- [ ] Login customer trên Expo Go
- [ ] Tạo 1 đơn COD thử

**Chưa làm ở phase này:** domain custom, VNPay live, VietQR bank, shop thật, CI.

---

## E. Giới hạn free (nói thẳng)

| Rủi ro | Ảnh hưởng | Cách xử lý tạm |
|---|---|---|
| Render sleep | Cold start chậm | Warm `/health` trước demo |
| Neon suspend | DB ngủ | Mở console Neon / hit API |
| No custom domain | URL xấu | OK giai 1 |
| Ephemeral disk | Upload file mất | Chưa bật upload |
| Secrets trên dashboard | Phải set tay | Không commit `.env` |

---

## F. Bước tiếp sau khi online

1. **Payment:** COD flow mượt → thêm VietQR (ảnh QR tĩnh bank) → VNPay sandbox/live  
2. **Catalog:** CSV shop thay crawl  
3. **Ops:** pg_dump cron, log error (Sentry free)  
4. **Domain** + plan paid khi có đơn thật  

---

## G. File trong repo hỗ trợ deploy

- `Smart_MiniMart_AI/backend/Dockerfile`
- `Smart_MiniMart_AI/backend/docker-entrypoint.sh` (migrate + start)
- `Smart_MiniMart_AI/render.yaml`
- `Smart_MiniMart_AI/docs/DEPLOY_FREE.md` (file này)
- `Smart_MiniMart_AI/scripts/smoke_api.py`

## H. Lệnh one-shot local verify Docker image

```bash
cd Smart_MiniMart_AI/backend
docker build -t smart-minimart-api .
docker run --rm -p 4000:4000 \
  -e DATABASE_URL="postgresql://minimart:minimart_dev_2026@host.docker.internal:5432/smart_minimart" \
  -e JWT_ACCESS_SECRET=test \
  -e JWT_REFRESH_SECRET=test \
  -e AI_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef \
  smart-minimart-api
```
