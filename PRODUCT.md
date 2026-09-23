# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

- Khách hàng (CUSTOMER): mua sắm tạp hóa trên mobile — xem deal, tìm kiếm (AI search/chat), đặt hàng, thanh toán COD/VNPay/VietQR, theo dõi đơn.
- Nhân viên cửa hàng (STAFF): xử lý đơn, nhập hàng (OCR quét hóa đơn), quản lý phiếu nhập.
- Quản trị cửa hàng (STORE_ADMIN): dashboard, sản phẩm, kho, đơn, người dùng, khuyến mãi, báo cáo, broadcast.
- AI manager (AI_MANAGER): cấu hình AI provider, quota, xem log AI.

## Product Purpose

App thương mại điện tử minimart "Smart MiniMart AI": bán lẻ tạp hóa + trợ lý AI (tìm kiếm/chat tư vấn sản phẩm). Thành công = khách đặt hàng trơn tru end-to-end (home → catalog → cart → checkout → đơn), vận hành xử lý được đơn/nhập hàng, AI hỗ trợ đúng giá/tồn kho.

## Positioning

Minimart kết hợp AI concierge: AI search/chat hiểu nhu cầu ("đồ ăn sáng dưới 30k") và dẫn thẳng vào catalog có sẵn, thay vì chatbot trang trí.

## Operating Context

- Mobile-first (Expo RN, iOS + Android qua EAS, bundleId `vn.minimart.smartai`); web chỉ để dev.
- Single-tenant, single locale tiếng Việt, timezone hiển thị Asia/Ho_Chi_Minh, tiền tệ VND.
- Backend NestJS + Postgres (Neon), OCR FastAPI riêng, deploy Render free tier.
- 4 role đi qua `RoleShell` → navigator riêng; token trong SecureStore.

## Capabilities and Constraints

- Catalog phân trang 24 sp/trang, grid 2 cột; filter sale/bán chạy/mới nhất/khoảng giá/tồn kho; sort 5 kiểu — giữ nguyên API và param query.
- Thanh toán: COD, VNPay (sandbox hiện tại), VietQR confirm tay. Không đổi luồng thanh toán trong đợt redesign.
- AI: DeepSeek (fallback mock), throttle 15/phút + quota; LLM chỉ diễn giải, giá tính bằng code.
- Ràng buộc đợt redesign (user xác nhận): giữ layout/flow/copy tiếng Việt hiện tại; không thêm CMS banner, favorites model, dep mới ngoài thứ Expo đã có; không đụng logo/assets splash-icon.

## Brand Commitments

- Tên "Smart MiniMart AI" + logo/assets hiện tại giữ nguyên (không redesign brand).
- Hướng visual đã chốt: chợ hiện đại kiểu Shopee/Grab — cam/đỏ ấm, banner deal lớn, giá nổi bật. Emerald `#10B981` chỉ còn trong logo/assets.

## Evidence on Hand

- Code mobile: `Smart_MiniMart_AI/mobile/src` (37 screens, 5 navigator, theme light/dark sẵn).
- Spec cũ: `docs/superpowers/specs/2026-08-09-home-discovery-design.md`, `2026-08-09-real-product-catalog-design.md`.
- Audit pre-launch: `AUDIT_REPORT.md` (không đổi logic, chỉ UI).

## Product Principles

- Deal trước, trang trí sau: giá/khuyến mãi luôn là thứ đập vào mắt đầu tiên.
- Cùng một tay: mọi thao tác mua hàng xong trong vài tap, nút chính luôn trong tầm ngón cái.
- AI là đường tắt vào catalog, không phải ngõ cụt: mọi gợi ý AI đều mở được sản phẩm thật.
- Vận hành không đoán: trạng thái đơn/kho/AI luôn hiển thị rõ, không icon mập mờ.

## Accessibility & Inclusion

Chưa có yêu cầu đặc biệt được xác nhận. Giữ ngưỡng: icon có label đọc được, tương phản chữ/giá đạt AA, tôn trọng reduce-motion của hệ điều hành.
