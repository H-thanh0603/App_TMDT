# Smart MiniMart AI

Hệ thống mobile commerce cho siêu thị mini, tích hợp AI + OCR + AI Manager.

## Stack

| Thành phần      | Công nghệ                                      |
| --------------- | ---------------------------------------------- |
| Mobile App      | React Native + Expo (TypeScript)               |
| Backend API     | NestJS + Prisma + TypeScript                   |
| Database        | PostgreSQL 16                                  |
| OCR Service     | Python FastAPI + PaddleOCR / EasyOCR / Mock    |
| AI Gateway      | NestJS module — DeepSeek / Mock / Rule-based   |
| Auth            | JWT (access + refresh)                         |

## Roles

- **CUSTOMER** — mua hàng, AI Search, AI Assistant, đánh giá
- **STAFF** — xử lý đơn, nhập hàng, OCR phiếu nhập, kiểm kho
- **STORE_ADMIN** — quản lý sản phẩm, kho, đơn, khuyến mãi, báo cáo
- **AI_MANAGER** — cấu hình provider, model, OCR engine, prompt, fallback, log

## Cấu trúc thư mục

```
Smart_MiniMart_AI/
├── backend/            # NestJS API + Prisma + AI Gateway
├── mobile/             # React Native + Expo
├── ocr-service/        # Python FastAPI OCR
├── docs/               # Tài liệu thiết kế chi tiết
├── scripts/            # Tiện ích (seed, demo data, ...)
├── docker-compose.yml  # Postgres + OCR service
└── README.md
```

## Quick start (dev)

```bash
# 1. Database
docker compose up -d postgres

# 2. Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run start:dev          # http://localhost:4000

# 3. OCR service
cd ../ocr-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 5001 --reload

# 4. Mobile
cd ../mobile
npm install
cp .env.example .env
npx expo start
```

## Demo accounts (sau khi seed)

| Role         | Email                 | Password |
| ------------ | --------------------- | -------- |
| Customer     | customer@minimart.vn  | 123456   |
| Customer VIP | vip@minimart.vn       | 123456   |
| Staff        | staff@minimart.vn     | 123456   |
| Store Admin  | admin@minimart.vn     | 123456   |
| AI Manager   | ai@minimart.vn        | 123456   |

## Lộ trình 5 MVP

| Giai đoạn | Nội dung                                                                  |
| --------- | ------------------------------------------------------------------------- |
| MVP 1     | Customer mua hàng + Store Admin quản lý sản phẩm/đơn                      |
| MVP 2     | Kho, cảnh báo hàng gần hết hạn (7/15/30 ngày), hàng bán chậm 30 ngày      |
| MVP 3     | AI Search (mô tả tự nhiên), AI Assistant chat, rule-based analytics       |
| MVP 4     | OCR phiếu nhập hàng → bảng chỉnh sửa → xác nhận nhập kho                  |
| MVP 5     | AI Manager — Provider, Task model mapping, OCR engine, Prompt, Fallback   |
| Nâng cao  | Vision search, dự báo nhu cầu, multi-store, xuất Excel/PDF                |

Xem `docs/` để biết chi tiết thiết kế từng MVP.
