# Smart MiniMart AI — Rà soát bảo mật đợt 2 (22/09/2026)

Bối cảnh: đợt 1 (SEC-001…020) đã vá các lỗ hổng cơ bản. Đợt 2 kiểm tra sâu hơn
(đăng nhập/phiên, tiền bạc, AI/OCR, rate limit, dependencies, vận hành).

## Tóm tắt điều hành

| # | Vấn đề | Mức | Trạng thái |
|---|--------|-----|-----------|
| SEC-021 | Refresh token: không kiểm tra trạng thái, không phát hiện dùng lại, TTL DB hard-code | **Critical** | ✅ ĐÃ VÁ |
| SEC-022 | `GET /products` + `/categories` lộ hàng/danh mục ẩn cho khách ẩn danh | **High** | ✅ ĐÃ VÁ |
| SEC-023 | VietQR: client tự ý đổi STK/ngân hàng (payment redirection) | **High** | ✅ ĐÃ VÁ |
| SEC-024 | Admin tự hạ quyền/tự khoá; có thể khoá admin cuối | **High** | ✅ ĐÃ VÁ |
| SEC-025 | Hoàn tất đơn trả trước chưa thanh toán; huỷ đơn PAID không đánh dấu REFUNDED | **High** | ✅ ĐÃ VÁ |
| SEC-026 | Mật khẩu min 6, không chuẩn; DTO thiếu giới hạn số/URL | **Medium** | ✅ ĐÃ VÁ |
| SEC-027 | Broadcast không giới hạn fan-out; OCR scan không giới hạn tần suất | **Medium** | ✅ ĐÃ VÁ |
| SEC-028 | Khuyến mãi giảm >100%, khoảng thời gian ngược | **Medium** | ✅ ĐÃ VÁ |
| SEC-029 | Upload không chặn decompression bomb | **Medium** | ✅ ĐÃ VÁ |
| SEC-030 | AI usage-limit chỉ check `provider:<id>` → 1 user đốt hết credit shop | **High** | ✅ ĐÃ VÁ |
| SEC-031 | Không `trust proxy` → mọi user chung 1 bucket rate limit; IP audit sai | **High** | ✅ ĐÃ VÁ |
| SEC-OCR | OCR service không xác thực + SSRF `image_url` + lộ chi tiết lỗi | **Critical** | ✅ ĐÃ VÁ |
| DEP-001 | multer CVE (đã nâng 2.x), axios (đã nâng 1.13.2), gỡ uuid/passport-local | **Mixed** | ✅ ĐÃ VÁ runtime |
| OPS-001 | Compose hard-code mật khẩu + bind 0.0.0.0; render.yaml thiếu TRUST_PROXY/OCR key | **Medium** | ✅ ĐÃ VÁ |

## Chi tiết từng lỗi

### SEC-021 — Refresh token (Critical) — ĐÃ VÁ
`auth.service.refresh()` trước đây: (1) không kiểm tra `user.status` → tài khoản bị SUSPEND
vẫn refresh vô hạn; (2) replay token đã rotate chỉ báo lỗi, không thu hồi phiên; (3) rotate
bằng `update({where:{id}})` không nguyên tử → 2 request song song cùng thắng; (4) `expiresAt`
trong DB hard-code `+14 ngày`, bỏ qua `JWT_REFRESH_EXPIRES`.
Sửa (`auth.service.ts`): kiểm tra ACTIVE + `revokeAllSessions`, claim nguyên tử
`updateMany({id, revoked:false})`, TTL parse từ env (`common/utils/duration.ts`), lưu
`userAgent/ip`, dọn token hết hạn, thêm `POST /auth/logout-all`.
Test: `auth.service.spec.ts` (8 case mới), `duration.spec.ts` (3 case).

### SEC-022 — Lộ sản phẩm/danh mục đã ẩn (High) — ĐÃ VÁ
`GET /products` và `GET /categories` là `@Public()` nhưng đọc `includeInactive` trực tiếp
từ query → khách ẩn danh xem được hàng ngừng bán (kể cả chi tiết theo id/slug).
Sửa: `OptionalJwtAuthGuard` (xác thực mềm) + service chỉ tôn trọng `includeInactive` khi
`allowInactive` của STORE_ADMIN/STAFF.
Test: 4 case mới trong `products.service.spec.ts`.

### SEC-023 — VietQR payment redirection (High) — ĐÃ VÁ
`CreateVietQrDto` cho phép client gửi `bankBin/accountNo/accountName` và service dùng
nguyên xi → QR của đơn có thể trỏ về STK kẻ xấu; chuỗi không kiểm chứng được ghép vào URL
`img.vietqr.io` (nguy cơ injection tham số).
Sửa: chỉ STORE_ADMIN được override (controller truyền role), validate regex (service + DTO),

### SEC-026 — Validation mật khẩu & DTO (Medium) — ĐÃ VÁ
Mật khẩu min 6; bcrypt cắt âm thầm ở 72 byte; `phone`, `avatarUrl`, `imageUrls`, `comment`
và các trường VietQR không giới hạn. Sửa: chuẩn mật khẩu min 8 + chữ + số + max 72
(register + createStaff + mobile `RegisterScreen`), login max 72, regex phone/URL,
`imageUrls ≤ 5`, comment ≤ 2000, cart quantity ≤ 999, `AdjustStockDto ±1.000.000`,
`AdjustLoyaltyDto ±10.000`.

### SEC-027 — Fan-out & tần suất (Medium) — ĐÃ VÁ
Broadcast `targetUserIds` không giới hạn → `createMany` khổng lồ (DoS). Quét OCR không giới
hạn tần suất → đốt tiền LLM. Sửa: `ArrayMaxSize` cho broadcast; `@Throttle(30/phút)`
cho `POST /import-receipts/scan`, `POST /payments/vnpay|vietqr/*`.

### SEC-028 — Dữ liệu khuyến mãi vô lý (Medium) — ĐÃ VÁ
`discountValue > 100` cho loại PERCENT, `endDate <= startDate` vẫn lưu được.
Sửa: `assertValidPromotion()` trong `promotions.service.ts` (áp dụng cả create + update).

### SEC-029 — Decompression bomb (Medium) — ĐÃ VÁ
Upload chỉ kiểm tra magic bytes + dung lượng; ảnh vài chục KB có thể nở ra hàng trăm MP
khi decode. Sửa: `readImageDimensions()` + `assertImageDimensions()` (trần 40 MP) đọc
header JPEG/PNG/WEBP không cần thư viện ngoài, tích hợp vào `assertImageBuffer`.
Test: 4 case mới trong `upload.config.spec.ts`.

### SEC-030 — Hạn mức AI chỉ theo provider (High) — ĐÃ VÁ
`assertUsageAllowed` chỉ đọc scope `provider:<id>` và chỉ tăng counter cho provider →
không có trần global, không có trần per-user, fallback mock còn che mất lỗi vượt hạn mức.
Sửa (`ai-gateway.service.ts`): scopes `global / provider:<id> / user:<id>`, reset tháng,
tăng counter cho mọi scope liên quan, `AIQuotaExceededException` trả 429 và KHÔNG fallback.
Test: `ai-gateway.service.spec.ts` mới (6 case).

### SEC-031 — Thiếu trust proxy + rate limit theo IP (High) — ĐÃ VÁ
Sau Render, `req.ip` luôn là IP proxy → 100 req/phút chia cho toàn bộ user; `vnp_IpAddr`
và audit IP đều sai; `THROTTLE_*` trong `.env.example` chết.
Sửa: `buildTrustProxy()` (`main.ts`, mặc định 1 hop ở production), `JwtAuthGuard` toàn cục
(fail-closed + cung cấp `req.user` sớm), `UserThrottlerGuard` bucket theo user nếu đã login,
`app.module` đọc `THROTTLE_TTL/LIMIT` thật, `X-Request-Id` + `requestId` trong lỗi 500,
`render.yaml` thêm `TRUST_PROXY=1`.
Test: `buildTrustProxy` trong `main.spec.ts`.

### SEC-OCR — OCR service (Critical/High) — ĐÃ VÁ
FastAPI `POST /ocr/parse` mở hoàn toàn: bất kỳ ai cũng gọi được, `image_url` được fetch
trực tiếp (SSRF vào 169.254.169.254/metadata, mạng nội bộ), lỗi engine lộ `str(e)` ra ngoài,

### DEP-001 — Dependencies — ĐÃ VÁ (phần runtime, còn roadmap nâng major)
- `multer 1.4.5-lts` (8 CVE DoS/bypass, runtime) → `^2.0.2` (đang dùng 2.4.0): build + test xanh.
- `axios ^1.7.7` (SSRF/CSRF/DoS) → `^1.13.2` (backend đã 1.19.0; mobile đã sửa range, cần
  `npm install` lại trong `mobile/`).
- `uuid` (không ai import) + `passport-local` (không dùng) → gỡ khỏi backend.
- `npm audit fix` đã áp: tar/glob/tmp (dev), file-type, qs, brace-expansion…
- Còn lại (dev-only, không vào runtime): `tar` qua bcrypt build-script, `@nestjs/cli`
  toolchain, `js-yaml/lodash` qua swagger, `path-to-regexp` qua serve-static →
  triệt để bằng nâng cấp major NestJS 10 → 11/12 (xem roadmap).

### OPS-001 — Vận hành — ĐÃ VÁ
- `docker-compose.yml`: mật khẩu qua `.env` (`.env.compose.example` mới), bind `127.0.0.1`,
  pgAdmin vào profile `tools` (không chạy mặc định), OCR nhận `OCR_API_KEY`.
- `render.yaml` (+ bản sao `Smart_MiniMart_AI/render.yaml`): thêm `TRUST_PROXY=1`,
  `ENABLE_SWAGGER` (mặc định tắt ở production), `OCR_API_KEY` tự sinh;
  giữ cảnh báo khi `CORS_ORIGIN=*` ở production.
- `.env.example` (backend + ocr-service): bổ sung `TRUST_PROXY`, `OCR_API_KEY`
  và các giới hạn OCR.

## Bài toán tương lai (chưa làm — roadmap)

1. **Nâng cấp major**: NestJS 10 → 11/12, Prisma 5 → 6/7, `bcrypt` → `bcryptjs`/`argon2`
   (hết CVE build-time, hết `tar` critical), Expo SDK 54 → mới nhất.
2. **Xác thực mạnh hơn**: email/phone OTP, quên mật khẩu, 2FA cho admin, khóa tài khoản sau
   N lần login sai, refresh token bind thiết bị (rotation theo userAgent/IP).
3. **Rate limit đa instance**: Redis store cho Throttler (hiện tại in-memory → mỗi replica
   đếm riêng) + WAF/rate-limit ở edge (Cloudflare/Render).
4. **Thanh toán tự động**: đối soát VietQR qua webhook ngân hàng (hiện xác nhận thủ công —
   rủi ro nhầm lẫn), retry/idempotency cho VNPay IPN, cảnh báo chênh lệch số tiền.
5. **Dữ liệu**: thêm index (`orders.paymentRef`, `reviews(productId, createdAt)`), thay
   orderNumber `count()+1` bằng sequence (tránh retry dưới tải cao), chính sách xoá dữ liệu
   cá nhân (PDPA) + sao lưu Neon định kỳ.
6. **Khả năng quan sát**: log JSON tập trung, APM (Sentry), dashboard AI cost theo user,
   cảnh báo khi OCR/AI error-rate tăng, `/health` sâu hơn (migrations, disk).
7. **CI/CD**: GitHub Actions (lint + test + `npm audit` + pytest + build Docker),
   secret scanning (gitleaks), review checklist bảo mật cho PR mới.
8. **OCR/AI**: giới hạn số lần gọi AI theo vai trò, redact PII trong AILog, kiểm duyệt
   nội dung review/comment trước khi đưa vào prompt, sandbox PaddleOCR riêng.
9. **Mobile**: certificate pinning, jailbreak/root detection, ẩn log token ở release,
   `npm install` lại để nhận `axios` mới + kiểm tra `expo-secure-store`.
10. **Kiểm thử**: e2e (auth → cart → order → payment → webhook), test tải (k6) cho
    checkout/broadcast, fuzz DTO validation.

## Cách kiểm chứng nhanh sau khi deploy

```bash
cd Smart_MiniMart_AI/backend
npm test            # 18 suites / 134 tests
npm run build
npm audit           # chỉ còn lỗi dev-only, không còn lỗi runtime
cd ../ocr-service
python3 -m pytest tests -q   # 3 passed
```

`Image.open` không trần pixel, download không giới hạn, chạy container dưới root, port
publish 0.0.0.0, `reload=True`.
Sửa (`ocr-service/`): `X-OCR-Key` (fail-open có cảnh báo khi chưa đặt key, tương thích dev),
`security.py::is_public_http_url` (resolve DNS + chặn dải nội bộ, kiểm tra TRƯỚC chọn
engine), `max_length` cho request, lỗi 500 chung chung, `PaddleOCREngine` stream-download
trần 10 MB + `follow_redirects=False` + `MAX_IMAGE_PIXELS` + chạy trong thread, Dockerfile
non-root + HEALTHCHECK + `.dockerignore`, compose bind `127.0.0.1` + `OCR_API_KEY`,
backend gửi header key (`ocr-client.service.ts`).
Test: `ocr-service/tests/test_security.py` (3 case) — chạy `python3 -m pytest tests -q`.

fetch VietQR timeout 8s, chỉ nhận `data:image/*;base64`.
Test: 5 case mới trong `vietqr.service.spec.ts`.

### SEC-024 — Admin tự sát / khoá cửa hệ thống (High) — ĐÃ VÁ
`PATCH /users/:id` và `DELETE /users/:id` cho phép admin tự hạ quyền/tự SUSPEND và vô hiệu
hoá admin cuối → mất quyền quản trị.
Sửa: `updateStaff(id, dto, actorId)` / `deactivateUser(id, actorId)` + `assertNotLastAdmin`;
`createStaff` tự tạo giỏ hàng cho CUSTOMER.
Test: `users.service.spec.ts` mới (7 case).

### SEC-025 — Hoàn tất đơn chưa trả tiền (High) — ĐÃ VÁ
`updateStatus(COMPLETED)` không kiểm tra `paymentStatus` → đơn VNPay/BANK UNPAID vẫn được
ghi doanh thu + cộng điểm; huỷ đơn PAID không đánh dấu hoàn tiền.
Sửa (`orders.service.ts`): chặn COMPLETED khi UNPAID/FAILED (trừ COD); CANCELED + PAID
→ `paymentStatus = REFUNDED`.
Test: 3 case mới trong `orders.service.spec.ts`.
