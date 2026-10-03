# Budget & Alert — Smart MiniMart AI

> Q143/Q150: ngưỡng cảnh báo + hạn mức free-tier. Chủ shop điền người nhận + bật alert
> trước launch. Tất cả đều dựa trên gói free (Neon/Render) — vượt là tốn tiền hoặc downtime.

## 1. Hạn mức free tier hiện dùng
| Dịch vụ | Giới hạn free | Vượt thì sao |
|---|---|---|
| Render (API + OCR) | service sleep khi idle ~15 phút; 750h/tháng | cold start chậm (~30–60s), không tính tiền nhưng trải nghiệm xấu |
| Neon Postgres | 0.5 GB storage + compute-hours/tháng | compute bị suspend → API lỗi kết nối DB |
| DeepSeek / provider AI | pay-per-token | vượt quota trong DB (`AIUsageLimit`) → rơi về mock nếu `AI_FALLBACK_PROVIDER=mock` |

## 2. Ngưỡng cảnh báo (bật trước launch)
- **Error-rate 5xx > 1% trong 5 phút** → Sentry alert (project Settings → Alerts) + kênh shop.
- **`/health/ready` fail 3 lần liên tiếp** → UptimeRobot alert (người nhận: <-- ĐIỀN -->).
- **Neon storage > 80%** hoặc **compute-hours > 80%** → Neon dashboard email alert.
- **DeepSeek chi phí/ngày > ngân sách shop** → xem `costUsd` tích lũy trong `ai-manager`
  (`AILog.costUsd`), đặt `AIUsageLimit.dailyRequestLimit` làm trần cứng.
- **Render build/deploy fail** → email Render mặc định.

## 3. Cách kiểm nhanh (không cần dashboard trả phí)
- p95/error latency: tìm log `"event":"http_request"` trong Render → lọc `status>=500` hoặc sort `durationMs`.
- AI chi phí: `GET /api/v1/ai-manager/overview` (AI_MANAGER) → `errorRate`, `last24h`.
- Neon size: Neon dashboard → Project → Storage.

## 4. Chống alert storm
- Sentry issue grouping mặc định (gộp theo fingerprint), `tracesSampleRate=0.1` prod.
- UptimeRobot: chỉ báo sau 3 fail liên tiếp, cooldown 10 phút.
- Không gắn alert vào từng request log (chỉ log, không page).

## 5. Người nhận (điền trước launch)
- Technical oncall: <-- ĐIỀN TÊN + SĐT/Telegram -->.
- Chủ shop (quyết định chi phí): <-- ĐIỀN -->.
