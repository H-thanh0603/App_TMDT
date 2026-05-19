"""Parser regex để chuyển raw OCR text thành structured items.
Dùng khi LLM không khả dụng. Backend sẽ ưu tiên LLM nếu có."""
import re
from datetime import datetime
from typing import Any


def parse_receipt_text(raw_text: str) -> dict[str, Any]:
    lines = [l.strip() for l in raw_text.split("\n") if l.strip()]

    supplier = _extract_supplier(lines)
    import_date = _extract_import_date(raw_text)
    items = _extract_items(lines)

    return {
        "supplierName": supplier,
        "importDate": import_date,
        "items": items,
    }


def _extract_supplier(lines: list[str]) -> str | None:
    for line in lines:
        m = re.search(r"(?:nhà cung cấp|supplier|nhà phân phối)\s*[:\-]?\s*(.+)", line, re.I)
        if m:
            return m.group(1).strip()
    return None


def _extract_import_date(text: str) -> str | None:
    patterns = [
        (r"(\d{1,2})/(\d{1,2})/(\d{4})", "%d/%m/%Y"),
        (r"(\d{4})-(\d{1,2})-(\d{1,2})", "%Y-%m-%d"),
    ]
    for pat, fmt in patterns:
        m = re.search(pat, text)
        if m:
            try:
                if fmt == "%d/%m/%Y":
                    d = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)))
                else:
                    d = datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
                return d.strftime("%Y-%m-%d")
            except ValueError:
                continue
    return None


def _extract_items(lines: list[str]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    # Pattern: STT  TenSP  Dvt  SL  Donia  HSD
    item_pattern = re.compile(
        r"^\d+\s+(?P<name>.+?)\s+(?P<unit>hộp|gói|chai|lon|kg|cái|cây|bịch|hũ|tuýp|cuộn)"
        r"\s+(?P<qty>\d+)\s+(?P<price>[\d,\.]+)\s+(?P<exp>\d{1,2}/\d{1,2}/\d{4})?",
        re.I,
    )
    for line in lines:
        m = item_pattern.search(line)
        if not m:
            continue
        try:
            qty = int(m.group("qty"))
            price = int(m.group("price").replace(",", "").replace(".", ""))
            exp_raw = m.group("exp")
            exp = None
            if exp_raw:
                d, mo, y = exp_raw.split("/")
                exp = f"{y}-{int(mo):02d}-{int(d):02d}"
            items.append({
                "rawProductName": m.group("name").strip(),
                "productName": m.group("name").strip(),
                "unit": m.group("unit").lower(),
                "quantity": qty,
                "unitPrice": price,
                "expiryDate": exp,
                "confidence": 0.7,
            })
        except (ValueError, AttributeError):
            continue
    return items
