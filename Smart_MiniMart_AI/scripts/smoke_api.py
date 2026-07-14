#!/usr/bin/env python3
"""Smoke API: auth → cart → order → staff status. Exit 1 if any fail."""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4000/api/v1"
PASS = FAIL = 0


def req(method: str, path: str, token: str | None = None, body: dict | None = None):
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        data = json.dumps(body).encode()
    r = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            payload = json.loads(raw) if raw else {}
        except Exception:
            payload = {"raw": raw}
        return e.code, payload


def check(name: str, code: int, expect):
    global PASS, FAIL
    ok = code in expect if isinstance(expect, (set, list, tuple)) else code == expect
    if ok:
        print(f"OK  [{code}] {name}")
        PASS += 1
    else:
        print(f"FAIL [{code}!={expect}] {name}")
        FAIL += 1


def main():
    print(f"=== Smoke API @ {BASE} ===")
    code, _ = req("GET", "/health")
    check("GET /health", code, 200)

    code, login = req("POST", "/auth/login", body={"email": "customer@minimart.vn", "password": "123456"})
    check("POST /auth/login customer", code, 200)
    ct = (login.get("data") or {}).get("accessToken")
    if not ct:
        print("No customer token"); sys.exit(1)

    code, staff_login = req("POST", "/auth/login", body={"email": "staff@minimart.vn", "password": "123456"})
    check("POST /auth/login staff", code, 200)
    st = (staff_login.get("data") or {}).get("accessToken")

    code, prods = req("GET", "/products?limit=20&isActive=true")
    check("GET /products", code, 200)
    pitems = (prods.get("data") or {}).get("items", [])
    pid = pitems[0].get("id") if pitems else None
    if not pid:
        print("No product id found"); sys.exit(1)

    code, _ = req("GET", "/categories")
    check("GET /categories", code, 200)

    code, addrs = req("GET", "/users/me/addresses", token=ct)
    check("GET /users/me/addresses", code, 200)
    items = (addrs.get("data") or []) if isinstance(addrs.get("data"), list) else []
    if not items:
        code, created = req("POST", "/users/me/addresses", token=ct, body={
            "recipient": "Smoke Test", "phone": "0909999888",
            "line1": "1 Test St", "ward": "1", "district": "1", "city": "HCM", "isDefault": True,
        })
        check("POST /users/me/addresses", code, 200)
        addr = (created.get("data") or {}).get("id")
    else:
        addr = items[0]["id"]

    code, cart = req("POST", "/cart/items", token=ct, body={"productId": pid, "quantity": 1})
    check("POST /cart/items", code, (200, 201))
    if code not in (200, 201):
        print("  cart add resp:", cart)
    code, _ = req("GET", "/cart", token=ct)
    check("GET /cart", code, 200)

    code, order = req("POST", "/orders", token=ct, body={
        "paymentMethod": "COD", "addressId": addr, "note": "smoke-test",
    })
    check("POST /orders COD", code, (200, 201))
    oid = (order.get("data") or {}).get("id")
    onum = (order.get("data") or {}).get("orderNumber")
    print(f"    order={onum} id={oid}")

    code, _ = req("GET", "/orders/mine", token=ct)
    check("GET /orders/mine", code, 200)
    code, _ = req("GET", "/orders", token=st)
    check("GET /orders (staff)", code, 200)

    if oid:
        code, _ = req("PATCH", f"/orders/{oid}/status", token=st, body={"status": "CONFIRMED"})
        check("PATCH /orders/:id/status CONFIRMED", code, (200, 201))

    code, _ = req("POST", "/ai/search", body={"query": "sua tuoi duoi 30k"})
    check("POST /ai/search", code, (200, 201))

    code, _ = req("GET", "/cart")
    check("GET /cart no-auth (expect 401)", code, 401)

    print(f"=== RESULT: {PASS} passed, {FAIL} failed ===")
    # show rate-limit headers via health
    r = urllib.request.Request(BASE + "/health")
    with urllib.request.urlopen(r, timeout=15) as resp:
        print("Throttler headers:",
              "Limit=", resp.headers.get("X-RateLimit-Limit"),
              "Remaining=", resp.headers.get("X-RateLimit-Remaining"))
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
