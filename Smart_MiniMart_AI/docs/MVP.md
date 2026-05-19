# Smart MiniMart AI — Lộ trình MVP chi tiết

5 phase × ~1 tuần. Mỗi phase có **mục tiêu rõ ràng**, **task list**, **demo script** và **bằng chứng đã hoàn thành**.

---

## MVP 1 — Customer mua hàng + Admin quản lý cơ bản

**Thời lượng:** ~7 ngày  
**Mục tiêu:** Có app TMĐT chạy được end-to-end, khách hàng đặt được đơn, admin xem được đơn.

### Backend
- [x] Auth: register, login, refresh token, JWT
- [x] Categories CRUD (Admin), list (public)
- [x] Products CRUD (Admin), list/detail/featured (public)
- [x] Cart: add/update/remove/clear
- [x] Orders: create từ cart, list mine, detail, status transition
- [x] Roles guard + decorators

### Mobile
- [x] AuthNavigator (Login + Register)
- [x] Customer: Home, Category browse, ProductList, ProductDetail
- [x] Customer: Cart, Checkout (COD)
- [x] Customer: OrderHistory, Profile
- [x] Admin: Dashboard cơ bản, ProductsList, OrdersList

### Demo script (5 phút)
1. Login customer → browse categories → add 3 sản phẩm vào giỏ
2. Checkout COD → xem order trong "Đơn hàng của tôi"
3. Login admin → xem đơn vừa đặt trên Dashboard
4. Update trạng thái: PENDING → CONFIRMED → PREPARING

### Tiêu chí hoàn thành
- Customer hoàn tất luồng mua hàng không có bug chặn
- Admin thấy đơn realtime sau khi customer đặt
- Stock giảm đúng sau khi đặt đơn
- Roles không cho phép customer xem trang admin

---

## MVP 2 — Kho hàng + cảnh báo thông minh

**Thời lượng:** ~3 ngày  
**Mục tiêu:** Cửa hàng quản lý được tồn kho, biết được hàng nào sắp hết hạn / bán chậm / cần nhập.

### Backend
- [x] InventoryTransaction model + service
- [x] Endpoint `/inventory/expiring?days=30` — phân loại CRITICAL (≤7) / WARNING (8-15) / NOTICE (16-30)
- [x] Endpoint `/inventory/slow-moving` — turnover rate < 30% trong 30 ngày
- [x] Endpoint `/inventory/restock-suggestions` — dựa trên dailyRate × 14 ngày
- [x] Endpoint `/inventory/adjust` — điều chỉnh kho thủ công (audit log)

### Mobile
- [x] Admin Dashboard: KPI doanh thu hôm nay, đơn hôm nay, alerts
- [x] Admin Inventory: 3 tab Cận date / Bán chậm / Cần nhập
- [x] Staff Profile: 3 alert cards (critical/warning/slow)

### Demo script
1. Admin mở Inventory → thấy bánh LU bơ "8 ngày" → CRITICAL đỏ
2. Tab "Bán chậm" → cà phê Hồng Vịnh tồn 50, bán 0 → flagged
3. Tab "Cần nhập" → mì Hảo Hảo bán nhanh → suggest 50 đơn vị
4. Adjust stock thủ công → ghi nhận trong inventory_transactions

### Tiêu chí hoàn thành
- 3 logic phân loại chạy đúng với seed data
- UI hiển thị tier màu rõ ràng
- Inventory transactions có log đầy đủ (before/after qty)

---

## MVP 3 — AI Search + AI Assistant

**Thời lượng:** ~3 ngày  
**Mục tiêu:** Khách hàng tìm sản phẩm bằng ngôn ngữ tự nhiên + chat tư vấn mua hàng.

### Backend
- [x] AIGatewayService — điểm vào duy nhất cho mọi tác vụ AI
- [x] Provider abstraction: DeepSeek, OpenAI compatible, Mock
- [x] RuleSearchEngine — fallback regex Vietnamese
- [x] AISearchService — hybrid: LLM extract intent + DB filter
- [x] AIAssistantService — context-aware (top sản phẩm + promotions)
- [x] AILog — ghi mọi request, latency, tokens, cost
- [x] Auto fallback Mock nếu LLM lỗi/timeout

### Mobile
- [x] AISearchScreen với 5 suggestions có sẵn
- [x] Hiển thị explanation từ AI ("Tìm theo từ khóa: ăn sáng; giá ≤30k")
- [x] AIChatScreen — chat bubble UI, input multiline
- [x] Loading state khi AI đang suy nghĩ

### Demo script
1. AI Search "đồ ăn sáng dưới 30k" → trả 5-8 sản phẩm phù hợp
2. AI Search "nước uống ít đường" → filter tag low-sugar
3. AI Search "100k mua gì cho bữa tối" → combo gợi ý
4. AI Chat: "Mì gói ngon nhất hiện có?" → tư vấn cụ thể
5. Mở AI Manager → AI Logs → thấy 4 requests vừa rồi (provider, latency, tokens)

### Tiêu chí hoàn thành
- AI Search hoạt động cả khi có và không có DeepSeek key
- Fallback rule-based hoạt động khi LLM down
- Latency < 3s cho 90% request
- Logs ghi đủ thông tin debug

---

## MVP 4 — OCR phiếu nhập hàng

**Thời lượng:** ~5 ngày  
**Mục tiêu:** Staff quét phiếu nhập → hệ thống đọc → bảng sản phẩm có thể chỉnh sửa → xác nhận nhập kho.

### Backend (NestJS)
- [x] ImportReceipt model + items
- [x] OCRClientService — gọi Python OCR microservice qua HTTP
- [x] LLM Parser — chuyển raw OCR text thành JSON structured
- [x] `POST /import-receipts/scan` — orchestration: OCR → Parser → save draft
- [x] `PATCH /import-receipts/:id/items` — staff sửa
- [x] `POST /import-receipts/:id/confirm` — apply vào tồn kho

### OCR Service (Python FastAPI)
- [x] Engine abstraction (BaseOCREngine)
- [x] Mock engine (luôn có cho demo)
- [x] PaddleOCR engine (skeleton, bật khi pip install)
- [x] Receipt parser regex fallback (tiếng Việt)
- [x] Dockerfile

### Mobile
- [x] Staff: ImportReceiptsScreen — list phiếu
- [x] Staff: OCRScanScreen — chụp/upload/sample, chọn engine
- [x] Staff: ReceiptDetailScreen — bảng items có thể chỉnh sửa
- [x] Staff: Xác nhận nhập kho có warning khi confidence thấp

### Demo script
1. Staff bấm "Quét phiếu" → chọn ảnh mẫu 1 (mock OCR)
2. Hệ thống trích xuất 4 sản phẩm với confidence 88-95%
3. Staff sửa giá, số lượng nếu cần
4. Bấm "Xác nhận nhập kho" → tồn kho 4 sản phẩm tăng
5. Mở Inventory → xem inventory_transactions với refType=IMPORT_RECEIPT

### Tiêu chí hoàn thành
- Mock OCR luôn chạy được dù không có Python OCR
- Confidence < 0.7 → có warning rõ ràng
- Không tự động nhập kho — bắt buộc staff confirm
- Backend ghi log AI/OCR đầy đủ

---

## MVP 5 — AI Manager Control Center

**Thời lượng:** ~3 ngày  
**Mục tiêu:** AI Manager cấu hình toàn bộ hạ tầng AI/OCR mà không phải động vào code.

### Backend
- [x] AIProvider model + AES-256-GCM encryption cho API key
- [x] AITaskConfig — map task → primary/fallback provider+model
- [x] OCRSettings singleton — engine mặc định + threshold
- [x] AIPromptTemplate — quản lý prompt theo task
- [x] `/ai-manager/overview` — KPI + breakdown
- [x] CRUD providers, task configs, OCR settings
- [x] AILog filter + pagination

### Mobile (AI Manager only)
- [x] AIControlCenterScreen — overview KPI + task configs
- [x] AIProvidersScreen — list providers, status, masked API key
- [x] AILogsScreen — log với latency/tokens/cost/error
- [x] AIManagerProfileScreen — menu cài đặt nâng cao (stub)

### Demo script
1. AI Manager login → Control Center → thấy 8 tasks, 2 providers
2. Providers tab → System Default (DeepSeek) là DEFAULT, Mock cũng có
3. AI Manager bấm "Test connection" → thấy latency 200-500ms
4. Logs tab → xem 50 request gần nhất, lọc theo task
5. Customer mở AI Search lần nữa → log mới xuất hiện realtime

### Tiêu chí hoàn thành
- API key luôn encrypt trong DB, chỉ hiển thị mask `sk-***1234`
- Provider có thể bật/tắt mà không cần redeploy
- Logs có đủ context để debug khi LLM trả output sai

---

## Mở rộng (sau MVP)

| Tính năng | Mô tả |
| --- | --- |
| Vision Search | Khách upload ảnh → AI tìm sản phẩm tương tự |
| Dự báo nhu cầu | ML/heuristic dự báo theo tuần/tháng |
| Tóm tắt review | LLM tổng hợp top reviews thành 2-3 câu |
| Multi-store | 1 hệ thống nhiều cửa hàng, isolated stock |
| Xuất Excel/PDF | Báo cáo doanh thu, tồn kho |
| Push notification | Order update, hàng cận date sale, voucher |
| VNPay sandbox | Thanh toán thật qua VNPay test env |
| Web admin | Dashboard cho desktop, ngoài mobile |

---

## Kiến trúc bảo mật

- **API key**: encrypt AES-256-GCM tại backend, không bao giờ trả ra mobile
- **JWT**: access 15min + refresh 14d, refresh token rotation
- **Roles**: enforce ở guard layer, không tin client
- **Mobile**: lưu token bằng Expo SecureStore (Keychain/Keystore)
- **OCR**: ảnh phiếu nhập upload qua presigned URL, không lưu raw trong DB
- **Logs**: không log full payload (cắt 500 chars), không log API key

---

## Performance targets

| Metric | Target |
| --- | --- |
| API response time (p50) | < 200ms |
| API response time (p95) | < 800ms |
| AI Search end-to-end | < 3s |
| OCR (Mock) | < 200ms |
| OCR (PaddleOCR) | < 5s |
| Mobile app cold start | < 2s |
| List screen FPS | 60 fps |

---

## Demo deck checklist

1. ✅ App login với 4 role khác nhau (xem RoleShell auto-route)
2. ✅ Customer flow: AI Search VN → Add cart → Checkout → Order tracking
3. ✅ Staff flow: OCR scan → Review bảng → Confirm nhập kho
4. ✅ Admin: Dashboard KPI + 3 cảnh báo (cận date, bán chậm, cần nhập)
5. ✅ AI Manager: Control Center → Logs realtime
6. ✅ Fallback demo: tắt DeepSeek key → app vẫn chạy với Mock AI
