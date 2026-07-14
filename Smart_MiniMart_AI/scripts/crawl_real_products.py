#!/usr/bin/env python3
"""
Crawl multi-source product data for Smart MiniMart AI.
Sources:
  1) Open Food Facts (world + Vietnam) — FMCG thật: đồ uống, sữa, mì, bánh kẹo, gia vị, cà phê...
  2) DummyJSON — beauty/home/groceries
  3) Fake Store API — electronics/home/clothing (map do-ca-nhan / do-gia-dung)

Output: scripts/data/products_crawled.json
"""
from __future__ import annotations

import json
import re
import time
import hashlib
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

OUT_DIR = Path(__file__).resolve().parent / "data"
OUT_FILE = OUT_DIR / "products_crawled.json"
UA = "SmartMiniMartAI-ThesisCrawler/1.0 (student project; contact: local)"

# Target ~35 per category × 9 ≈ 315
PER_CATEGORY_TARGET = 35

CATEGORY_QUERIES: dict[str, list[dict[str, Any]]] = {
    "do-uong": [
        {"source": "off", "search_terms": "coca cola", "page_size": 40},
        {"source": "off", "search_terms": "pepsi", "page_size": 20},
        {"source": "off", "search_terms": "nước ngọt", "page_size": 30},
        {"source": "off", "search_terms": "water bottle", "page_size": 25},
        {"source": "off", "categories_tags_en": "soft-drinks", "page_size": 40},
        {"source": "dummy", "category": "groceries", "filter": "drink"},
    ],
    "sua": [
        {"source": "off", "search_terms": "sữa tươi", "page_size": 30},
        {"source": "off", "search_terms": "milk", "page_size": 40},
        {"source": "off", "search_terms": "yogurt", "page_size": 30},
        {"source": "off", "categories_tags_en": "milks", "page_size": 40},
        {"source": "off", "categories_tags_en": "yogurts", "page_size": 30},
    ],
    "mi-goi": [
        {"source": "off", "search_terms": "mì tôm", "page_size": 25},
        {"source": "off", "search_terms": "instant noodles", "page_size": 40},
        {"source": "off", "search_terms": "ramen", "page_size": 30},
        {"source": "off", "categories_tags_en": "instant-noodles", "page_size": 40},
        {"source": "off", "search_terms": "pho", "page_size": 20},
    ],
    "banh-keo": [
        {"source": "off", "search_terms": "bánh quy", "page_size": 25},
        {"source": "off", "search_terms": "biscuit", "page_size": 40},
        {"source": "off", "search_terms": "chocolate candy", "page_size": 35},
        {"source": "off", "categories_tags_en": "biscuits", "page_size": 40},
        {"source": "off", "categories_tags_en": "chocolates", "page_size": 30},
    ],
    "do-an-nhanh": [
        {"source": "off", "search_terms": "snack chips", "page_size": 35},
        {"source": "off", "search_terms": "potato chips", "page_size": 30},
        {"source": "off", "categories_tags_en": "chips-and-fries", "page_size": 35},
        {"source": "off", "categories_tags_en": "salty-snacks", "page_size": 35},
        {"source": "dummy", "category": "groceries", "filter": "snack"},
    ],
    "gia-vi": [
        {"source": "off", "search_terms": "nước mắm", "page_size": 20},
        {"source": "off", "search_terms": "soy sauce", "page_size": 30},
        {"source": "off", "search_terms": "fish sauce", "page_size": 25},
        {"source": "off", "categories_tags_en": "sauces", "page_size": 40},
        {"source": "off", "categories_tags_en": "spices", "page_size": 30},
        {"source": "off", "search_terms": "mayonnaise ketchup", "page_size": 25},
    ],
    "do-ca-nhan": [
        {"source": "dummy", "category": "beauty"},
        {"source": "dummy", "category": "fragrances"},
        {"source": "dummy", "category": "skin-care"},
        {"source": "fakestore", "category": "men's clothing"},
        {"source": "fakestore", "category": "women's clothing"},
        {"source": "off", "search_terms": "toothpaste shampoo", "page_size": 30},
        {"source": "off", "categories_tags_en": "oral-hygiene", "page_size": 25},
    ],
    "do-gia-dung": [
        {"source": "dummy", "category": "home-decoration"},
        {"source": "dummy", "category": "kitchen-accessories"},
        {"source": "dummy", "category": "furniture"},
        {"source": "fakestore", "category": "electronics"},
        {"source": "off", "search_terms": "dishwashing detergent", "page_size": 25},
        {"source": "off", "categories_tags_en": "cleaning-products", "page_size": 30},
    ],
    "cafe-tra": [
        {"source": "off", "search_terms": "cà phê", "page_size": 30},
        {"source": "off", "search_terms": "coffee", "page_size": 40},
        {"source": "off", "search_terms": "trà xanh", "page_size": 20},
        {"source": "off", "categories_tags_en": "coffees", "page_size": 40},
        {"source": "off", "categories_tags_en": "teas", "page_size": 35},
        {"source": "off", "search_terms": "green tea", "page_size": 25},
    ],
}

UNIT_BY_CAT = {
    "do-uong": "lon",
    "sua": "hộp",
    "mi-goi": "gói",
    "banh-keo": "gói",
    "do-an-nhanh": "gói",
    "gia-vi": "chai",
    "do-ca-nhan": "cái",
    "do-gia-dung": "cái",
    "cafe-tra": "hộp",
}

PRICE_RANGE_VND = {
    "do-uong": (6_000, 35_000),
    "sua": (8_000, 55_000),
    "mi-goi": (3_500, 25_000),
    "banh-keo": (5_000, 80_000),
    "do-an-nhanh": (5_000, 45_000),
    "gia-vi": (10_000, 90_000),
    "do-ca-nhan": (25_000, 350_000),
    "do-gia-dung": (30_000, 1_500_000),
    "cafe-tra": (15_000, 250_000),
}


def http_get_json(url: str, timeout: int = 40) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8", errors="replace"))


def slugify(text: str) -> str:
    text = text.lower().strip()
    # vietnamese rough map
    repl = {
        "à": "a", "á": "a", "ả": "a", "ã": "a", "ạ": "a",
        "ă": "a", "ằ": "a", "ắ": "a", "ẳ": "a", "ẵ": "a", "ặ": "a",
        "â": "a", "ầ": "a", "ấ": "a", "ẩ": "a", "ẫ": "a", "ậ": "a",
        "è": "e", "é": "e", "ẻ": "e", "ẽ": "e", "ẹ": "e",
        "ê": "e", "ề": "e", "ế": "e", "ể": "e", "ễ": "e", "ệ": "e",
        "ì": "i", "í": "i", "ỉ": "i", "ĩ": "i", "ị": "i",
        "ò": "o", "ó": "o", "ỏ": "o", "õ": "o", "ọ": "o",
        "ô": "o", "ồ": "o", "ố": "o", "ổ": "o", "ỗ": "o", "ộ": "o",
        "ơ": "o", "ờ": "o", "ớ": "o", "ở": "o", "ỡ": "o", "ợ": "o",
        "ù": "u", "ú": "u", "ủ": "u", "ũ": "u", "ụ": "u",
        "ư": "u", "ừ": "u", "ứ": "u", "ử": "u", "ữ": "u", "ự": "u",
        "ỳ": "y", "ý": "y", "ỷ": "y", "ỹ": "y", "ỵ": "y",
        "đ": "d",
    }
    text = "".join(repl.get(ch, ch) for ch in text)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text[:80] or "sp"


def stable_hash(*parts: str) -> str:
    h = hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()
    return h[:10].upper()


def price_from_hash(cat: str, key: str) -> tuple[int, int | None, int]:
    lo, hi = PRICE_RANGE_VND[cat]
    h = int(hashlib.md5(key.encode()).hexdigest()[:8], 16)
    price = lo + (h % (hi - lo + 1))
    # round to 500
    price = int(round(price / 500.0) * 500)
    import_price = int(price * 0.72)
    sale = None
    if h % 5 == 0:
        sale = int(round(price * 0.9 / 500.0) * 500)
        if sale >= price:
            sale = price - 500 if price > 1000 else None
    return price, sale, import_price


def stock_from_hash(key: str) -> int:
    h = int(hashlib.md5(key.encode()).hexdigest()[8:12], 16)
    return 5 + (h % 200)


def clean_name(name: str) -> str:
    name = re.sub(r"\s+", " ", (name or "").strip())
    return name[:150]


def off_fetch(params: dict[str, Any]) -> list[dict]:
    q = {
        "json": "true",
        "page_size": str(params.get("page_size", 30)),
        "page": "1",
        "fields": "code,product_name,product_name_en,brands,image_front_url,image_url,"
                  "quantity,categories_tags,ingredients_text,nutriscore_grade,countries_tags",
    }
    if params.get("search_terms"):
        q["search_terms"] = params["search_terms"]
        q["search_simple"] = "1"
        q["action"] = "process"
    if params.get("categories_tags_en"):
        # use v2 search
        cat = params["categories_tags_en"]
        url = (
            "https://world.openfoodfacts.org/api/v2/search?"
            + urllib.parse.urlencode({
                "categories_tags_en": cat,
                "page_size": params.get("page_size", 30),
                "page": 1,
                "fields": "code,product_name,product_name_en,brands,image_front_url,image_url,"
                          "quantity,categories_tags,ingredients_text,nutriscore_grade",
            })
        )
        try:
            data = http_get_json(url)
            return data.get("products") or []
        except Exception as e:
            print(f"  OFF v2 fail {cat}: {e}")
            return []

    url = "https://world.openfoodfacts.org/cgi/search.pl?" + urllib.parse.urlencode(q)
    try:
        data = http_get_json(url)
        return data.get("products") or []
    except Exception as e:
        print(f"  OFF search fail {params}: {e}")
        return []


def map_off(prod: dict, cat_slug: str) -> dict | None:
    name = clean_name(prod.get("product_name") or prod.get("product_name_en") or "")
    if len(name) < 3:
        return None
    code = str(prod.get("code") or "")
    brand = (prod.get("brands") or "").split(",")[0].strip() or None
    image = prod.get("image_front_url") or prod.get("image_url")
    if not image:
        return None  # skip no image for "real" feel
    key = code or name
    price, sale, import_price = price_from_hash(cat_slug, key)
    tags = []
    for t in (prod.get("categories_tags") or [])[:6]:
        tags.append(str(t).replace("en:", "").replace("-", " ")[:40])
    if brand:
        tags.append(brand.lower())
    sku = f"OFF-{stable_hash(cat_slug, key)}"
    slug = f"{slugify(name)}-{stable_hash(key)[:6].lower()}"
    desc = (prod.get("ingredients_text") or "").strip()
    if len(desc) > 500:
        desc = desc[:500] + "…"
    unit = UNIT_BY_CAT[cat_slug]
    qty = (prod.get("quantity") or "").lower()
    if "ml" in qty or "l" == qty[-1:] if qty else False:
        unit = "chai" if cat_slug in ("do-uong", "gia-vi") else unit
    if "g" in qty and cat_slug in ("mi-goi", "banh-keo", "do-an-nhanh"):
        unit = "gói"

    return {
        "source": "openfoodfacts",
        "sourceId": code or key,
        "categorySlug": cat_slug,
        "sku": sku,
        "slug": slug,
        "name": name,
        "brand": brand,
        "unit": unit,
        "price": price,
        "salePrice": sale,
        "importPrice": import_price,
        "stock": stock_from_hash(key),
        "minStock": 5,
        "maxStock": 300,
        "imageUrl": image,
        "description": desc or None,
        "shortDescription": (desc[:120] + "…") if desc and len(desc) > 120 else (desc or None),
        "tags": list(dict.fromkeys(tags))[:12],
        "isFeatured": (int(hashlib.md5(key.encode()).hexdigest()[:2], 16) % 7 == 0),
        "attributes": {
            "nutriscore": prod.get("nutriscore_grade"),
            "barcode": code or None,
            "source": "openfoodfacts",
        },
        "barcode": code if code and code.isdigit() and 8 <= len(code) <= 14 else None,
    }


def dummy_fetch(category: str) -> list[dict]:
    url = f"https://dummyjson.com/products/category/{urllib.parse.quote(category)}?limit=50"
    try:
        data = http_get_json(url)
        return data.get("products") or []
    except Exception as e:
        print(f"  DummyJSON fail {category}: {e}")
        return []


def map_dummy(prod: dict, cat_slug: str, keyword_filter: str | None = None) -> dict | None:
    name = clean_name(prod.get("title") or "")
    if len(name) < 3:
        return None
    if keyword_filter:
        blob = f"{name} {prod.get('description','')}".lower()
        if keyword_filter == "drink" and not any(k in blob for k in ["juice", "drink", "water", "milk", "coffee", "tea", "soda"]):
            # still accept groceries generically for do-uong only if soft
            if cat_slug == "do-uong" and "food" in blob:
                return None
        if keyword_filter == "snack" and not any(k in blob for k in ["chip", "snack", "cookie", "biscuit", "candy", "chocolate"]):
            pass  # keep groceries anyway for volume
    brand = None
    image = None
    imgs = prod.get("images") or []
    if imgs:
        image = imgs[0]
    image = image or prod.get("thumbnail")
    if not image:
        return None
    key = f"dummy-{prod.get('id')}"
    # convert USD-ish price to VND-ish scale for minimart
    usd = float(prod.get("price") or 10)
    if cat_slug in ("do-ca-nhan", "do-gia-dung"):
        price = int(round(usd * 24_000 / 1000) * 1000)  # rough
        price = max(PRICE_RANGE_VND[cat_slug][0], min(PRICE_RANGE_VND[cat_slug][1], price))
    else:
        price, _, _ = price_from_hash(cat_slug, key)
    sale = None
    disc = prod.get("discountPercentage") or 0
    if disc and disc > 5:
        sale = int(round(price * (1 - float(disc) / 100) / 500) * 500)
        if sale >= price:
            sale = None
    import_price = int(price * 0.7)
    tags = [str(t) for t in (prod.get("tags") or [])][:8]
    tags.append(str(prod.get("category") or ""))
    return {
        "source": "dummyjson",
        "sourceId": str(prod.get("id")),
        "categorySlug": cat_slug,
        "sku": f"DJ-{stable_hash(cat_slug, key)}",
        "slug": f"{slugify(name)}-{stable_hash(key)[:6].lower()}",
        "name": name,
        "brand": brand,
        "unit": UNIT_BY_CAT[cat_slug],
        "price": price,
        "salePrice": sale,
        "importPrice": import_price,
        "stock": int(prod.get("stock") or stock_from_hash(key)),
        "minStock": 5,
        "maxStock": 300,
        "imageUrl": image,
        "description": (prod.get("description") or None),
        "shortDescription": ((prod.get("description") or "")[:120] or None),
        "tags": [t for t in tags if t][:12],
        "isFeatured": float(prod.get("rating") or 0) >= 4.5,
        "attributes": {
            "rating": prod.get("rating"),
            "source": "dummyjson",
            "category_raw": prod.get("category"),
        },
        "barcode": None,
    }


def fakestore_fetch(category: str) -> list[dict]:
    url = f"https://fakestoreapi.com/products/category/{urllib.parse.quote(category)}"
    try:
        return http_get_json(url) or []
    except Exception as e:
        print(f"  FakeStore fail {category}: {e}")
        return []


def map_fakestore(prod: dict, cat_slug: str) -> dict | None:
    name = clean_name(prod.get("title") or "")
    if len(name) < 3:
        return None
    image = prod.get("image")
    if not image:
        return None
    key = f"fs-{prod.get('id')}"
    usd = float(prod.get("price") or 20)
    price = int(round(usd * 24_000 / 1000) * 1000)
    lo, hi = PRICE_RANGE_VND[cat_slug]
    price = max(lo, min(hi, price))
    import_price = int(price * 0.68)
    rating = (prod.get("rating") or {}).get("rate")
    return {
        "source": "fakestore",
        "sourceId": str(prod.get("id")),
        "categorySlug": cat_slug,
        "sku": f"FS-{stable_hash(cat_slug, key)}",
        "slug": f"{slugify(name)}-{stable_hash(key)[:6].lower()}",
        "name": name[:150],
        "brand": None,
        "unit": UNIT_BY_CAT[cat_slug],
        "price": price,
        "salePrice": None,
        "importPrice": import_price,
        "stock": stock_from_hash(key),
        "minStock": 3,
        "maxStock": 150,
        "imageUrl": image,
        "description": prod.get("description"),
        "shortDescription": ((prod.get("description") or "")[:120] or None),
        "tags": [str(prod.get("category") or "")],
        "isFeatured": float(rating or 0) >= 4.2,
        "attributes": {
            "rating": rating,
            "source": "fakestore",
            "category_raw": prod.get("category"),
        },
        "barcode": None,
    }


def crawl_all() -> list[dict]:
    by_cat: dict[str, list[dict]] = {k: [] for k in CATEGORY_QUERIES}
    seen_names: set[str] = set()
    seen_sku: set[str] = set()

    def accept(item: dict | None, cat: str) -> None:
        if not item:
            return
        name_key = item["name"].lower()
        if name_key in seen_names:
            return
        if item["sku"] in seen_sku:
            return
        if len(by_cat[cat]) >= PER_CATEGORY_TARGET:
            return
        seen_names.add(name_key)
        seen_sku.add(item["sku"])
        by_cat[cat].append(item)

    for cat, queries in CATEGORY_QUERIES.items():
        print(f"\n=== Category: {cat} ===")
        for q in queries:
            if len(by_cat[cat]) >= PER_CATEGORY_TARGET:
                break
            src = q["source"]
            print(f"  query {src}: { {k:v for k,v in q.items() if k!='source'} }")
            try:
                if src == "off":
                    products = off_fetch(q)
                    for p in products:
                        accept(map_off(p, cat), cat)
                    time.sleep(0.6)  # be polite to OFF
                elif src == "dummy":
                    products = dummy_fetch(q["category"])
                    kw = q.get("filter")
                    for p in products:
                        accept(map_dummy(p, cat, kw), cat)
                    time.sleep(0.2)
                elif src == "fakestore":
                    products = fakestore_fetch(q["category"])
                    for p in products:
                        accept(map_fakestore(p, cat), cat)
                    time.sleep(0.2)
            except Exception as e:
                print(f"  ERROR {src}: {e}")
            print(f"  → {cat}: {len(by_cat[cat])} items")

        # fill remaining from broader OFF search if short
        if len(by_cat[cat]) < PER_CATEGORY_TARGET:
            fallback_term = {
                "do-uong": "beverage",
                "sua": "dairy milk",
                "mi-goi": "noodles",
                "banh-keo": "cookies",
                "do-an-nhanh": "snacks",
                "gia-vi": "condiment",
                "do-ca-nhan": "soap",
                "do-gia-dung": "cleaner",
                "cafe-tra": "tea coffee",
            }[cat]
            print(f"  fallback OFF: {fallback_term}")
            products = off_fetch({"search_terms": fallback_term, "page_size": 50})
            for p in products:
                accept(map_off(p, cat), cat)
            time.sleep(0.5)
            print(f"  → {cat}: {len(by_cat[cat])} items")

    all_items: list[dict] = []
    for cat, items in by_cat.items():
        all_items.extend(items)
    return all_items, by_cat


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    items, by_cat = crawl_all()
    summary = {cat: len(v) for cat, v in by_cat.items()}
    payload = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total": len(items),
        "byCategory": summary,
        "sources": sorted({i["source"] for i in items}),
        "products": items,
    }
    OUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\n========== SUMMARY ==========")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"TOTAL: {len(items)}")
    print(f"WROTE: {OUT_FILE}")


if __name__ == "__main__":
    main()
