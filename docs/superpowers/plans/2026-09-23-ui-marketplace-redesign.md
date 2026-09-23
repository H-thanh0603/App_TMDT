# UI Marketplace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign toàn bộ 37 màn hình mobile sang world chợ hiện đại (cam/đỏ, banner deal, icon vector), giữ nguyên logic/API/copy.

**Architecture:** Token-swap (palette cam/đỏ trong `theme/colors.ts`) + component kit chuẩn hoá (`AppIcon`, Button/Card/Badge/ProductCard) + rebuild Home carousel/flash-sale/category-grid; 23 file migrate `colors` tĩnh → `useTheme()`; customer flows + admin/staff restyle theo token.

**Tech Stack:** Expo SDK 54, React Native 0.81, `@expo/vector-icons@~15.0.2` (SDK-pinned), react-navigation 7, StyleSheet + useTheme (không lib UI mới).

**Spec:** `docs/superpowers/specs/2026-09-23-ui-marketplace-redesign-design.md` (+ `PRODUCT.md`)

## Global Constraints

- Không đụng: `mobile/assets/*`, backend, OCR, API contract, copy tiếng Việt, navigation/route params, luồng COD/VNPay/VietQR, AI gateway logic.
- Không dep mới ngoài `@expo/vector-icons` (không linear-gradient, không carousel lib).
- Mọi style màu ăn token `useTheme()`; cấm hardcode hex ngoài `colors.ts` và `AppIcon` map.
- Emoji chỉ trong data (tên SP, EmptyState icon string); cấm emoji làm icon UI.
- Mỗi task xong: `npx tsc --noEmit` + `npm run lint` sạch mới commit.

## Review Focus

- Dark mode vỡ nền/chữ ở màn hình migrate colors (nền trắng hardcode còn sót) — smoke toggle dark mỗi role.
- Nút cam chữ trắng tương phản kém trên primaryLight — chữ CTA luôn trắng trên nền primary/primaryDark, không dùng primaryLight làm nền nút.
- Carousel promo rỗng/crash khi `promos=[]` — fallback banner local phải render.
- Countdown flash-sale sai múi giờ — tính theo Asia/Ho_Chi_Minh, hết ngày reset.
- Icon map thiếu tên → glyph `help-circle` fallback, không crash.

---

### Task 1: Palette cam/đỏ + xóa colors tĩnh

**Files:**
- Modify: `Smart_MiniMart_AI/mobile/src/theme/colors.ts`

**Interfaces:**
- Consumes: `ThemeColors` type hiện có (giữ nguyên shape, chỉ đổi giá trị).
- Produces: token primary cam light/dark cho toàn bộ task sau.

- [ ] **Step 1: Ghi đè giá trị palette theo spec §1**

Đổi trong `lightColors`: `primary:'#EE4D2D'`, `primaryDark:'#D73211'`, `primaryLight:'#FF6B4A'`, `primarySoft:'#FEE4D9'`, `success:'#16A34A'`, `bg:'#FFF8F4'`, `bgAlt:'#FEEFE8'`, `bgSecondary:'#F5F1EC'`, `border:'#F0D9CE'`, `borderLight:'#FBE7DC'`, `divider:'#F0D9CE'`, `text:'#1F1B16'`, `textSecondary:'#57534E'`, `textMuted:'#A8A29E'`, `textTertiary:'#A8A29E'`, `roleCustomer:'#EE4D2D'`, `roleStaff:'#1677FF'`, `accent:'#EE4D2D'`. Đổi trong `darkColors`: `primary:'#FF6B4A'`, `primaryDark:'#EE4D2D'`, `primaryLight:'#FF8A66'`, `primarySoft:'#431407'`, `success:'#22C55E'`, `bg:'#140F0C'`, `bgAlt:'#1F1712'`, `bgSecondary:'#1F1712'`, `card:'#241A14'`, `surface:'#241A14'`, `border:'#3F2D22'`, `borderLight:'#2A1D15'`, `divider:'#3F2D22'`, `text:'#FFF7ED'`, `textSecondary:'#E7D5C5'`, `textTertiary:'#78716C'`, `roleCustomer:'#FF6B4A'`, `roleStaff:'#60A5FA'`, `accent:'#FF6B4A'`. Xóa dòng `export const colors: ThemeColors = { ...lightColors };` và comment tương thích cũ.

- [ ] **Step 2: Type-check**

Run: `cd Smart_MiniMart_AI/mobile && npx tsc --noEmit`
Expected: FAIL — 23 file import `colors` không còn tồn tại (liệt kê ở spec §8). Lỗi này mong đợi, task sau sửa.

- [ ] **Step 3: Commit**

```bash
git add Smart_MiniMart_AI/mobile/src/theme/colors.ts
git commit -m "feat(ui): palette marketplace cam/do, xoa colors tinh"
```

### Task 2: AppIcon + expo-vector-icons

**Files:**
- Modify: `Smart_MiniMart_AI/mobile/package.json` (thêm `"@expo/vector-icons": "~15.0.2"`)
- Create: `Smart_MiniMart_AI/mobile/src/components/AppIcon.tsx`

**Interfaces:**
- Consumes: token màu qua props `color`.
- Produces: `AppIcon({name, size, color})` cho mọi task sau. Type: `AppIconName = 'home'|'search'|'robot'|'cart'|'user'|'bell'|'pin'|'tag'|'truck'|'wallet'|'qr'|'camera'|'box'|'chart'|'users'|'cog'|'logout'|'chevron-right'|'plus'|'minus'|'close'|'check'|'alert'|'gift'|'flash'|'clock'|'grid'|'heart'|'help'`.

- [ ] **Step 1: Thêm dep**

```bash
cd Smart_MiniMart_AI/mobile && npm install @expo/vector-icons@~15.0.2
```

- [ ] **Step 2: Tạo AppIcon**

```tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type AppIconName = 'home'|'search'|'robot'|'cart'|'user'|'bell'|'pin'|'tag'|'truck'|'wallet'|'qr'|'camera'|'box'|'chart'|'users'|'cog'|'logout'|'chevron-right'|'plus'|'minus'|'close'|'check'|'alert'|'gift'|'flash'|'clock'|'grid'|'heart'|'help';

const GLYPH: Record<AppIconName, keyof typeof MaterialCommunityIcons.glyphMap> = {
  home: 'home', search: 'magnify', robot: 'robot', cart: 'cart', user: 'account',
  bell: 'bell', pin: 'map-marker', tag: 'tag', truck: 'truck', wallet: 'wallet',
  qr: 'qrcode-scan', camera: 'camera', box: 'package-variant', chart: 'chart-bar',
  users: 'account-group', cog: 'cog', logout: 'logout', 'chevron-right': 'chevron-right',
  plus: 'plus', minus: 'minus', close: 'close', check: 'check', alert: 'alert-circle',
  gift: 'gift', flash: 'flash', clock: 'clock-outline', grid: 'view-grid', heart: 'heart',
  help: 'help-circle',
};

export function AppIcon({ name, size = 22, color = '#000' }: { name: AppIconName; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={GLYPH[name] ?? GLYPH.help} size={size} color={color} />;
}
```

- [ ] **Step 3: Type-check + lint**

Run: `cd Smart_MiniMart_AI/mobile && npx tsc --noEmit && npm run lint`
Expected: tsc vẫn FAIL ở 23 file task 1 (chưa sửa) — chỉ cần không có lỗi mới ở `AppIcon.tsx`.

- [ ] **Step 4: Commit**

```bash
git add Smart_MiniMart_AI/mobile/package.json Smart_MiniMart_AI/mobile/package-lock.json Smart_MiniMart_AI/mobile/src/components/AppIcon.tsx
git commit -m "feat(ui): AppIcon wrapper + expo-vector-icons"
```

### Task 3: Component kit chuẩn hoá

**Files:**
- Modify: `Button.tsx`, `Card.tsx`, `Badge.tsx`, `ProductCard.tsx`, `Skeleton.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `StatCard.tsx`, `ThemeToggle.tsx` trong `Smart_MiniMart_AI/mobile/src/components/`

**Interfaces:**
- Consumes: `useTheme()` tokens, `AppIcon` (Task 2), `formatVnd`, `resolveImage`.
- Produces: kit chuẩn cho mọi screen. Giữ nguyên props public; `EmptyState` thêm prop `tone?: 'primary'|'ai'|'gold'` và `icon?: string | ReactNode`.

- [ ] **Step 1: Button — bo 14, nền phẳng primary**

Trong `Button.tsx`: đổi `borderRadius: radius.base` → `radius.lg` (16) cho variant primary/danger; các variant khác giữ. Không thêm gradient. Giữ spring scale, loading, disabled opacity.

- [ ] **Step 2: Card — elevated thêm border**

Trong `Card.tsx` variant elevated: thêm `borderWidth: 1, borderColor: colors.borderLight` cạnh shadow hiện có để dark mode vẫn nổi.

- [ ] **Step 3: Badge — success fg + dot đếm**

Trong `Badge.tsx`: `success.fg` dùng `colors.success` thay vì `primaryDark` (tránh nhầm CTA). Thêm prop `count?: number`: khi có, render dot tròn danger chữ trắng (dùng cho bell header Home).

- [ ] **Step 4: ProductCard — giá cam, badge -x%**

Trong `ProductCard.tsx`: giá `fontWeight 800`, màu `colors.primary`. Badge sale: tính `pct = round((1 - salePrice/price)*100)`, label `-${pct}%` thay chữ SALE cứng. Giữ grid/list, placeholder emoji (data), skeleton nền.

- [ ] **Step 5: EmptyState/ErrorState tone + icon node**

`EmptyState`: thêm `tone` prop; `iconCircle` background = `tone==='ai'?colors.aiSoft:tone==='gold'?colors.goldSoft:colors.primarySoft`; `icon` chấp nhận `ReactNode` (render trực tiếp) hoặc string (Text emoji như cũ). `ErrorState`: bọc tương tự, icon mặc định `<AppIcon name="alert" />`.

- [ ] **Step 6: StatCard + ThemeToggle icon**

`StatCard`: số `fontWeight 800`, màu prop `accent` (mặc định role của navigator). `ThemeToggle`: sun/moon emoji → `<AppIcon name={isDark?'weather-sunny':'weather-night'} />` — cần thêm 2 glyph vào map Task 2 (`weather-sunny`, `weather-night`).

- [ ] **Step 7: Type-check + lint**

Run: `cd Smart_MiniMart_AI/mobile && npx tsc --noEmit && npm run lint`
Expected: chỉ còn lỗi 23 file migrate (task sau); kit không lỗi mới.

- [ ] **Step 8: Commit**

```bash
git add Smart_MiniMart_AI/mobile/src/components/
git commit -m "feat(ui): chuan hoa component kit marketplace"
```

### Task 4: Navigator icons + header cam

**Files:**
- Modify: `Smart_MiniMart_AI/mobile/src/navigation/CustomerNavigator.tsx`, `AdminNavigator.tsx`, `StaffNavigator.tsx`, `AIManagerNavigator.tsx`

**Interfaces:**
- Consumes: `AppIcon`, token role.
- Produces: tab bar vector + header màu role cho 4 role.

- [ ] **Step 1: CustomerNavigator**

Thay `tabBarIcon` emoji map (`🏠🔍🤖🛒👤`) bằng AppIcon (`home/search/robot/cart/user`), giữ `tabBarActiveTintColor: colors.primary`. Stack `headerStyle.backgroundColor` → `colors.primaryDark`.

- [ ] **Step 2: Admin/Staff/AIManager navigators**

Thay emoji map bằng AppIcon tương ứng (Dashboard `chart`, Products `box`, Orders `truck`, Users `users`, Profile `user`; Staff Orders `box`, Imports `truck`, Notif `bell`; AI Center `robot`, Providers `cog`, Logs `clock`). Giữ activeTint màu role + header màu role. Xóa `import { Text }` nếu không còn dùng.

- [ ] **Step 3: Type-check + lint + commit**

Run: `cd Smart_MiniMart_AI/mobile && npx tsc --noEmit && npm run lint`

```bash
git add Smart_MiniMart_AI/mobile/src/navigation/
git commit -m "feat(ui): tab bar vector + header mau role"
```

### Task 5: Home rebuild (carousel + flash-sale + category grid)

**Files:**
- Modify: `Smart_MiniMart_AI/mobile/src/screens/customer/HomeScreen.tsx`

**Interfaces:**
- Consumes: hooks cũ (`useCategories`, `useProducts`, `useActivePromos`, `useNotifications`), `ProductCard`, `Badge`, `AppIcon`, token mới.
- Produces: Home world B. Không đổi tên export, route params, query keys.

- [ ] **Step 1: Migrate colors + header cam + search nổi**

`import { colors } from '@/theme/colors'` → `const { colors } = useTheme()`. Header nền `colors.primaryDark`; bell → AppIcon + Badge count; bỏ emoji 👋 trong userName; VIP badge giữ. Search bar giữ cấu trúc, icon → AppIcon robot Violet, nút mũi tên nền primary.

- [ ] **Step 2: Promo carousel paging**

Thay banner đơn bằng `FlatList horizontal pagingEnabled` trên `promos` (fallback 1 slide local "Ưu đãi mỗi ngày" khi rỗng). Slide: nền `primaryDark`, badge HOT/SALE nền trắng chữ danger, tên/mã/mức giảm trắng, nút "Lấy ngay" trắng chữ primary → `nav.navigate('ProductList', { title: 'Khuyến mãi' })`. Dot indicator theo `onMomentumScrollEnd` index state.

- [ ] **Step 3: Flash-sale strip + countdown Asia/Ho_Chi_Minh**

Dưới carousel: header AppIcon flash + "Flash sale" + countdown `HH:MM:SS` đến 23:59 hôm nay (tính bằng `new Date()` + offset +7, `setInterval` 1s, clear unmount). Horizontal scroll `sale` qua ProductCard mini (width 140). `onSeeAll` → ProductList onSale.

- [ ] **Step 4: Category grid 2 hàng + tiện ích**

Xóa `CAT_EMOJI` + `CAT_COLORS`; grid `FlatList numColumns={4}` categories: icon AppIcon map theo tên (`Đồ uống`→cup→dùng `tag` fallback? — map cụ thể: ăn→`food`? Chỉ dùng glyph đã có: food không có trong map → mở rộng AppIcon thêm `food:'food'`, `cup:'cup'`, `milk:'cow'`? Giữ đơn giản: mọi category dùng AppIcon `grid` với nền soft xoay `[primarySoft, aiSoft, goldSoft, dangerSoft]`). Thay dải "Mua theo mức giá" bằng hàng Tiện ích 4 mục (AI Chat/robot, Giỏ hàng/cart, Đơn hàng/truck, Địa chỉ/pin). Giữ 3 DiscoverySection + skeleton/error/refresh cũ.

- [ ] **Step 5: Type-check + lint + commit**

Run: `cd Smart_MiniMart_AI/mobile && npx tsc --noEmit && npm run lint`

```bash
git add Smart_MiniMart_AI/mobile/src/screens/customer/HomeScreen.tsx Smart_MiniMart_AI/mobile/src/components/AppIcon.tsx
git commit -m "feat(ui): rebuild Home marketplace (carousel, flash-sale, grid)"
```

### Task 6: Customer flows restyle

**Files:**
- Modify: `ProductListScreen.tsx`, `ProductDetailScreen.tsx`, `CartScreen.tsx`, `VietQrScreen.tsx`, `VietQrConfirmationModal.tsx`, `OrdersScreen.tsx`, `OrderDetailScreen.tsx`, `AddressesScreen.tsx`, `ProfileScreen.tsx`, `AIChatScreen.tsx`, `AISearchScreen.tsx` trong customer (+ modal)

**Interfaces:**
- Consumes: kit Task 3, AppIcon, useTheme.
- Produces: flows cùng logic, visual world B. Không đổi query/mutation/navigate params.

- [ ] **Step 1: Migrate colors tĩnh → useTheme**

7 file trong nhóm này còn import tĩnh (Addresses, Cart, OrderDetail, Orders, Profile — xem spec §8): đổi sang `useTheme()`. Rà `backgroundColor: 'white'` → `colors.surface`, text hardcode → token.

- [ ] **Step 2: List + Detail**

ProductList: chip active nền primary chữ trắng; filter modal Button kit; grid ProductCard mới. ProductDetail: giá 24/800 primary + strike + badge -x% (tái dùng logic ProductCard); stock badge success/danger token; nút "Thêm giỏ" outline primary + "Mua ngay" primary (Mua ngay = `handleAdd` rồi navigate Cart — không API mới); review giữ nguyên.

- [ ] **Step 3: Cart + VietQr**

Cart: qty stepper viền primary, nút X AppIcon close danger; payOption active nền primary chữ trắng; checkout Button kit lg full-width. VietQr + modal: countdown/total primary 800, nút xác nhận Button kit; modal migrate colors.

- [ ] **Step 4: Orders + Addresses + Profile + AI + Notifications**

Status badge map: PENDING gold, CONFIRMED info, SHIPPING primary, DELIVERED success, CANCELLED danger (dùng Badge variant có sẵn + custom fg khi cần). AIChat header Violet (`colors.aiDark`), không cam. Icon pin/truck/wallet/qr qua AppIcon. Empty/Error states dùng tone phù hợp.

- [ ] **Step 5: Type-check + lint + commit**

Run: `cd Smart_MiniMart_AI/mobile && npx tsc --noEmit && npm run lint`

```bash
git add Smart_MiniMart_AI/mobile/src/screens/customer/ Smart_MiniMart_AI/mobile/src/components/VietQrConfirmationModal.tsx Smart_MiniMart_AI/mobile/src/screens/NotificationsScreen.tsx
git commit -m "feat(ui): restyle customer flows marketplace"
```

### Task 7: Admin + staff + AI-manager + auth

**Files:**
- Modify: 11 admin + 4 staff còn lại (OCRScan, ImportReceipts, ReceiptDetail, StaffOrders) + 5 ai-manager + auth (Login, Register, Forgot) + `NotificationsScreen.tsx`

**Interfaces:**
- Consumes: kit + AppIcon + token role.
- Produces: vận hành cùng logic, visual đồng nhất. Không đổi guard/query/mutation.

- [ ] **Step 1: Migrate 16 file colors tĩnh còn lại**

(spec §8 trừ nhóm Task 6): VietQrConfirmationModal (đã làm ở Task 6 nếu gộp — bỏ qua nếu xong), Register, OCRScan, ImportReceipts, ReceiptDetail, StaffOrders, AdminPromotions, AdminUsers, StoreSettings, AdminInventory, AdminOrders, AdminDashboard, Broadcast, AdminCategories, AdminProducts, AISettings → `useTheme()`. Rà nền/text hardcode.

- [ ] **Step 2: Emoji UI → AppIcon**

Thay emoji điều hướng/trạng thái/CTA trong admin/staff/ai-manager/auth (list 15 file ở audit) bằng AppIcon; emoji trong nội dung data giữ. Login demo role chip giữ màu role (giờ customer cam). Nút scan OCR cam primary; CTA auth primary.

- [ ] **Step 3: tsc sạch toàn repo + lint + commit**

Run: `cd Smart_MiniMart_AI/mobile && npx tsc --noEmit && npm run lint`
Expected: PASS cả hai (hết lỗi 23 file từ Task 1).

```bash
git add Smart_MiniMart_AI/mobile/src/
git commit -m "feat(ui): restyle admin/staff/ai/auth, tsc sach"
```

### Task 8: Smoke verify + chốt

**Files:** không đổi code (chỉ fix nếu smoke lòi bug).

- [ ] **Step 1: Smoke customer**

Expo start, login customer demo: Home (carousel vuốt được, flash-sale đếm giờ, category grid) → ProductList (chip/filter) → Detail (Mua ngay) → Cart (đổi qty, đổi pay method) → VietQr → Orders. Ghi bug vào list, fix trong task này.

- [ ] **Step 2: Smoke staff/admin/AI + dark mode**

Staff: Orders → OCRScan → Import. Admin: Dashboard → Products → Orders. AI-manager: Center → Providers. Auth: login 4 role + register + forgot. Bật dark mode mỗi role 1 màn hình, rà nền trắng sót/chữ chìm.

- [ ] **Step 3: Final tsc + lint + commit fix (nếu có)**

Run: `cd Smart_MiniMart_AI/mobile && npx tsc --noEmit && npm run lint`

```bash
git add -A && git commit -m "fix(ui): smoke pass marketplace redesign" # chỉ khi có fix
```
