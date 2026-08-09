# Home Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the customer Home screen into a discovery experience while preserving the two-column, 24-product catalog pages.

**Architecture:** Extend the existing product-list query with one sale flag, then reuse `useProducts` for sale, best-selling, and newest Home sections. Keep presentation in the existing Home and catalog screens; promotions and categories remain their current APIs.

**Tech Stack:** NestJS, Prisma, Jest, React Native, Expo, TanStack Query.

## Global Constraints

- Keep `/products` pagination at `limit=24` in the customer catalog.
- Do not add a favorites model, banner CMS, dependency, or new endpoint.
- Each Home section must fail independently; the catalog remains usable.

---

### Task 1: Add the sale-product filter

**Files:**
- Modify: `Smart_MiniMart_AI/backend/src/modules/products/dto/product-query.dto.ts`
- Modify: `Smart_MiniMart_AI/backend/src/modules/products/products.service.ts:14-58`
- Test: `Smart_MiniMart_AI/backend/src/modules/products/products.service.spec.ts`

**Interfaces:**
- Consumes: `GET /products?onSale=true`.
- Produces: paginated active products with a non-null `salePrice`.

- [ ] **Step 1: Write the failing service test**

```ts
it('filters active products with a sale price when onSale=true', async () => {
  repo.transactionList.mockResolvedValue([[], 0]);
  await service.list({ onSale: 'true' } as any);
  const findManyArg = (repo.transactionList.mock.calls[0] as any)[0];
  expect(findManyArg.where).toEqual({ isActive: true, salePrice: { not: null } });
});
```

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- products.service.spec.ts --runInBand`

Expected: the `salePrice` assertion fails because `onSale` is not yet read.

- [ ] **Step 3: Add the minimal API behavior**

```ts
// ProductQueryDto
@IsOptional()
@IsBooleanString()
onSale?: string;

// ProductsService.list, after the inStock filter
if (query.onSale === 'true') where.salePrice = { not: null };
```

- [ ] **Step 4: Verify the targeted test passes**

Run: `npm test -- products.service.spec.ts --runInBand`

Expected: all `ProductsService` tests pass.

- [ ] **Step 5: Commit**

```bash
git add Smart_MiniMart_AI/backend/src/modules/products/dto/product-query.dto.ts Smart_MiniMart_AI/backend/src/modules/products/products.service.ts Smart_MiniMart_AI/backend/src/modules/products/products.service.spec.ts
git commit -m "feat: filter sale products"
```

### Task 2: Preserve catalog size and accept Home filters

**Files:**
- Modify: `Smart_MiniMart_AI/mobile/src/screens/customer/ProductListScreen.tsx:31-58`

**Interfaces:**
- Consumes: optional route params `{ title?: string; sortBy?: string; onSale?: boolean; minPrice?: number; maxPrice?: number }`.
- Produces: a `useProducts` query with `{ page, limit: 24, sortBy, onSale, minPrice, maxPrice }`.

- [ ] **Step 1: Confirm the existing catalog request remains 24 products**

Run: `rg -n "limit: 24" mobile/src/screens/customer/ProductListScreen.tsx`

Expected: one catalog query uses `limit: 24`.

- [ ] **Step 2: Initialize filter state from route params**

```ts
const initialOnSale = route.params?.onSale === true;
const [sortBy, setSortBy] = useState(route.params?.sortBy ?? 'newest');
const [onSaleOnly, setOnSaleOnly] = useState(initialOnSale);
```

Initialize matching price bounds from the route and add `onSale: 'true'` only when `onSaleOnly` is true.

- [ ] **Step 3: Keep the filter reversible**

Add the sale flag to `activeFilters` and set `onSaleOnly` to `false` in `resetFilters`, so “Xoá lọc” returns to the 24-product catalog.

- [ ] **Step 4: Verify mobile types**

Run: `npm run type-check`

Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add Smart_MiniMart_AI/mobile/src/screens/customer/ProductListScreen.tsx
git commit -m "feat: open catalog with discovery filters"
```

### Task 3: Build the discovery Home screen from existing data

**Files:**
- Modify: `Smart_MiniMart_AI/mobile/src/screens/customer/HomeScreen.tsx:30-238`

**Interfaces:**
- Consumes: `useCategories`, `useActivePromos`, `useProducts({ onSale: 'true', limit: 4 })`, `useProducts({ sortBy: 'best_selling', limit: 6 })`, and `useProducts({ sortBy: 'newest', limit: 4 })`.
- Produces: promotion banner, category links, sale, best-selling, newest, and price-band sections whose CTAs open `ProductList` with matching params.

- [ ] **Step 1: Add independent discovery queries**

```ts
const saleQ = useProducts({ onSale: 'true', limit: 4 });
const bestSellingQ = useProducts({ sortBy: 'best_selling', limit: 6 });
const newestQ = useProducts({ sortBy: 'newest', limit: 4 });
```

Extend `retryHome` to refetch these queries. Do not add them to the boot-error condition.

- [ ] **Step 2: Replace the featured block with discovery sections**

Render `Ưu đãi hôm nay`, `Được mua nhiều`, and `Mới về` with the existing two-column `ProductCard` grid. Each header calls `nav.navigate('ProductList', params)`:

```ts
{ title: 'Ưu đãi hôm nay', onSale: true }
{ title: 'Được mua nhiều', sortBy: 'best_selling' }
{ title: 'Mới về', sortBy: 'newest' }
```

Show each section only when it has products; a failed or empty section does not render a whole-screen error.

- [ ] **Step 3: Add a promotion fallback and price-band links**

When `promos[0]` is absent, render the existing banner style with “Ưu đãi mỗi ngày” and navigate to `{ title: 'Ưu đãi hôm nay', onSale: true }`. Add four price chips that navigate with:

```ts
{ title: 'Dưới 30k', maxPrice: 30000 }
{ title: '30k – 50k', minPrice: 30000, maxPrice: 50000 }
{ title: '50k – 100k', minPrice: 50000, maxPrice: 100000 }
{ title: 'Trên 100k', minPrice: 100000 }
```

- [ ] **Step 4: Verify mobile checks**

Run: `npm run type-check; npm run lint`

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add Smart_MiniMart_AI/mobile/src/screens/customer/HomeScreen.tsx
git commit -m "feat: expand home product discovery"
```

### Task 4: Verify the shopper flow

**Files:**
- Verify: `Smart_MiniMart_AI/backend/src/modules/products/products.service.spec.ts`
- Verify: `Smart_MiniMart_AI/mobile/src/screens/customer/HomeScreen.tsx`
- Verify: `Smart_MiniMart_AI/mobile/src/screens/customer/ProductListScreen.tsx`

**Interfaces:**
- Consumes: local backend seeded with sale products.
- Produces: Home links that reach a two-column catalog with 24 products per page.

- [ ] **Step 1: Run all backend tests**

Run: `npm test -- --runInBand`

Expected: all Jest suites pass.

- [ ] **Step 2: Verify the sale endpoint**

Run: `curl "http://localhost:4000/api/v1/products?onSale=true&limit=24"`

Expected: `items` contain only non-null `salePrice` values and the response reports `limit: 24`.

- [ ] **Step 3: Verify mobile checks**

Run: `npm run type-check; npm run lint`

Expected: both commands exit 0.
