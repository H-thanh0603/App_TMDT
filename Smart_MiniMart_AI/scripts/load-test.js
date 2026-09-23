import http from 'k6/http';
import { check, sleep } from 'k6';

// Q114: load test kịch bản launch — login → list → detail → cart → create-order.
// Chạy: k6 run -e BASE_URL=http://localhost:4000/api/v1 scripts/load-test.js
// Ngưỡng: p95 < 800ms, error < 1% (API + Neon free, chưa Redis).
// NOTE: mỗi VU login 1 lần duy nhất ở setup (token tái sử dụng) — tránh cấn
// throttle auth 10/phút/email khi đo tải endpoint public (không đo khả năng chịu brute-force ở đây).
// Q114 baseline (local, API+PG cùng máy, 2026-09-23): 2VU/10iter → p95 ~7ms, 0% fail.
// 20VU/3.5phút → ~83% 429 DO throttle 100 req/phút/user (k6 dùng chung 1 token ở
// setup). Đây là hành vi ĐÚNG (chặn abuse), không phải bug perf. Muốn đo tải thật:
// THROTTLE_LIMIT=10000 khi chạy k6, hoặc mỗi VU 1 user riêng.
export const options = {
  stages: [
    { duration: '1m', target: 20 },  // ramp lên 20 VU
    { duration: '2m', target: 20 },  // giữ tải launch
    { duration: '30s', target: 0 },  // hạ tải
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:4000/api/v1';
const EMAIL = __ENV.SMOKE_EMAIL || 'customer@minimart.vn';
const PASS = __ENV.SMOKE_PASSWORD || 'Test1234';

// k6: setup() chạy 1 lần cho TẤT CẢ VU (không phải mỗi VU) → mọi VU dùng chung
// 1 token. Muốn mỗi VU token riêng: login trong default() với email VU (VU>=2
// cần user riêng, hoặc chấp nhận chung token vì throttle nay theo email).
export function setup() {
  const r = http.post(`${BASE}/auth/login`, JSON.stringify({ email: EMAIL, password: PASS }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(r, { 'setup login 200': (x) => x.status === 200 });
  const body = r.json();
  return { token: body.data.accessToken, pid: null };
}

export default function (data) {
  const H = { headers: { Authorization: `Bearer ${data.token}` } };
  let r = http.get(`${BASE}/products?limit=20`, H);
  check(r, { 'products 200': (x) => x.status === 200, 'products p95': (x) => x.timings.duration < 800 });
  let pid = null;
  try { pid = r.json().data.items[0].id; } catch (e) { /* empty catalog */ }
  if (pid) {
    r = http.get(`${BASE}/products/${pid}`, H);
    check(r, { 'detail 200': (x) => x.status === 200 });
    r = http.post(`${BASE}/cart/items`, JSON.stringify({ productId: pid, quantity: 1 }),
      { headers: { ...H.headers, 'Content-Type': 'application/json' } });
    check(r, { 'cart 200': (x) => x.status === 200 || x.status === 201 });
  }
  r = http.get(`${BASE}/orders/mine?limit=5`, H);
  check(r, { 'orders 200': (x) => x.status === 200 });
  sleep(1);
}
