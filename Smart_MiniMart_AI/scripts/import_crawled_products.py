#!/usr/bin/env python3
"""
Import crawled products into Smart MiniMart Postgres.
- Keeps existing seed demo products
- Upserts by SKU (update if exists)
- Maps categorySlug -> categoryId
"""
from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_batch, Json

DATA = Path(__file__).resolve().parent / "data" / "products_crawled.json"
DSN = os.environ.get(
    "DATABASE_URL",
    "postgresql://minimart:minimart_dev_2026@localhost:5432/smart_minimart",
).replace("?schema=public", "")


def main() -> None:
    if not DATA.exists():
        raise SystemExit(f"Missing {DATA} — run crawl_real_products.py first")

    payload = json.loads(DATA.read_text(encoding="utf-8"))
    products = payload["products"]
    print(f"Loaded {len(products)} crawled products from {DATA}")

    conn = psycopg2.connect(DSN)
    conn.autocommit = False
    cur = conn.cursor()

    cur.execute('SELECT id, slug FROM categories')
    cat_map = {slug: cid for cid, slug in cur.fetchall()}
    print("Categories:", cat_map)

    missing = {p["categorySlug"] for p in products} - set(cat_map)
    if missing:
        raise SystemExit(f"Unknown categories: {missing}")

    # existing skus
    cur.execute("SELECT sku FROM products")
    existing = {r[0] for r in cur.fetchall()}
    print(f"Existing products: {len(existing)}")

    now = datetime.utcnow()
    inserts = []
    updates = []

    for p in products:
        cat_id = cat_map[p["categorySlug"]]
        tags = p.get("tags") or []
        # sanitize tags length
        tags = [str(t)[:60] for t in tags if t][:20]
        barcode = p.get("barcode")
        if barcode and (not str(barcode).isdigit() or not (8 <= len(str(barcode)) <= 14)):
            barcode = None

        expiry = now + timedelta(days=30 + (int(uuid.uuid4().hex[:4], 16) % 300))
        row = {
            "id": str(uuid.uuid4()),
            "sku": p["sku"],
            "barcode": barcode,
            "name": p["name"][:150],
            "slug": p["slug"][:150],
            "description": p.get("description"),
            "shortDescription": p.get("shortDescription"),
            "categoryId": cat_id,
            "brand": (p.get("brand") or None),
            "unit": p.get("unit") or "cái",
            "importPrice": p.get("importPrice") or 0,
            "price": p["price"],
            "salePrice": p.get("salePrice"),
            "stock": int(p.get("stock") or 0),
            "reservedStock": 0,
            "minStock": int(p.get("minStock") or 5),
            "maxStock": int(p.get("maxStock") or 100),
            "expiryDate": expiry,
            "imageUrl": p.get("imageUrl"),
            "tags": tags,
            "attributes": Json(p.get("attributes") or {}),
            "isActive": True,
            "isFeatured": bool(p.get("isFeatured")),
            "soldCount": int(uuid.uuid4().hex[:2], 16) % 50,
            "viewCount": int(uuid.uuid4().hex[2:4], 16) % 200,
            "createdAt": now,
            "updatedAt": now,
        }

        if p["sku"] in existing:
            updates.append(row)
        else:
            # ensure unique slug if collision
            inserts.append(row)

    # resolve slug collisions with existing
    cur.execute("SELECT slug FROM products")
    used_slugs = {r[0] for r in cur.fetchall()}
    for row in inserts:
        base = row["slug"]
        if base in used_slugs:
            row["slug"] = f"{base}-{row['sku'][-6:].lower()}"
        used_slugs.add(row["slug"])

    # also barcode unique: null out collisions
    cur.execute("SELECT barcode FROM products WHERE barcode IS NOT NULL")
    used_bc = {r[0] for r in cur.fetchall()}
    for row in inserts + updates:
        bc = row["barcode"]
        if bc and bc in used_bc and row["sku"] not in existing:
            row["barcode"] = None
        elif bc:
            used_bc.add(bc)

    insert_sql = """
    INSERT INTO products (
      id, sku, barcode, name, slug, description, "shortDescription",
      "categoryId", brand, unit, "importPrice", price, "salePrice",
      stock, "reservedStock", "minStock", "maxStock", "expiryDate",
      "imageUrl", tags, attributes, "isActive", "isFeatured",
      "soldCount", "viewCount", "createdAt", "updatedAt"
    ) VALUES (
      %(id)s, %(sku)s, %(barcode)s, %(name)s, %(slug)s, %(description)s, %(shortDescription)s,
      %(categoryId)s, %(brand)s, %(unit)s, %(importPrice)s, %(price)s, %(salePrice)s,
      %(stock)s, %(reservedStock)s, %(minStock)s, %(maxStock)s, %(expiryDate)s,
      %(imageUrl)s, %(tags)s, %(attributes)s, %(isActive)s, %(isFeatured)s,
      %(soldCount)s, %(viewCount)s, %(createdAt)s, %(updatedAt)s
    )
    ON CONFLICT (sku) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      "shortDescription" = EXCLUDED."shortDescription",
      "categoryId" = EXCLUDED."categoryId",
      brand = EXCLUDED.brand,
      unit = EXCLUDED.unit,
      "importPrice" = EXCLUDED."importPrice",
      price = EXCLUDED.price,
      "salePrice" = EXCLUDED."salePrice",
      stock = EXCLUDED.stock,
      "minStock" = EXCLUDED."minStock",
      "maxStock" = EXCLUDED."maxStock",
      "imageUrl" = EXCLUDED."imageUrl",
      tags = EXCLUDED.tags,
      attributes = EXCLUDED.attributes,
      "isFeatured" = EXCLUDED."isFeatured",
      "isActive" = TRUE,
      "updatedAt" = EXCLUDED."updatedAt"
    """

    # use ON CONFLICT for all (simpler)
    all_rows = inserts + updates
    print(f"Upserting {len(all_rows)} products ({len(inserts)} new-ish, {len(updates)} known sku)...")

    # convert tags list for postgres text[]
    for r in all_rows:
        # psycopg2 adapts list to array
        pass

    execute_batch(cur, insert_sql, all_rows, page_size=50)
    conn.commit()

    cur.execute("SELECT COUNT(*) FROM products")
    total = cur.fetchone()[0]
    cur.execute(
        '''SELECT c.slug, COUNT(p.id)
           FROM categories c
           LEFT JOIN products p ON p."categoryId" = c.id AND p."isActive" = true
           GROUP BY c.slug, c."sortOrder"
           ORDER BY c."sortOrder"'''
    )
    by_cat = cur.fetchall()
    cur.execute(
        '''SELECT name, brand, price, "imageUrl", attributes->>'source' AS src
           FROM products ORDER BY "createdAt" DESC LIMIT 5'''
    )
    samples = cur.fetchall()

    print("\n=== TOTAL PRODUCTS:", total)
    print("=== BY CATEGORY ===")
    for slug, cnt in by_cat:
        print(f"  {slug}: {cnt}")
    print("=== SAMPLE (newest) ===")
    for s in samples:
        print(" ", s)

    # optional product_images primary
    cur.execute("SELECT id, \"imageUrl\" FROM products WHERE \"imageUrl\" IS NOT NULL")
    prods = cur.fetchall()
    img_rows = []
    for pid, url in prods:
        # only add if no images yet
        cur.execute('SELECT COUNT(*) FROM product_images WHERE "productId"=%s', (pid,))
        if cur.fetchone()[0] == 0 and url:
            img_rows.append((str(uuid.uuid4()), pid, url, 0, True, now))
    if img_rows:
        execute_batch(
            cur,
            '''INSERT INTO product_images (id, "productId", url, "sortOrder", "isPrimary", "createdAt")
               VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING''',
            img_rows,
            page_size=100,
        )
        conn.commit()
        print(f"Inserted {len(img_rows)} product_images")

    cur.close()
    conn.close()
    print("DONE")


if __name__ == "__main__":
    main()
