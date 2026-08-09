# Home Discovery Design

## Goal

Make the customer home screen a discovery surface that leads shoppers into the existing catalog, while retaining the catalog's two-column, 24-product pages.

## Home layout

1. Greeting, notification badge, and search entry point.
2. Horizontal promotion banners from active promotions. When none are available, show one local fallback banner with a catalog CTA.
3. Horizontal category shortcuts.
4. **Ưu đãi hôm nay**: sale products only.
5. **Được mua nhiều**: products ordered by `soldCount`.
6. **Mới về**: products ordered by `createdAt`.
7. **Mua theo mức giá**: under 30k, 30–50k, 50–100k, and above 100k.

Every section has a clear “Xem tất cả” action that opens the catalog with the matching sort or filter.

## Data and navigation

- Keep `/products?page=<n>&limit=24` and the existing two-column catalog grid and pager.
- Add `onSale=true` to the product query. It returns active products where `salePrice` is non-null and less than `price`.
- Reuse `sortBy=best_selling` and `sortBy=newest` for the buying and new-arrival sections.
- Reuse active promotions and categories APIs; do not introduce a favorites model, banner CMS, or dependency.
- Catalog navigation accepts the current sort, price bounds, or sale filter so each Home CTA opens a relevant result set.

## Resilience and verification

- Load Home sections independently. A failed promotion or sale query renders its fallback/omits only that section; product discovery remains usable.
- Pull-to-refresh retries all Home queries.
- Add a backend test for `onSale=true`; keep the current product-list pagination behaviour covered.
- Run mobile type-check and lint after the screen and query changes.
