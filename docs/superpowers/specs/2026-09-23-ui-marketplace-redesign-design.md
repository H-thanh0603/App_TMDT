# UI Marketplace Redesign — Spec

## Goal

Đưa app mobile Smart MiniMart AI từ giao diện demo (Emerald + emoji icon rời rạc, dark mode nửa vời) sang world chợ hiện đại kiểu Shopee/Grab: cam/đỏ ấm làm chủ đạo, banner deal lớn, giá nổi bật — trên toàn bộ 37 screens, 1 đợt. Giữ nguyên layout/flow/copy tiếng Việt, API, navigation, logic thanh toán/AI. Giữ logo + tên + assets splash/icon.

## Phạm vi

- 37 screens: customer 11, admin 11, staff 5, ai-manager 5, auth 3, Notifications 1, VietQrConfirmationModal.
- 5 navigator: Customer, Admin, Staff, AIManager, Auth + RoleShell (không đổi logic).
- Component kit: Button, Card, Badge, ProductCard, Skeleton, EmptyState, ErrorState, StatCard, ThemeToggle, VietQrConfirmationModal, Animated.
- Theme: `src/theme/colors.ts` (+ dark), `typography.ts` (giữ nguyên scale, chỉ thêm weight extrabold khi cần).
- Không đụng: `mobile/assets/*`, backend, OCR, API contract, copy tiếng Việt, luồng COD/VNPay/VietQR, AI gateway.

## World B — chợ hiện đại

- THESIS: giá và deal đập vào mắt đầu tiên; mọi màn hình customer đều có điểm cam nóng (giá/badge/CTA), nền trung tính sáng, Violet chỉ cho AI, Gold chỉ cho VIP/deal.
- OWN-WORLD: header cam gradient (#EE4D2D → #D73211), giá cam đậm 800, badge SALE đỏ nền trắng chữ, card trắng bo 12–16, nút chính cam full-width bo 14, icon vector 1 màu.
- STORY: khách mở app thấy deal → tap vào catalog thật; nhân viên/admin thấy trạng thái rõ qua màu role, không đoán icon.
- Rủi ro: cam/đỏ dễ chói nếu lạm dụng — chỉ dùng cho giá/CTA/badge, nền vẫn neutral.

## 1. Palette token (ghi đè light/dark, giữ shape ThemeColors)

Light:
- primary `#EE4D2D`, primaryDark `#D73211`, primaryLight `#FF6B4A`, primarySoft `#FEE4D9`
- success giữ `#16A34A` (tách khỏi primary; trước đây trùng Emerald gây nhầm CTA vs trạng thái)
- warning `#F59E0B`, danger `#EF4444`, info `#3B82F6` giữ
- ai Violet `#8B5CF6` series giữ, gold `#F59E0B` series giữ
- bg `#FFF8F4`, bgAlt `#FEEFE8`, bgSecondary `#F5F1EC`, card/surface `#FFFFFF`, border `#F0D9CE`, divider `#F0D9CE`
- text `#1F1B16`, textSecondary `#57534E`, textMuted `#A8A29E`, textTertiary `#A8A29E`
- roleCustomer = primary mới `#EE4D2D`; roleStaff `#1677FF`; roleAdmin `#8B5CF6`; roleAiManager `#F59E0B`
- accent = primary `#EE4D2D`

Dark:
- primary `#FF6B4A`, primaryDark `#EE4D2D`, primaryLight `#FF8A66`, primarySoft `#431407`
- success `#22C55E`, bg `#140F0C`, bgAlt `#1F1712`, bgSecondary `#1F1712`, card/surface `#241A14`, border `#3F2D22`
- text `#FFF7ED`, textSecondary `#E7D5C5`, textMuted `#A8A29E`, textTertiary `#78716C`
- role colors sáng tương ứng; ai/gold/danger/info bản dark hiện có giữ.

Xóa export `colors` tĩnh tương thích cũ (`import { colors } from '@/theme/colors'`); mọi file dùng `useTheme()`. Xóa `CAT_COLORS` pastel trong HomeScreen, thay bằng soft token theo index (primarySoft/aiSoft/goldSoft + dangerSoft).

## 2. Icon system — @expo/vector-icons

- Thêm `@expo/vector-icons` (dep chính chủ Expo, tương thích SDK 54, không lib ngoài).
- Tạo `src/components/AppIcon.tsx`: wrapper `MaterialCommunityIcons` + map tên ngữ nghĩa (`home, search, robot, cart, user, bell, pin, tag, truck, wallet, qr, camera, box, chart, users, cog, logout, chevron-right, plus, minus, close, check, alert, gift, flash, clock`) → glyph cụ thể. Mọi screen/navigator chỉ dùng AppIcon, cấm emoji làm icon điều hướng/trạng thái/CTA.
- Emoji trong data (tên SP, placeholder ProductCard, EmptyState `icon` string) giữ nguyên — đó là nội dung, không phải icon UI.
- Tab bar 4 navigator: icon vector qua AppIcon, activeTint giữ token role hiện tại (customer giờ là cam).
- Stack header: customer `headerStyle primary` gradient không làm được bằng RN header → dùng background primaryDark `#D73211` phẳng; admin/staff/AI giữ màu role.

## 3. Component kit (chuẩn hoá, không đổi props public trừ EmptyState.icon mở rộng)

- Button: giữ props; bo 14; primary nền phẳng `primary` (RN không dùng lib gradient), pressed opacity .85, giữ spring scale; thêm `size lg` full-width mặc định cho CTA checkout.
- Card: giữ 3 variant; elevated dùng shadow.md + border 1px borderLight (dark mode vẫn nổi).
- Badge: giữ 7 variant; success fg dùng successDark mới; thêm dot/badge đếm cho bell (dùng trong header Home).
- ProductCard: giá cam 800 size base; badge SALE (`-x%`, tính từ price/salePrice, không hardcode chữ SALE); ảnh bo 8, skeleton khi load; giữ 2 variant grid/list + props.
- Skeleton: màu token skeleton mới; ProductGridSkeleton khớp card mới (ảnh 1:1 + 3 dòng).
- EmptyState/ErrorState: iconCircle dùng primarySoft/aiSoft/goldSoft theo prop `tone` mới (`primary|ai|gold`, default primary); icon chấp nhận string emoji (data) hoặc ReactNode (AppIcon).
- StatCard (admin dashboard): số lớn 800 màu role, delta xanh/đỏ, sparkline giữ nguyên nếu có.
- ThemeToggle: giữ logic, icon sun/moon qua AppIcon.

## 4. Home rebuild (trọng tâm)

Giữ data hooks hiện có (categories, sale/bestSelling/newest, promos, notif). Đổi bố cục:
- Header: nền primaryDark phẳng, greeting trắng, bell AppIcon + badge đếm, VIP badge Gold giữ.
- Search bar nổi (marginTop -16) giữ, icon AI Violet, nút mũi tên cam.
- Promo: từ 1 banner tĩnh → carousel ngang paging full-width (data `promos` có sẵn; fallback 1 banner local khi rỗng). Mỗi slide: nền cam gradient mô phỏng (2 View chồng opacity), badge HOT/SALE, tên + mã + mức giảm, nút "Lấy ngay" mở ProductList khuyến mãi. Không CMS mới.
- Flash-sale strip mới: dùng `saleQ` có sẵn, header "⚡ Flash sale" + countdown tĩnh đến 23:59 hôm nay (Asia/Ho_Chi_Minh, tính bằng code, không lib), horizontal scroll ProductCard mini.
- Category: từ scroll 1 hàng → grid 2 hàng 4 cột kiểu chợ (icon AppIcon map theo tên + nền soft xoay vòng, không emoji).
- Bỏ dải "Mua theo mức giá" QuickLink (trùng ProductList PRICE_PRESETS); thay bằng 1 hàng "Tiện ích": AI Chat / Giỏ hàng / Đơn hàng / Địa chỉ (AppIcon).
- Discovery sections giữ (Ưu đãi / Bán chạy / Mới về) + ProductCard mới.

## 5. Customer flows (giữ layout + logic, restyle)

- ProductList: search + chip category + sort + PRICE_PRESETS giữ; chip active cam; filter modal giữ; grid 2 cột ProductCard mới.
- ProductDetail: ảnh full-width, giá cam 24 800 + strike + badge -x%; stock badge success/danger; nút "Thêm giỏ" outline cam + "Mua ngay" primary cam (Mua ngay = add rồi navigate Cart, logic có sẵn trong handleAdd); review giữ.
- Cart: itemCard bo 12, qty stepper cam viền, nút X danger; bottomSheet giữ, payOption active cam; checkoutBtn primary cam full-width "Đặt hàng • {total}".
- VietQr + VietQrConfirmationModal: QR giữa, countdown/total cam, nút xác nhận Button kit.
- Orders/OrderDetail: status badge map (PENDING gold, CONFIRMED info, SHIPPING primary, DELIVERED success, CANCELLED danger); timeline giữ.
- Addresses/Profile/AIChat/AISearch/Notifications: restyle token + AppIcon, không đổi logic. AI giữ Violet identity (header AIChat Violet, không cam).

## 6. Admin / staff / AI-manager / auth (restyle token, không đụng logic)

- 23 file import `colors` tĩnh → `useTheme()` (list ở §8). Màu role ăn token mới tự động.
- AdminDashboard StatCard + chart giữ layout, số theo roleAdmin Violet.
- Staff OCRScan/ImportReceipts/ReceiptDetail: nút scan cam, trạng thái giữ.
- Auth (Login/Register/Forgot): header logo giữ, CTA cam, demo role chip giữ màu role, input border focus primary.
- Không thêm màn hình, không đổi guard/role.

## 7. Không làm (ghi rõ để khỏi scope-creep)

- Không CMS banner, favorites, CMS promotion mới; carousel đọc `promos` API có sẵn.
- Không đổi API/backend/navigation/route params/copy Việt.
- Không lib mới ngoài @expo/vector-icons (không linear-gradient, không carousel lib — tự làm bằng FlatList paging).
- Không redesign logo/assets; splash `#10B981` giữ (đổi khi rebrand riêng).
- Không thêm test mới; chỉ sửa type break nếu có.

## 8. File chạm (khóa)

- Sửa: `theme/colors.ts`; mới: `components/AppIcon.tsx`; sửa kit: Button, Card, Badge, ProductCard, Skeleton, EmptyState, ErrorState, StatCard, ThemeToggle.
- Navigators (icon + header): Customer, Admin, Staff, AIManager.
- Screens: Home (rebuild), ProductList, ProductDetail, Cart, VietQr, VietQrConfirmationModal, Orders, OrderDetail, Addresses, Profile, AIChat, AISearch, Notifications, auth 3, admin 11, staff 4 còn lại, ai-manager 5 (migrate colors + icon).
- 23 file migrate `colors` tĩnh → useTheme: VietQrConfirmationModal, Register, OCRScan, ImportReceipts, ReceiptDetail, StaffOrders, AdminPromotions, AdminUsers, StoreSettings, AdminInventory, AdminOrders, AdminDashboard, Broadcast, AdminCategories, AdminProducts, Addresses, Profile, Cart, OrderDetail, Orders, Home, AISettings, Notifications.

## 9. Verify

- `npx tsc --noEmit` sạch; `npm run lint` sạch (mỗi task).
- Smoke tay: customer (home → list → detail → cart → VietQr → orders), staff (OCR → import), admin (dashboard → products → orders), auth login 4 role. Dark mode bật/tắt mỗi role 1 màn hình.
- Detector: `node /home/nht/.pi/agent/skills/impeccable/scripts/detect.mjs --json` không áp dụng native — bỏ qua, reviewer floor-check thay.
