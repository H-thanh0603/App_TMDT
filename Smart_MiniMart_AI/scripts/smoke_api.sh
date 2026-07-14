#!/usr/bin/env bash
# Smoke test API: auth → products → cart → order → staff status
# Usage: bash scripts/smoke_api.sh [BASE_URL]
set -euo pipefail

BASE="${1:-http://localhost:4000/api/v1}"
PASS=0
FAIL=0

green() { printf '\033[32m%s\033[0m\n' "$*"; }
red() { printf '\033[31m%s\033[0m\n' "$*"; }

check() {
  local name="$1"
  local code="$2"
  local expect="$3"
  if [[ "$code" == "$expect" ]]; then
    green "OK  [$code] $name"
    PASS=$((PASS + 1))
  else
    red "FAIL [$code!=$expect] $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Smoke API @ $BASE ==="

# 1 Health
code=$(curl -s -o /tmp/sm_health.json -w "%{http_code}" "$BASE/health")
check "GET /health" "$code" "200"

# 2 Login customer
code=$(curl -s -o /tmp/sm_login.json -w "%{http_code}" -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"customer@minimart.vn","password":"123456"}')
check "POST /auth/login customer" "$code" "200"
CT=$(python -c "import json;print(json.load(open('/tmp/sm_login.json',encoding='utf-8'))['data']['accessToken'])" 2>/dev/null || true)
if [[ -z "${CT:-}" ]]; then red "No customer token"; exit 1; fi

# 3 Login staff
code=$(curl -s -o /tmp/sm_staff.json -w "%{http_code}" -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"staff@minimart.vn","password":"123456"}')
check "POST /auth/login staff" "$code" "200"
ST=$(python -c "import json;print(json.load(open('/tmp/sm_staff.json',encoding='utf-8'))['data']['accessToken'])")

# 4 Products
code=$(curl -s -o /tmp/sm_prod.json -w "%{http_code}" "$BASE/products?limit=5")
check "GET /products" "$code" "200"
PID=$(python -c "import json;d=json.load(open('/tmp/sm_prod.json',encoding='utf-8'));print(d['data']['items'][0]['id'])")

# 5 Categories
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/categories")
check "GET /categories" "$code" "200"

# 6 Ensure address
code=$(curl -s -o /tmp/sm_addr.json -w "%{http_code}" "$BASE/users/me/addresses" -H "Authorization: Bearer $CT")
check "GET /users/me/addresses" "$code" "200"
ADDR=$(python -c "import json;d=json.load(open('/tmp/sm_addr.json',encoding='utf-8'))['data'];print(d[0]['id'] if d else '')" 2>/dev/null || true)
if [[ -z "$ADDR" ]]; then
  code=$(curl -s -o /tmp/sm_addr.json -w "%{http_code}" -X POST "$BASE/users/me/addresses" \
    -H "Authorization: Bearer $CT" -H 'Content-Type: application/json' \
    -d '{"recipient":"Smoke Test","phone":"0909999888","line1":"1 Test St","ward":"1","district":"1","city":"HCM","isDefault":true}')
  check "POST /users/me/addresses" "$code" "200"
  ADDR=$(python -c "import json;print(json.load(open('/tmp/sm_addr.json',encoding='utf-8'))['data']['id'])")
fi

# 7 Add to cart
code=$(curl -s -o /tmp/sm_cart.json -w "%{http_code}" -X POST "$BASE/cart/items" \
  -H "Authorization: Bearer $CT" -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$PID\",\"quantity\":1}")
check "POST /cart/items" "$code" "200"

# 8 Get cart
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/cart" -H "Authorization: Bearer $CT")
check "GET /cart" "$code" "200"

# 9 Create order COD
code=$(curl -s -o /tmp/sm_order.json -w "%{http_code}" -X POST "$BASE/orders" \
  -H "Authorization: Bearer $CT" -H 'Content-Type: application/json' \
  -d "{\"paymentMethod\":\"COD\",\"addressId\":\"$ADDR\",\"note\":\"smoke-test\"}")
check "POST /orders COD" "$code" "200"
OID=$(python -c "import json;print(json.load(open('/tmp/sm_order.json',encoding='utf-8'))['data']['id'])" 2>/dev/null || true)
ONUM=$(python -c "import json;print(json.load(open('/tmp/sm_order.json',encoding='utf-8'))['data'].get('orderNumber',''))" 2>/dev/null || true)
echo "    order=$ONUM id=$OID"

# 10 My orders
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/orders/mine" -H "Authorization: Bearer $CT")
check "GET /orders/mine" "$code" "200"

# 11 Staff list orders
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/orders" -H "Authorization: Bearer $ST")
check "GET /orders (staff)" "$code" "200"

# 12 Staff update status PENDING -> CONFIRMED
if [[ -n "${OID:-}" ]]; then
  code=$(curl -s -o /tmp/sm_st.json -w "%{http_code}" -X PATCH "$BASE/orders/$OID/status" \
    -H "Authorization: Bearer $ST" -H 'Content-Type: application/json' \
    -d '{"status":"CONFIRMED"}')
  check "PATCH /orders/:id/status CONFIRMED" "$code" "200"
fi

# 13 AI search (public)
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/ai/search" \
  -H 'Content-Type: application/json' -d '{"query":"sua tuoi duoi 30k"}')
check "POST /ai/search" "$code" "200"

# 14 Unauthorized cart
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/cart")
check "GET /cart no-auth (expect 401)" "$code" "401"

echo "=== RESULT: $PASS passed, $FAIL failed ==="
if [[ "$FAIL" -gt 0 ]]; then exit 1; fi
