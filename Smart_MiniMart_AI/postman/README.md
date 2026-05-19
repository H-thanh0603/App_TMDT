# Postman Collection - Smart MiniMart AI

Bộ test end-to-end cho REST API của đồ án.

## Files

| File | Mục đích |
|------|----------|
| `Smart_MiniMart_AI.postman_collection.json` | Collection chính (44 requests, 6 modules) |
| `Smart_MiniMart_Local.postman_environment.json` | Environment cho local dev |

## Cách import vào Postman

1. Mở Postman → **Import** → kéo thả 2 file `.json` ở trên
2. Bên góc trên-phải, chọn environment **"Smart MiniMart - Local Dev"**
3. Đảm bảo backend đang chạy ở `http://localhost:4000/api/v1`

## Quy trình test (theo thứ tự)

### Bước 1 - Login lấy token
Chạy lần lượt 4 requests trong **`01. Auth`**:
- `Login - Customer` → tự động lưu `customerToken`
- `Login - Admin` → tự động lưu `adminToken`
- `Login - Staff` → tự động lưu `staffToken`
- `Login - AI Manager` → tự động lưu `aiToken`

### Bước 2 - Lấy categoryId/productId
Chạy trong **`02. Products & Categories`**:
- `List categories` → tự động lưu `categoryId` (dùng category đầu tiên)
- `Featured products` → xem danh sách
- `Get product by ID` → tự động lưu `productId`

### Bước 3 - Test customer flow
Trong **`03. Cart & Orders`**:
1. `Add item to cart` (dùng `productId` đã lưu)
2. `Get cart` → kiểm tra
3. `Apply promo code` (WELCOME10)
4. `Checkout - place order` → tự động lưu `orderId`
5. `My orders` + `Order detail`

### Bước 4 - Test admin/staff flow
- **`04. Inventory & Receipts`**: kiểm tra cảnh báo hết hạn, gợi ý nhập, OCR scan
- **`05. Promotions & Reviews`**: tạo KM, đánh giá sản phẩm

### Bước 5 - Test AI
- **`06. AI Gateway & AI Manager`**: AI Search, Chat, xem logs, đổi provider

## Demo accounts (mật khẩu `123456`)

| Email | Role | Mục đích |
|-------|------|----------|
| `customer@minimart.vn` | CUSTOMER | Khách thường |
| `vip@minimart.vn` | CUSTOMER | Khách VIP, có 5,000 điểm |
| `staff@minimart.vn` | STAFF | Xử lý đơn, OCR phiếu nhập |
| `admin@minimart.vn` | ADMIN | Dashboard + quản lý |
| `ai@minimart.vn` | AI_MANAGER | AI Control Center |

## Variables tự động lưu

Collection có pre-script/test-script tự động set các biến này khi chạy đúng thứ tự:

- `customerToken`, `adminToken`, `staffToken`, `aiToken`
- `customerId`, `productId`, `categoryId`, `orderId`, `receiptId`

Anh không phải copy-paste token thủ công.

## Run all tests bằng Newman (CLI)

```bash
npm install -g newman
cd D:\App_TMDT\Smart_MiniMart_AI\postman

newman run Smart_MiniMart_AI.postman_collection.json \
  -e Smart_MiniMart_Local.postman_environment.json \
  --reporters cli,html \
  --reporter-html-export report.html
```

## Lưu ý

- Một số endpoint (OCR scan, AI search/chat) cần backend kết nối được tới OCR service và DeepSeek API. Nếu chưa có, response sẽ trả về dữ liệu mock.
- Endpoint `Create product`, `Update product`, `Create promotion` yêu cầu `adminToken`.
- `OCR scan receipt` và `Confirm receipt` yêu cầu `staffToken` hoặc `adminToken`.
