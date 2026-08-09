# Real Product Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate the database with the existing 50 products and make their existing local images available to the mobile catalog.

**Architecture:** `backend/prisma/seed-real-products.ts` already upserts the catalog by SKU and assigns paths under `/uploads/products`. The backend and mobile client already serve and resolve those paths, so execution is limited to seeding and endpoint/file verification.

**Tech Stack:** NestJS, Prisma, TypeScript, local JPG assets.

## Global Constraints

- Do not add dependencies, routes, models, or UI code.
- Preserve the existing user changes outside the files listed below.

---

### Task 1: Seed and verify the existing catalog

**Files:**
- Modify: database records through `Smart_MiniMart_AI/backend/prisma/seed-real-products.ts`
- Verify: `Smart_MiniMart_AI/backend/uploads/products/*.jpg`
- Verify: `Smart_MiniMart_AI/backend/src/modules/products/products.controller.ts:28-40`

**Interfaces:**
- Consumes: `npm run db:seed-real`, which invokes `seed-real-products.ts`.
- Produces: Product records whose `imageUrl` is `/uploads/products/<lowercase-sku>.jpg`.

- [ ] **Step 1: Confirm all seed image files are present**

Run: `Get-ChildItem backend/uploads/products -Filter *.jpg | Measure-Object`

Expected: `Count` is at least 50.

- [ ] **Step 2: Run the existing product seed**

Run: `npm run db:seed-real`

Expected: output contains `tổng sản phẩm trong DB =` with a value of at least 50.

- [ ] **Step 3: Verify a product record points at a real image**

Run: `npx prisma db execute --stdin` with `SELECT sku, "imageUrl" FROM "Product" WHERE sku = 'DU-201';`

Expected: `DU-201` has `/uploads/products/du-201.jpg`, and `backend/uploads/products/du-201.jpg` exists.

- [ ] **Step 4: Verify the public catalog endpoint while the backend is running**

Run: `Invoke-RestMethod http://localhost:4000/api/v1/products?limit=1`

Expected: the first product has a non-empty `imageUrl`; mobile resolves it through `resolveImage`.
