#!/usr/bin/env python3
"""
Vietnam-only product crawl — sequential + checkpoint (OFF 503-friendly).
Saves progress after each request to scripts/data/products_vn.json
"""
from __future__ import annotations

import hashlib
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

OUT = Path(__file__).resolve().parent / "data" / "products_vn.json"
CKPT = Path(__file__).resolve().parent / "data" / "products_vn.checkpoint.json"
UA = "SmartMiniMartAI-VN/1.3 (HCMUAF thesis)"

PER_CAT = 36

BRANDS = [
    "Vinamilk", "TH True Milk", "Dutch Lady", "Fami", "Vinasoy", "Yakult",
    "Hảo Hảo", "Hao Hao", "Omachi", "Vifon", "Kokomi", "3 Miền", "Acecook",
    "Chin-Su", "Nam Ngư", "Maggi", "Knorr", "Masan",
    "Kinh Đô", "Kinh Do", "Orion", "Bibica", "Oishi", "Poca",
    "Coca-Cola", "Pepsi", "Lavie", "Aquafina", "Sting", "Number 1", "C2", "Revive",
    "Nescafe", "G7", "Trung Nguyên", "Trung Nguyen", "Lipton",
    "Colgate", "P/S", "Sunsilk", "Clear", "Dove", "Lifebuoy", "Omo", "Sunlight", "Comfort",
    "Nutifood", "Anlene", "Meiji", "Samyang", "Nongshim", "Indomie", "Vietcoco",
    "One One", "Slide", "Cosy", "Custas", "Choco-pie",
]

CAT_RULES = [
    ("cafe-tra", ["coffee", "tea", "cà phê", "trà", "nescafe", "g7", "lipton", "trung nguyên", "trung nguyen"]),
    ("sua", ["milk", "sữa", "sua", "yogurt", "yaourt", "vinamilk", "dutch lady", "fami", "vinasoy", "yakult", "anlene", "nutifood", "meiji"]),
    ("mi-goi", ["noodle", "mì", "mi ", "ramen", "phở", "hao hao", "hảo hảo", "omachi", "vifon", "indomie", "samyang", "nongshim", "kokomi", "3 miền", "3 mien", "acecook"]),
    ("do-uong", ["cola", "pepsi", "sting", "revive", "water", "nước", "nuoc", "juice", "lavie", "aquafina", "number 1", "c2", "soft-drink", "beverage", "soda", "drink"]),
    ("banh-keo", ["biscuit", "cookie", "chocolate", "candy", "kẹo", "bánh", "banh", "orion", "kinh do", "kinh đô", "bibica", "choco", "custas", "cosy", "slide"]),
    ("do-an-nhanh", ["chip", "snack", "oishi", "poca", "lay", "bim", "one one", "cracker"]),
    ("gia-vi", ["sauce", "mắm", "soy", "tương", "chin-su", "maggi", "knorr", "nam ngư", "nam ngu", "masan", "vietcoco", "dầu", "oil", "condiment"]),
    ("do-ca-nhan", ["shampoo", "toothpaste", "soap", "sunsilk", "clear", "dove", "colgate", "lifebuoy", "p/s", "oral", "body"]),
    ("do-gia-dung", ["detergent", "omo", "sunlight", "comfort", "cleaning", "laundry", "dish"]),
]

PRICE = {
    "do-uong": (6000, 35000), "sua": (8000, 55000), "mi-goi": (3500, 28000),
    "banh-keo": (5000, 80000), "do-an-nhanh": (5000, 45000), "gia-vi": (10000, 90000),
    "do-ca-nhan": (15000, 250000), "do-gia-dung": (15000, 200000), "cafe-tra": (12000, 250000),
}
UNIT = {
    "do-uong": "lon", "sua": "hộp", "mi-goi": "gói", "banh-keo": "gói",
    "do-an-nhanh": "gói", "gia-vi": "chai", "do-ca-nhan": "cái",
    "do-gia-dung": "chai", "cafe-tra": "hộp",
}


def http_json(url: str, retries: int = 5) -> Any:
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=40) as r:
                return json.loads(r.read().decode("utf-8", errors="replace"))
        except Exception as e:
            last = e
            wait = 2 ** i
            print(f"    retry {i+1}/{retries} after {wait}s ({e})")
            time.sleep(wait)
    raise RuntimeError(str(last))


def slugify(text: str) -> str:
    m = {
        "à": "a", "á": "a", "ả": "a", "ã": "a", "ạ": "a", "ă": "a", "ằ": "a", "ắ": "a", "ẳ": "a", "ẵ": "a", "ặ": "a",
        "â": "a", "ầ": "a", "ấ": "a", "ẩ": "a", "ẫ": "a", "ậ": "a", "è": "e", "é": "e", "ẻ": "e", "ẽ": "e", "ẹ": "e",
        "ê": "e", "ề": "e", "ế": "e", "ể": "e", "ễ": "e", "ệ": "e", "ì": "i", "í": "i", "ỉ": "i", "ĩ": "i", "ị": "i",
        "ò": "o", "ó": "o", "ỏ": "o", "õ": "o", "ọ": "o", "ô": "o", "ồ": "o", "ố": "o", "ổ": "o", "ỗ": "o", "ộ": "o",
        "ơ": "o", "ờ": "o", "ớ": "o", "ở": "o", "ỡ": "o", "ợ": "o", "ù": "u", "ú": "u", "ủ": "u", "ũ": "u", "ụ": "u",
        "ư": "u", "ừ": "u", "ứ": "u", "ử": "u", "ữ": "u", "ự": "u", "ỳ": "y", "ý": "y", "ỷ": "y", "ỹ": "y", "ỵ": "y", "đ": "d",
    }
    t = "".join(m.get(c, c) for c in text.lower())
    t = re.sub(r"[^a-z0-9]+", "-", t)
    return re.sub(r"-+", "-", t).strip("-")[:80] or "sp"


def h10(*p: str) -> str:
    return hashlib.sha1("|".join(p).encode()).hexdigest()[:10].upper()


def is_vn(p: dict) -> bool:
    countries = " ".join(p.get("countries_tags") or []).lower()
    if "vietnam" in countries:
        return True
    blob = f"{p.get('brands') or ''} {p.get('product_name') or ''} {p.get('product_name_en') or ''}".lower()
    for b in BRANDS:
        if b.lower() in blob:
            return True
    name = (p.get("product_name") or "").lower()
    return bool(re.search(r"[ăâêôơưđáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵ]", name))


def guess_cat(p: dict) -> str | None:
    blob = " ".join([
        p.get("product_name") or "", p.get("product_name_en") or "",
        p.get("brands") or "", " ".join(p.get("categories_tags") or []),
    ]).lower()
    for cat, kws in CAT_RULES:
        if any(k in blob for k in kws):
            return cat
    tags = " ".join(p.get("categories_tags") or []).lower()
    for key, cat in [
        ("beverage", "do-uong"), ("drink", "do-uong"), ("dairy", "sua"), ("milk", "sua"),
        ("noodle", "mi-goi"), ("snack", "do-an-nhanh"), ("sauce", "gia-vi"),
        ("coffee", "cafe-tra"), ("tea", "cafe-tra"), ("biscuit", "banh-keo"),
        ("chocolate", "banh-keo"), ("candy", "banh-keo"),
    ]:
        if key in tags:
            return cat
    return None


def map_item(p: dict, cat: str) -> dict | None:
    name = re.sub(r"\s+", " ", (p.get("product_name") or p.get("product_name_en") or "").strip())
    if len(name) < 3:
        return None
    image = p.get("image_front_url") or p.get("image_url")
    if not image:
        return None
    code = str(p.get("code") or "")
    brand = (p.get("brands") or "").split(",")[0].strip() or None
    key = code or name
    lo, hi = PRICE[cat]
    n = int(hashlib.md5(key.encode()).hexdigest()[:8], 16)
    price = int(round((lo + n % (hi - lo + 1)) / 500) * 500)
    sale = int(round(price * 0.9 / 500) * 500) if n % 6 == 0 else None
    if sale and sale >= price:
        sale = None
    desc = (p.get("ingredients_text") or "").strip()
    if len(desc) > 500:
        desc = desc[:500] + "…"
    if not desc:
        desc = f"Sản phẩm lưu hành tại thị trường Việt Nam. Thương hiệu: {brand or 'N/A'}."
    tags = [str(t).replace("en:", "")[:40] for t in (p.get("categories_tags") or [])[:5]]
    tags += ["vietnam", "sold-in-vn"]
    if brand:
        tags.append(brand.lower())
    bc = code if code.isdigit() and 8 <= len(code) <= 14 else None
    return {
        "source": "openfoodfacts-vn",
        "sourceId": code or key,
        "categorySlug": cat,
        "sku": f"VN-{h10(cat, key)}",
        "slug": f"{slugify(name)}-{h10(key)[:6].lower()}",
        "name": name[:150],
        "brand": brand,
        "unit": UNIT[cat],
        "price": price,
        "salePrice": sale,
        "importPrice": int(price * 0.72),
        "stock": 10 + int(hashlib.md5(key.encode()).hexdigest()[8:12], 16) % 180,
        "minStock": 5,
        "maxStock": 300,
        "imageUrl": image,
        "description": desc,
        "shortDescription": desc[:120] + ("…" if len(desc) > 120 else ""),
        "tags": list(dict.fromkeys(t for t in tags if t))[:12],
        "isFeatured": n % 8 == 0,
        "attributes": {
            "source": "openfoodfacts",
            "market": "vietnam",
            "countries": p.get("countries_tags"),
            "barcode": code or None,
        },
        "barcode": bc,
    }


def save(by_cat: dict) -> None:
    items = [x for arr in by_cat.values() for x in arr]
    payload = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "market": "vietnam",
        "total": len(items),
        "byCategory": {k: len(v) for k, v in by_cat.items()},
        "sources": ["openfoodfacts"],
        "filter": "countries:vietnam OR VN brands",
        "products": items,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    CKPT.write_text(json.dumps({"byCategory": payload["byCategory"], "total": payload["total"]}, ensure_ascii=False), encoding="utf-8")


def load_existing() -> tuple[dict[str, list], set[str]]:
    by_cat = {c: [] for c, _ in CAT_RULES}
    seen: set[str] = set()
    if OUT.exists():
        try:
            data = json.loads(OUT.read_text(encoding="utf-8"))
            for p in data.get("products") or []:
                cat = p.get("categorySlug")
                if cat in by_cat:
                    by_cat[cat].append(p)
                    seen.add(str(p.get("sourceId") or p.get("sku")))
            print(f"Resumed {sum(len(v) for v in by_cat.values())} from existing file")
        except Exception as e:
            print("resume fail", e)
    return by_cat, seen


def fetch_country_page(page: int) -> list[dict]:
    url = "https://world.openfoodfacts.org/cgi/search.pl?" + urllib.parse.urlencode({
        "action": "process", "json": "true", "page": page, "page_size": 40,
        "tagtype_0": "countries", "tag_contains_0": "contains", "tag_0": "vietnam",
        "fields": "code,product_name,product_name_en,brands,image_front_url,image_url,"
                  "categories_tags,ingredients_text,countries_tags",
    })
    return http_json(url).get("products") or []


def fetch_brand(brand: str) -> list[dict]:
    url = "https://world.openfoodfacts.org/cgi/search.pl?" + urllib.parse.urlencode({
        "action": "process", "json": "true", "page": 1, "page_size": 30,
        "search_terms": brand, "search_simple": 1,
        "fields": "code,product_name,product_name_en,brands,image_front_url,image_url,"
                  "categories_tags,ingredients_text,countries_tags",
    })
    return http_json(url).get("products") or []


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    by_cat, seen = load_existing()

    def accept(raw: dict) -> bool:
        if not is_vn(raw):
            return False
        cat = guess_cat(raw)
        if not cat or len(by_cat[cat]) >= PER_CAT:
            return False
        code = str(raw.get("code") or "")
        name = (raw.get("product_name") or raw.get("product_name_en") or "").strip().lower()
        key = code or name
        if not key or key in seen:
            return False
        item = map_item(raw, cat)
        if not item:
            return False
        seen.add(key)
        by_cat[cat].append(item)
        return True

    print("=== Pass1 brands (priority for VN shelf) ===")
    for i, brand in enumerate(BRANDS, 1):
        if all(len(v) >= PER_CAT for v in by_cat.values()):
            break
        try:
            prods = fetch_brand(brand)
            added = sum(1 for p in prods if accept(p))
            print(f"[{i}/{len(BRANDS)}] {brand}: +{added} | total {sum(len(v) for v in by_cat.values())} { {k:len(v) for k,v in by_cat.items()} }")
            save(by_cat)
        except Exception as e:
            print(f"[{i}] {brand} FAIL {e}")
        time.sleep(1.0)

    print("\n=== Pass2 countries=vietnam pages ===")
    for page in range(1, 16):
        if all(len(v) >= PER_CAT for v in by_cat.values()):
            break
        try:
            prods = fetch_country_page(page)
            added = sum(1 for p in prods if accept(p))
            print(f"page {page}: raw={len(prods)} +{added} | total {sum(len(v) for v in by_cat.values())}")
            save(by_cat)
            if not prods:
                break
        except Exception as e:
            print(f"page {page} FAIL {e}")
        time.sleep(1.2)

    save(by_cat)
    total = sum(len(v) for v in by_cat.values())
    print("\nDONE total=", total)
    print(json.dumps({k: len(v) for k, v in by_cat.items()}, ensure_ascii=False, indent=2))
    print("FILE", OUT)


if __name__ == "__main__":
    main()
