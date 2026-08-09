# Real product catalog

## Scope

Populate the existing database with the 50 Vietnamese products in `backend/prisma/seed-real-products.ts`. Each product keeps its existing local image path, `/uploads/products/<sku>.jpg`.

## Flow

The existing `db:seed-real` script upserts products by SKU. The existing backend serves the local uploads directory, and the existing mobile `ProductCard` resolves relative image paths and falls back safely if an image cannot load.

## Verification

Run the seed, confirm the script reports a non-zero product count, then request `/products` and verify returned products have image URLs whose files exist under `backend/uploads/products`.

## Non-goals

No new product model, API endpoint, image service, dependency, or UI changes.
