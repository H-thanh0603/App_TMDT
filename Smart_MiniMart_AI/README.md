# Smart MiniMart AI

> Hệ thống thương mại điện tử mini-mart tích hợp AI + OCR, đa vai trò.
> Đồ án tốt nghiệp HCMUAF.

[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs)]()
[![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo)]()
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)]()
[![DeepSeek](https://img.shields.io/badge/AI-DeepSeek-blueviolet)]()

---

## Tổng quan

Smart MiniMart AI là full-stack mobile e-commerce cho cửa hàng tiện lợi với 4 vai trò:

| Role | Tính năng chính |
|------|-----------------|
| **CUSTOMER** | Mua sắm, AI Search, AI Chat, voucher, tích điểm, theo dõi đơn |
| **STAFF** | Xử lý đơn, OCR phiếu nhập, nhận thông báo từ admin |
| **STORE_ADMIN** | Quản lý SP / kho / đơn / NV / khuyến mãi / cài đặt / broadcast |
| **AI_MANAGER** | Cấu hình AI provider, model, OCR engine, prompt, log, fallback |

## Stack công nghệ

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile (Expo / React Native)             │
│           4 navigators × ~30 screens, role-based            │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST + JWT
┌──────────────────────────┴──────────────────────────────────┐
│              Backend (NestJS + Prisma)                      │
│  Modules: auth · users · products · cart · orders ·         │
│           promotions · categories · payments · settings ·   │
│           notifications · ai-gateway · import-receipts ·    │
│           ai-manager · addresses                            │
└──────┬─────────────────────────┬─────────────────────────┬──┘
       │                         │                         │
┌──────┴────────┐  ┌─────────────┴────────┐  ┌─────────────┴──────┐
│ PostgreSQL 16 │  │ AI Gateway (DeepSeek)│  │ OCR (FastAPI/Paddle)│
│ Prisma schema │  │ chat / search / ocr  │  │ raw_text + confidence│
└───────────────┘  └──────────────────────┘  └─────────────────────┘
```

| Layer | Tech |
|-------|------|
| Mobile | Expo SDK 54 + React Native + TypeScript + React Query + Zustand |
| Backend | NestJS 10 + Prisma 5 + Postgres 16 + JWT |
| AI Gateway | DeepSeek (default) / OpenAI compatible / Mock fallback |
| OCR | Python FastAPI + PaddleOCR / EasyOCR / Mock |
| Payment | VNPay sandbox + COD |
| Auth | JWT access (15m) + refresh (14d) |

## Quick Start

### Yêu cầu

- Node.js 20+
- PostgreSQL 16 (hoặc Docker)
- Python 3.10+ (cho OCR service - optional, có thể dùng Mock)
- Tài khoản DeepSeek API ([platform.deepseek.com](https://platform.deepseek.com))

### 1. Database (Postgres)

```bash
# Cách 1: Docker
docker compose up -d postgres

# Cách 2: Postgres cài sẵn
createdb -U postgres smart_minimart
psql -U postgres -d smart_minimart -c "CREATE USER minimart WITH PASSWORD 'minimart_dev_2026';"
psql -U postgres -d smart_minimart -c "GRANT ALL ON DATABASE smart_minimart TO minimart;"
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Sửa .env: nhập DEEPSEEK_API_KEY của anh
npm install
npx prisma migrate dev
npx tsx prisma/seed.ts        # Seed 5 user demo + 30 SP + 9 danh mục
npm run start:dev
```

Backend chạy ở `http://localhost:4000/api/v1`. Swagger docs: `http://localhost:4000/api/v1/docs`.

### 3. Mobile

```bash
cd mobile
cp .env.example .env
# Sửa EXPO_PUBLIC_API_URL: thay localhost bằng IP máy thật khi chạy device
npm install
npx expo start --go --clear
```

- Bấm `a` mở Android emulator
- Hoặc quét QR bằng app **Expo Go** (Play Store / App Store)

### 4. OCR Service (optional)

Chỉ cần khi muốn OCR thật. Mặc định backend dùng Mock OCR cho demo.

```bash
cd ocr-service
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --port 5001
```

## Demo accounts

Tất cả password: `123456`

| Email | Role | Tính năng demo |
|-------|------|----------------|
| `customer@minimart.vn` | CUSTOMER | Mua sắm, AI Search, voucher |
| `vip@minimart.vn` | CUSTOMER (VIP) | Giảm 5%, badge VIP |
| `staff@minimart.vn` | STAFF | Xử lý đơn, OCR phiếu nhập |
| `admin@minimart.vn` | STORE_ADMIN | Tổng quan, CRUD SP / NV / KM |
| `ai@minimart.vn` | AI_MANAGER | Cấu hình AI provider, log |

## Seed kịch bản demo (P0)

Sau khi đã có DB + users/products:

```bash
cd backend
npm run db:seed:demo      # 40 orders đủ status, reviews, receipts, SP cận date/bán chậm
npm run db:purge-inactive # xóa SP crawl inactive (OFF/DJ/FS)
```

Smoke test API:

```bash
bash scripts/smoke_api.sh
# hoặc: bash scripts/smoke_api.sh http://localhost:4000/api/v1
```

Postman: `postman/Smart_MiniMart_AI.postman_collection.json` + env local.

## Tính năng

### Customer
- Trang chủ với banner khuyến mãi, danh mục, sản phẩm nổi bật
- AI Search: gõ ngôn ngữ tự nhiên, ví dụ "đồ uống dưới 30k"
- AI Chat trợ lý đề xuất sản phẩm
- Bộ lọc + phân trang trang sản phẩm (tên, giá, danh mục, còn hàng)
- Giỏ hàng + thanh toán COD/VNPay
- Quản lý địa chỉ giao hàng (CRUD)
- Lịch sử đơn hàng + chi tiết đơn (filter theo trạng thái)
- Tích điểm + tiến độ lên VIP (1000 điểm)
- Thông báo từ admin

### Staff
- Danh sách đơn theo trạng thái (Chờ → Xác nhận → Chuẩn bị → Giao → Hoàn tất)
- Stats hôm nay: Chờ xử lý, Đang xử lý, Đơn hôm nay
- Quét OCR phiếu nhập hàng (Mock + PaddleOCR + EasyOCR)
- Review item OCR + xác nhận nhập kho
- Profile + đổi thông tin cá nhân
- Nhận thông báo từ admin

### Admin
- Dashboard KPI: doanh thu hôm nay, tổng đơn, cảnh báo kho
- CRUD sản phẩm với filter Sắp hết / Hết hàng + chip danh mục
- CRUD danh mục
- Quản lý đơn hàng (lọc + hủy đơn)
- Quản lý kho: Cận date / Bán chậm / Cần nhập (3 tabs)
- CRUD nhân viên: tạo staff, đổi role, cộng/trừ điểm khách
- Khuyến mãi & Voucher: CRUD voucher với % hoặc fixed VND
- Cài đặt cửa hàng + broadcast thông báo

### AI Manager
- Control center: bật/tắt AI mode (Online / Hybrid / Mock / Rule-based)
- Cấu hình provider mặc định + fallback
- Xem log AI: prompts, latency, cost, tokens
- Cấu hình OCR engine (Paddle/Easy/Mock)

## API Endpoints (chính)

### Auth
- `POST /auth/register` - Đăng ký
- `POST /auth/login` - Đăng nhập
- `POST /auth/refresh` - Refresh token

### Products & Categories
- `GET /products?search&page&limit&sortBy&minPrice&maxPrice&categoryId&inStock`
- `GET /products/featured` - SP nổi bật
- `GET /categories` - Danh mục (public)
- `POST /categories` - Tạo danh mục (admin)

### Orders & Cart
- `GET /cart` - Lấy giỏ hàng
- `POST /cart/items` - Thêm sản phẩm vào giỏ `{ productId, quantity }`
- `PATCH /cart/items/:productId` - Cập nhật số lượng
- `DELETE /cart/items/:productId` - Xóa item
- `POST /orders` - Tạo đơn (`paymentMethod`: `COD` | `VNPAY_SANDBOX` | `QR_DEMO` | `WALLET_DEMO`)
- `GET /orders/mine` - Đơn của tôi (Customer)
- `GET /orders` - Tất cả đơn (Staff/Admin)
- `GET /orders/:id` - Chi tiết đơn
- `PATCH /orders/:id/status` - Cập nhật trạng thái (staff/admin)

### Promotions
- `GET /promotions/active` - Voucher đang chạy (public)
- `POST /promotions` - Tạo voucher (admin)

### Users (Admin)
- `GET /users?role&search` - Liệt kê NV/KH
- `POST /users/staff` - Tạo nhân viên
- `POST /users/:id/loyalty` - Cộng/trừ điểm

### Notifications
- `GET /notifications/me?isRead` - Thông báo của tôi
- `POST /notifications/me/:id/read` - Đánh dấu đọc
- `POST /notifications/broadcast` - Gửi thông báo (admin)

### Payments
- `POST /payments/vnpay/create` - Tạo URL thanh toán VNPay
- `GET /payments/vnpay/return` - Webhook callback VNPay

### AI Gateway
- `POST /ai/search` - AI Search ngôn ngữ tự nhiên
- `POST /ai/chat` - AI Assistant chat

### Import Receipts (Staff)
- `POST /import-receipts/scan` - Quét OCR phiếu nhập
- `GET /import-receipts` - Danh sách phiếu
- `POST /import-receipts/:id/confirm` - Xác nhận nhập kho

## Cấu trúc thư mục

```
Smart_MiniMart_AI/
├── backend/                     # NestJS API
│   ├── src/
│   │   ├── modules/             # auth, users, products, cart, orders,
│   │   │                        # promotions, categories, notifications,
│   │   │                        # settings, payments, addresses,
│   │   │                        # import-receipts, ai-gateway, ai-manager
│   │   ├── common/              # guards, decorators, prisma, filters
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma        # 25+ models
│   │   ├── migrations/
│   │   └── seed.ts              # Seed data demo
│   └── .env.example
│
├── mobile/                      # Expo React Native
│   ├── src/
│   │   ├── screens/
│   │   │   ├── auth/            # Login, Register
│   │   │   ├── customer/        # Home, ProductList, AISearch, Cart, Orders, Profile, Addresses, OrderDetail
│   │   │   ├── staff/           # StaffOrders, ImportReceipts, OCRScan, ReceiptDetail, StaffProfile
│   │   │   ├── admin/           # Dashboard, Products, Inventory, Orders, Users, Promotions, Categories, AdminProfile
│   │   │   └── ai-manager/      # AIControlCenter, AIProviders, AILogs, AIManagerProfile
│   │   ├── navigation/          # CustomerNavigator, StaffNavigator, AdminNavigator, AIManagerNavigator + RoleShell
│   │   ├── components/          # Button, Card, Badge, StatCard, ProductCard
│   │   ├── services/            # api.ts, queries.ts (React Query hooks)
│   │   ├── store/               # Zustand auth.store.ts
│   │   ├── theme/               # colors, spacing, typography
│   │   └── types/
│   └── .env.example
│
├── ocr-service/                 # Python FastAPI (PaddleOCR/EasyOCR)
│   ├── main.py
│   └── requirements.txt
│
├── docker-compose.yml           # Postgres + OCR
└── README.md
```

## Điểm kỹ thuật nổi bật

### 1. Role-based Navigation
4 navigators riêng biệt + `RoleShell` tự động chuyển dựa trên user role. Mỗi role chỉ nhìn thấy screens phù hợp.

### 2. AI Gateway abstraction
`AIRequest` -> `AITaskConfig` -> Provider (DeepSeek/OpenAI/Mock) -> fallback chain. Có thể bật/tắt AI từ admin panel mà không cần restart.

### 3. OCR pipeline với product matching
OCR raw text -> pre-clean (fix `O→0`, gộp số) -> LLM parse JSON với product hints -> fuzzy match với DB (4 strategies) -> bump confidence khi match được.

### 4. JWT auth với refresh
Access token 15 phút, refresh token 14 ngày. Mobile auto-refresh qua axios interceptor.

### 5. Theme system
Brand identity: emerald (#10B981) + violet AI (#8B5CF6) + gold sparkle (#F59E0B). Card/Badge/StatCard reusable components.

## Database Schema

25+ models chính:

```
User (4 roles) ─── Address (1-N)
              └── Order ─── OrderItem ─── Product ─── Category
              └── CartItem ─┘                └── Promotion
              └── Notification              └── ImportReceipt ─── ReceiptItem
              └── ActivityLog               └── StockMovement

AIProvider ─── AITaskConfig ─── AILog
SystemSetting (key-value config)
```

## Đóng góp

Đồ án thực hiện bởi: **H-thanh0603** (HCMUAF, 2026)

## License

MIT License - dùng tự do cho mục đích học tập.

## Liên hệ

GitHub: [@H-thanh0603](https://github.com/H-thanh0603)
