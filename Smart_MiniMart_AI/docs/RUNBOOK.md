# Pre-Launch Runbook — Smart MiniMart AI

## 1. Triển khai (Deploy)
- Prod: Render Blueprint từ `Smart_MiniMart_AI/render.yaml` (autoDeploy theo branch đã pin).
- Thứ tự: `prisma migrate deploy` (entrypoint) → `node dist/src/main.js`.
- Migration breaking (đổi cột/drop): làm 2 pha expand→contract, không deploy giờ cao điểm.
- Không chạy seed demo/crawl/purge trên prod (đã chặn bằng `NODE_ENV` guard).
  Chỉ seed base khi `RUN_SEED_ON_BOOT=true`.

## 2. Rollback (< 15 phút)
1. Render Dashboard → service `smart-minimart-api` → Rollback về deploy trước (image immutable theo commit SHA).
2. Nếu migration đã chạy và không tương thích ngược: `npx prisma migrate resolve --rolled-back <migration>` trên DB staging trước, rồi mới chạm prod. Không `migrate reset` trên prod.
3. Kill-switch nhanh không cần deploy:
   - Tắt Swagger: `ENABLE_SWAGGER=""` (mặc định đã tắt).
   - Tắt AI thật: `AI_FALLBACK_PROVIDER=mock` (đã mặc định) + `AI_DEFAULT_PROVIDER=mock`.
   - Tắt OCR thật: `OCR_DEFAULT_ENGINE=mock`.
4. Xác nhận: `GET /api/v1/health/ready` → `{"status":"ready"}` và smoke `scripts/smoke_api.sh`.

## 3. Backup / Restore (Neon)
- Bật: Neon → Project → Backups/PITR (Point-in-Time Recovery) cho branch prod.
- RPO mục tiêu: ≤ 24h (daily backup) — nâng lên PITR nếu nhận tiền thật.
- RTO mục tiêu: ≤ 1h (restore + redeploy + smoke).
- Test restore mỗi tháng: restore sang branch Neon mới → trỏ staging → chạy smoke.
- Người điền: `DATABASE_URL` prod + ai giữ Neon console (ghi vào Q177/Q178).

## 4b. Observability tối thiểu (Q139–Q143)
- Lỗi prod: Sentry (`SENTRY_DSN`) + scrub PII (email/Bearer/secret) trong `main.ts`.
- Log: Nest Logger + `X-Request-Id` mọi response; không log email/URL/prompt thô.
- Metrics: `/health/live` (liveness) + `/health/ready` (readiness, check DB) — Render
  healthCheck trỏ `/api/v1/health/ready`.
- Uptime check: thêm UptimeRobot cron 5 phút vào `GET /api/v1/health/ready` + 1 API
  crit (`GET /api/v1/products?limit=1`). Người nhận alert: <-- ĐIỀN -->.
- Alert storm: Sentry issue grouping mặc định + rate 0.1 trace prod; uptime check
  chỉ báo sau 3 fail liên tiếp.

## 4. Incident (1 trang)
- Oncall: <-- ĐIỀN TÊN + SĐT --> (Q177).
- Kênh: <-- ĐIỀN Telegram/FB/Zalo group -->.
- Khi nào rollback: error-rate > 5% 5 phút, `/health/ready` fail 3 lần liên tiếp, thanh toán sai tiền.
- VNPay (Q155): `VNPAY_URL` sandbox mặc định. Khi thu tiền thật: đổi sang
  `https://www.vnpayment.vn/paymentv2/vpcpay.html` + điền `VNPAY_TMN_CODE`/`VNPAY_HASH_SECRET`
  prod trong Render Dashboard, test 1 giao dịch nhỏ, rồi mới công bố.
- Khi nào notify user: downtime > 15 phút, đơn/thanh toán ảnh hưởng → banner + kênh status (Q147).
- Sau sự cố: ghi postmortem 5 dòng (giờ, ảnh hưởng, nguyên nhân, fix, phòng ngừa).

## 4c. Giấy phép bên thứ ba (Q152)
- Backend: rà `package-lock.json` — MIT/Apache/ISC/BSD, **0 package GPL/AGPL** (kiểm 2026-09-23).
  Chạy lại trước release lớn: `node -e "..."` đếm license trong lockfile.
- Ảnh seed: Wikimedia Commons (ghi trong `download-product-images.ts`) + placeholder tự sinh;
  ảnh demo còn lại ghi nguồn khi thay bằng ảnh thật của shop (Q153).

## 4d. Định nghĩa launch thành công (Q162) + hỗ trợ (Q157)
- Kênh hỗ trợ: `GET /api/v1/settings/public` → `info` (SĐT/email/giờ mở cửa, sửa trong
  Admin Settings, không hard-code). Ngày launch: người trực <-- ĐIỀN --> theo ca.
- Launch đạt khi 7 ngày đầu: uptime `/health/ready` ≥ 99%, error-rate 5xx < 1%,
  ≥ 80% đơn thanh toán đúng luồng (không sai tiền), 0 BLOCKER mới, backup restore test đạt.

## 5. Checklist trước mỗi deploy prod
- [ ] `CORS_ORIGIN` = domain thật (không `*`) — boot fail-closed nếu sai.
- [ ] `ENABLE_SWAGGER` trống (tắt).
- [ ] `OCR_API_KEY` đã đặt cả backend + ocr-service (prod từ chối boot nếu thiếu).
- [ ] VNPay: đúng bộ prod/sandbox theo quyết định thu tiền (Q155).
- [ ] `RUN_SEED_ON_BOOT` tắt trừ lần seed đầu.
- [ ] Smoke: `bash scripts/smoke_api.sh <API_URL>` xanh.
