# Danh sách bên xử lý dữ liệu (Subprocessors) — Smart MiniMart AI

> Q67: liệt kê bên thứ ba nhận dữ liệu + khu vực lưu trữ. Chủ shop xác nhận từng mục
> và cập nhật khi thêm/bớt nhà cung cấp. Chỉ liệt kê thứ ĐANG có trong code/config.

| Nhà cung cấp | Vai trò | Dữ liệu đi qua | Khu vực | Có thể tắt? |
|---|---|---|---|---|
| Neon | Postgres managed | toàn bộ DB (User, Address, Order, AILog...) | Singapore | Không (DB chính) |
| Render | Hosting API + OCR | request/runtime + log app | Singapore | Không (hosting) |
| DeepSeek / OpenAI / Anthropic / Gemini | LLM (AI gateway) | nội dung chat/tìm kiếm đã sanitize (≤4000 ký tự) | theo provider (mặc định DeepSeek — TQ) | Có: `AI_DEFAULT_PROVIDER=mock` |
| VNPay | Cổng thanh toán | mã đơn, số tiền, IP khách (KHÔNG có số thẻ) | Việt Nam | Có: chỉ dùng COD/VietQR |
| placehold.co | Ảnh placeholder | không có PII; chỉ URL ảnh demo | toàn cầu | Có: ảnh local/seed |

## Ghi chú
- **Không bán dữ liệu** cho bên thứ ba.
- AI provider là **cấu hình được** (`AIProvider` trong DB, do AI_MANAGER đổi): khi đổi provider,
  dữ liệu chat đi qua provider mới → phải cập nhật bảng này.
- `AI_ENCRYPTION_KEY` mã hóa API key provider ở tầng ứng dụng (AES-256); key DB không rời Render.
- DPA/data-residency: chưa ký DPA chính thức với provider (dự án đồ án). Trước khi thu tiền thật,
  shop cần rà điều khoản từng provider + cân nhắc VNPay/DeepSeek residency.
- Liên hệ xử lý dữ liệu: <-- ĐIỀN email/SĐT shop -->.
