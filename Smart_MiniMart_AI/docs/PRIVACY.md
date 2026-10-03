# Chính sách bảo mật (Privacy Policy) — Smart MiniMart AI

> Khớp với dữ liệu code THU THẬP THẬT. Chủ shop điền phần liên hệ + thời gian lưu trước khi public.

## 1. Dữ liệu thu thập
- Tài khoản: email, số điện thoại, họ tên, ảnh đại diện (nếu bạn nhập).
- Giao hàng: người nhận, SĐT, địa chỉ (xã/phường, quận, tỉnh).
- Đơn hàng: giỏ, địa chỉ, mã khuyến mãi, trạng thái thanh toán (COD/VietQR/VNPay — KHÔNG lưu số thẻ).
- Kỹ thuật: IP, user-agent (chống gian lận phiên đăng nhập), log lỗi (đã rút gọn, không lưu mật khẩu/token thô).
- AI/OCR: nội dung chat tìm kiếm, ảnh phiếu nhập (staff) — log AI chỉ giữ 200 ký tự đầu.

## 2. Mục đích
Xử lý đơn, giao hàng, chăm sóc khách, chống gian lận, cải thiện gợi ý AI.

## 3. Chia sẻ cho ai (subprocessors)
- DeepSeek/OpenAI/Anthropic/Gemini (tùy cấu hình AI của shop) — nội dung chat/tìm kiếm.
- VNPay — thông tin thanh toán khi bạn chọn VNPay.
- Neon (Postgres, Singapore) + Render (hosting API, Singapore) — lưu trữ/vận hành.
- Không bán dữ liệu.
- Chi tiết đầy đủ (dữ liệu đi qua, khu vực, cách tắt): xem `docs/SUBPROCESSORS.md`.

## 4. Lưu trữ & xóa
- Lưu khi tài khoản còn hoạt động. Vô hiệu hóa tài khoản: liên hệ shop để xóa/anonymize
  (email/phone/tên → ẩn danh, đơn giữ lại dạng thống kê không định danh).
- Sao lưu DB: Neon backup/PITR, truy cập giới hạn admin hạ tầng.

## 5. Quyền của bạn
Xem/sửa hồ sơ trong app; tự xuất dữ liệu (`GET /users/me/export`) và tự xóa tài khoản
(`DELETE /users/me` — ẩn danh PII, thu hồi mọi phiên) ngay trong app. Yêu cầu khác qua
<-- ĐIỀN email/SĐT shop -->.

## 5b. Cookie / consent (Q61)
Không dùng cookie quảng cáo hay tracker bên thứ ba; token phiên lưu trong SecureStore của
thiết bị (không phải cookie trình duyệt). Ứng dụng **single-locale tiếng Việt, phục vụ VN** →
chưa cần consent banner. Nếu sau này thêm analytics/quảng cáo hoặc người dùng EU, phải thêm
banner opt-in trước khi bật.

## 6. Trẻ em
Dịch vụ không dành cho trẻ dưới 16 tuổi; không cố ý thu thập dữ liệu trẻ em.
