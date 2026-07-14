#!/usr/bin/env python3
"""
Replace non-VN crawled products with Vietnam-only dataset.
- Keeps original seed SKUs (not starting with OFF-/DJ-/FS-/VN-)
- Deactivates DummyJSON / FakeStore / non-VN OFF
- Upserts VN products from products_vn.json
"""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_batch, Json

DATA = Path(__file__).resolve().parent / "data" / "products_vn.json"
DSN = os.environ.get(
    "DATABASE_URL",
    "postgresql://minimart:minimart_dev_2026@localhost:5432/smart_minimart",
).replace("?schema=public", "")


def main() -> None:
    if not DATA.exists():
        raise SystemExit(f"Missing {DATA}")

    payload = json.loads(DATA.read_text(encoding="utf-8"))
    products = payload["products"]
    print(f"VN products file: {len(products)}")

    conn = psycopg2.connect(DSN)
    cur = conn.cursor()

    # 1) Deactivate non-seed foreign crawls
    cur.execute(
        """
        UPDATE products SET "isActive"=false, "updatedAt"=NOW()
        WHERE sku LIKE 'OFF-%' OR sku LIKE 'DJ-%' OR sku LIKE 'FS-%'
           OR (attributes->>'source' IN ('dummyjson','fakestore'))
           OR (attributes->>'source' = 'openfoodfacts' AND COALESCE(attributes->>'market','') <> 'vietnam')
        """
    )
    print(f"Deactivated foreign rows: {cur.rowcount}")

    cur.execute('SELECT id, slug FROM categories')
    cat_map = {slug: cid for cid, slug in cur.fetchall()}

    now = datetime.utcnow()
    rows = []
    used_slugs = set()
    cur.execute("SELECT slug FROM products")
    used_slugs = {r[0] for r in cur.fetchall()}
    # barcodes already in DB (from seed or previous imports)
    cur.execute("SELECT barcode, sku FROM products WHERE barcode IS NOT NULL")
    bc_owner = {r[0]: r[1] for r in cur.fetchall()}
    seen_bc_batch: set[str] = set()

    for p in products:
        cat_id = cat_map.get(p["categorySlug"])
        if not cat_id:
            continue
        slug = p["slug"]
        if slug in used_slugs:
            slug = f"{slug}-{p['sku'][-6:].lower()}"
        used_slugs.add(slug)

        bc = p.get("barcode")
        if bc and (not str(bc).isdigit() or not (8 <= len(str(bc)) <= 14)):
            bc = None
        # Avoid unique barcode collisions across different SKUs
        if bc:
            owner = bc_owner.get(bc)
            if owner and owner != p["sku"]:
                bc = None
            elif bc in seen_bc_batch:
                bc = None
            else:
                seen_bc_batch.add(bc)
                bc_owner[bc] = p["sku"]

        tags = [str(t)[:60] for t in (p.get("tags") or [])][:20]
        expiry = now + timedelta(days=60 + int(uuid.uuid4().hex[:3], 16) % 280)
        rows.append({
            "id": str(uuid.uuid4()),
            "sku": p["sku"],
            "barcode": bc,
            "name": p["name"][:150],
            "slug": slug[:150],
            "description": p.get("description"),
            "shortDescription": p.get("shortDescription"),
            "categoryId": cat_id,
            "brand": p.get("brand"),
            "unit": p.get("unit") or "cái",
            "importPrice": p.get("importPrice") or 0,
            "price": p["price"],
            "salePrice": p.get("salePrice"),
            "stock": int(p.get("stock") or 20),
            "reservedStock": 0,
            "minStock": int(p.get("minStock") or 5),
            "maxStock": int(p.get("maxStock") or 300),
            "expiryDate": expiry,
            "imageUrl": p.get("imageUrl"),
            "tags": tags,
            "attributes": Json(p.get("attributes") or {"market": "vietnam"}),
            "isActive": True,
            "isFeatured": bool(p.get("isFeatured")),
            "soldCount": int(uuid.uuid4().hex[:2], 16) % 40,
            "viewCount": int(uuid.uuid4().hex[2:4], 16) % 150,
            "createdAt": now,
            "updatedAt": now,
        })

    sql = """
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
      name=EXCLUDED.name,
      description=EXCLUDED.description,
      "shortDescription"=EXCLUDED."shortDescription",
      "categoryId"=EXCLUDED."categoryId",
      brand=EXCLUDED.brand,
      unit=EXCLUDED.unit,
      "importPrice"=EXCLUDED."importPrice",
      price=EXCLUDED.price,
      "salePrice"=EXCLUDED."salePrice",
      stock=EXCLUDED.stock,
      "imageUrl"=EXCLUDED."imageUrl",
      tags=EXCLUDED.tags,
      attributes=EXCLUDED.attributes,
      "isActive"=TRUE,
      "isFeatured"=EXCLUDED."isFeatured",
      "updatedAt"=EXCLUDED."updatedAt"
    """
    print(f"Upserting {len(rows)} VN products...")
    execute_batch(cur, sql, rows, page_size=40)
    conn.commit()

    # product images for active with image
    cur.execute('SELECT id, "imageUrl" FROM products WHERE "isActive"=true AND "imageUrl" IS NOT NULL')
    prods = cur.fetchall()
    img_rows = []
    for pid, url in prods:
        cur.execute('SELECT COUNT(*) FROM product_images WHERE "productId"=%s', (pid,))
        if cur.fetchone()[0] == 0 and url:
            img_rows.append((str(uuid.uuid4()), pid, url, 0, True, now))
    if img_rows:
        execute_batch(
            cur,
            '''INSERT INTO product_images (id,"productId",url,"sortOrder","isPrimary","createdAt")
               VALUES (%s,%s,%s,%s,%s,%s)''',
            img_rows, page_size=100,
        )
        conn.commit()
        print(f"images +{len(img_rows)}")

    cur.execute('SELECT COUNT(*) FROM products WHERE "isActive"=true')
    active = cur.fetchone()[0]
    cur.execute(
        """
        SELECT COALESCE(attributes->>'market','seed/other') m,
               COALESCE(attributes->>'source','seed') s,
               COUNT(*) FILTER (WHERE "isActive") active,
               COUNT(*) total
        FROM products GROUP BY 1,2 ORDER BY active DESC
        """
    )
    print("ACTIVE", active)
    for r in cur.fetchall():
        print(" ", r)
    cur.execute(
        '''SELECT c.slug, COUNT(p.id) FROM categories c
           LEFT JOIN products p ON p."categoryId"=c.id AND p."isActive"
           GROUP BY c.slug, c."sortOrder" ORDER BY c."sortOrder"'''
    )
    print("BY CAT")
    for r in cur.fetchall():
        print(" ", r)
    cur.execute(
        '''SELECT name, brand, left("imageUrl",55)
           FROM products WHERE "isActive" AND attributes->>'market'='vietnam'
           ORDER BY random() LIMIT 8'''
    )
    print("SAMPLES")
    for r in cur.fetchall():
        print(" ", r)

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
