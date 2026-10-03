# Security Deep Dive — Smart MiniMart AI (read-only review)

> Prompt 9: rà abuse-logic mà checklist 180 câu chưa phủ. KHÔNG sửa code ở đây.
> Mỗi mục: severity + file:line + kịch bản khai thác + fix đề xuất.
> Ngày rà: 2026-10-04 (trên main, sau 8 đợt fix).

## Đã tốt (không cần đụng)

- **Checkout race**: cart `FOR UPDATE` lock + đọc lại items dưới lock (`orders.service.ts` SEC-004) +
  conditional stock decrement (`stock >= qty`, SEC-003) + promo `usageCount` nguyên tử (SEC-015).
- **Retry-after-timeout**: `Idempotency-Key` header + replay 24h + race P2002 trả đơn thắng.
- **Refresh reuse**: phát hiện reuse → revoke mọi phiên (`auth.service.ts:342`).
- **VNPay**: verify chữ ký + idempotent IPN; VietQR confirm chống double (`paymentConfirmation` unique).
- **IDOR cơ bản**: order/address/notification đều check ownership; e2e `idor.e2e-spec.ts` 4 case.
- **Import receipt**: `updateMany ... status != CONFIRMED` chống double-confirm (SEC-019).
- **MFA**: ticket JWT ngắn hạn aud riêng, không brute-force TOTP trần (WIP của chủ, SEC-MFA-1).

## Phát hiện

### HIGH

**H1. Voucher không giới hạn theo user — 1 tài khoản vét hết lượt toàn sàn.**
- File: `prisma/schema.prisma` model `Promotion` — chỉ có `usageLimit`/`usageCount` toàn cục,
  không có per-user limit, không có bảng `promotion_redemptions`.
- Khai thác: user tạo N tài khoản (register không CAPTCHA) hoặc đơn giản là checkout nhanh
  N lần trước khi `usageLimit` cạn — `resolvePromotion` (`orders.service.ts:458`) chỉ check
  `usageCount >= usageLimit`, không check user đã dùng bao lần.
- Fix: thêm `perUserLimit Int?` + bảng `promotion_redemptions(userId, promotionId, orderId)`
  unique(userId, promotionId); check + insert trong cùng transaction createOrder.

**H2. Cart stock check là TOCTOU — addItem/updateItem không lock.**
- File: `cart.service.ts:48-77` — đọc `product.stock` rồi upsert cartItem, không transaction/lock.
- Khai thác: 2 tab cùng add qty = stock → cả 2 lọt; checkout sau mới chặn (UX xấu nhưng
  không oversell nhờ SEC-003 ở orders). Severity HIGH về UX/abuse (giữ hàng ảo), không phải
  mất tiền.
- Fix: không cần lock ở cart (UX) — nhưng `updateItem` nên cộng dồn check
  `existing.quantity + dto.quantity <= stock` thay vì chỉ check `dto.quantity`
  (hiện update set tuyệt đối nên đỡ hơn add; add dùng increment → dễ vượt nhất).

**H3. `resolvePromotion` chạy trong transaction nhưng chỉ để đọc.**
- File: `orders.service.ts` — `runInTransaction` bọc `findFirst` promotion (read-only),
  giữ connection pool không cần thiết dưới tải checkout cao.
- Fix: đọc ngoài transaction; chỉ phần `UPDATE usageCount` nguyên tử giữ trong tx chính
  (đã đúng ở dòng 202).

### MEDIUM

**M1. IDOR matrix thiếu 4 route nhạy cảm.**
- E2E hiện tại (`idor.e2e-spec.ts`, 4 case) chỉ phủ: đọc đơn, dùng địa chỉ, xóa địa chỉ, no-token.
- Chưa phủ:
  - `PATCH /users/:id` + `DELETE /users/:id/anonymize` + `POST /users/:id/loyalty`
    (có RolesGuard STORE_ADMIN — đúng, nhưng chưa có e2e chứng minh staff thường bị chặn).
  - `POST /import-receipts/:id/confirm` (STAFF+ADMIN — đúng role nhưng confirm phiếu của
    ca khác không có ownership check; chấp nhận được ở single-tenant, cần e2e).
  - `POST /payments/vietqr/:orderId/confirm` — STAFF confirm đơn bất kỳ (đúng nghiệp vụ,
    nhưng chưa e2e).
  - `GET /audit-logs` mới (STORE_ADMIN — cần e2e STAFF bị 403).
- Fix: thêm 4 case e2e (staff đoán admin route → 403).

**M2. MFA verify chưa đếm attempt riêng (MFA_MAX_ATTEMPTS khai báo nhưng chưa dùng).**
- File: `auth.service.ts:40` — `MFA_MAX_ATTEMPTS = 5` declared-never-read (tsc noUnusedLocals
  đã flag). `loginMfa` dựa vào lockout chung của password — nhưng ticket sống 5 phút,
  attacker có ~thousands request/5phút dò TOTP 6 số (1M không gian) nếu không rate-limit riêng.
- Giảm nhẹ hiện tại: global `UserThrottlerGuard` 100 req/phút → ~500 attempt/ticket.
  Vẫn nên đếm fail theo ticket (thất bại 5 lần → revoke ticket).
- Fix (việc của chủ, đang WIP MFA): đếm fail vào `failedLoginAttempts` hoặc cache theo ticket.

**M3. Broadcast không giới hạn số người nhận.**
- File: `notifications.service.ts: broadcast` — `createMany` toàn bộ ACTIVE users 1 lần,
  không batch, không confirm count trước khi gửi.
- Khai thác: admin bấm nhầm "all users" → spam toàn bộ; không undo.
- Fix: trả `count` preview trước khi gửi (2 bước), batch 500/lần.

### LOW

**L1. `GET /products/:idOrSlug` public — enumeration slug.**
- Chấp nhận được (catalog công khai). Không fix.

**L2. Error message lộ trạng thái tồn tại (user enumeration qua register/login timing).**
- `register` trả 409 "Email đã tồn tại" → attacker enumerate email. Chấp nhận được ở
  minimart VN (UX quan trọng hơn), ghi nhận không fix. Nếu cần: trả message chung +
  gửi mail "tài khoản đã tồn tại".

**L3. `X-Request-Id` client-controlled (tin proxy).**
- `main.ts` giữ id do proxy sinh (slice 64). Attacker có thể gửi requestId trùng để
  làm nhiễu trace log. Chấp nhận được (log nội bộ), không fix.

## Không làm trong đợt này (ghi nhận)

- Repository refactor toàn bộ (Prompt 8 đã liệt kê): 15/17 module truy cập Prisma trực tiếp.
  Với 1 dev + single-tenant, giữ nguyên; chỉ tách khi ≥3 người chạm cùng module.
- `noUnusedLocals` global: 8 hit còn lại nằm trong WIP của chủ (auth MFA, ai-gateway,
  payments.controller `cfg`) — bật sau khi chủ xong MFA.
- ai-gateway 17 `any`: module AI đang ổn định, đụng vào rủi ro cao lợi ích thấp.
