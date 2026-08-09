/**
 * Tải ảnh sản phẩm thật về backend/uploads/products/<sku>.jpg.
 *
 * Nguồn: Wikimedia Commons (tìm theo keyword) — ảnh sản phẩm/chủng loại đã duyệt.
 * download trực tiếp từ upload.wikimedia.org bị rate-limit 429 theo IP
 * → proxy qua images.weserv.nl (service render ảnh từ URL, không tính block IP local).
 *
 * Mỗi SKU: 1 keyword tìm trên Commons, lấy file đầu tiên tồn tại (thumb URL),
 * tải qua weserv. Nếu không có file nào → placeholder màu theo SKU (seed vẫn hiển thị).
 *
 * Run: npm run db:download-images
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Đường dẫn lưu ảnh tương đối = UPLOAD_DIR (mặc định ./uploads) từ .env */
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const outDir = path.isAbsolute(uploadDir) ? uploadDir : path.join(process.cwd(), uploadDir);
const imgDir = path.join(outDir, 'products');

/** SKU -> keyword tìm trên Wikimedia Commons (chủng loại, có ảnh duyệt sẵn) */
const KEYWORDS: Record<string, string> = {
  // ===== ĐỒ UỐNG =====
  'du-201': 'coca cola can',
  'du-202': 'pepsi can',
  'du-203': 'sprite can',
  'du-204': 'sting energy drink',
  'du-205': 'red bull can',
  'du-206': 'green tea bottle',
  'du-207': 'mineral water bottle',
  'du-208': 'beer can',
  // ===== SỮA =====
  'su-201': 'milk bottle',
  'su-202': 'milk carton',
  'su-203': 'condensed milk can',
  'su-204': 'chocolate milk drink',
  'su-205': 'yogurt cup',
  'su-206': 'drinking yogurt',
  // ===== MÌ GÓI =====
  'mi-201': 'instant noodles',
  'mi-202': 'instant noodles box',
  'mi-203': 'instant noodles bowl',
  'mi-204': 'vietnamese pho',
  'mi-205': 'shin ramyun',
  'mi-206': 'rice noodles',
  // ===== BÁNH KẸO =====
  'bk-201': 'oreo cookies',
  'bk-202': 'dark chocolate bar',
  'bk-203': 'butter biscuits',
  'bk-204': 'waffle cone',
  'bk-205': 'fruit gummy candy',
  'bk-206': 'mint candy',
  // ===== ĐỒ ĂN NHANH =====
  'an-201': 'potato chips',
  'an-202': 'sausage',
  'an-203': 'corn snack',
  'an-204': 'spring rolls',
  // ===== GIA VỊ =====
  'gv-201': 'fish sauce bottle',
  'gv-202': 'chicken bouillon cube',
  'gv-203': 'chili sauce',
  'gv-204': 'salt packet',
  'gv-205': 'vinegar bottle',
  'gv-206': 'satay sauce',
  // ===== ĐỒ CÁ NHÂN =====
  'cn-201': 'surgical face mask',
  'cn-202': 'toothpaste',
  'cn-203': 'toothbrush',
  'cn-204': 'body wash bottle',
  'cn-205': 'shampoo bottle',
  // ===== ĐỒ GIA DỤNG =====
  'gd-201': 'dishwashing liquid',
  'gd-202': 'laundry detergent',
  'gd-203': 'floor cleaner',
  'gd-204': 'trash bag',
  'gd-205': 'toilet cleaner',
  // ===== CÀ PHÊ & TRÀ =====
  'cp-201': 'coffee jar',
  'cp-202': 'instant coffee',
  'cp-203': 'black tea bags',
  'cp-204': 'matcha powder',
};

const UA = 'MiniMartSeed/1.0 (dev seed; contact admin@localhost)';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Commons API: tìm 1 ảnh real theo keyword. Retry khi 429 (rate-limit ngắn). */
async function findOnCommons(keyword: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query', format: 'json',
    generator: 'search', gsrnamespace: '6',
    gsrsearch: keyword, gsrlimit: '6',
    prop: 'imageinfo', iiprop: 'url',
  });
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { 'User-Agent': UA },
    });
    if (res.status === 429) {
      await sleep(3000 * (attempt + 1)); // 3s, 6s, 9s
      continue;
    }
    if (!res.ok) throw new Error(`Commons API HTTP ${res.status}`);
    const d = await res.json();
    for (const p of Object.values(d?.query?.pages ?? {})) {
      const ii = (p as any)?.imageinfo?.[0];
      // Dùng URL gốc (orig) — thumb 500px có thể chưa tạo (404), orig luôn tồn tại
      if (ii?.url) return ii.url;
    }
    return null;
  }
  throw new Error('Commons API 429 sau retry');
}

/** Tải qua Weserv proxy (bypass Wikimedia upload rate-limit IP). w=400 để resize nhỏ. */
async function downloadViaWeserv(url: string, dest: string): Promise<boolean> {
  const wes = 'https://images.weserv.nl/?url=' + url.replace(/^https?:\/\//, '') + '&w=400';
  const r = await fetch(wes, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 1000) throw new Error('file quá nhỏ');
  fs.writeFileSync(dest, buf);
  return true;
}

/** Placeholder màu + tên SKU nếu không tìm được ảnh (feed bền, không chết link) */
const PALETTE = ['2E86AB', 'C0392B', '1E8449', '884EA0', 'D35400', '16A085', '2C3E50', 'B03A2E'];

async function placeholder(sku: string, dest: string): Promise<void> {
  const color = PALETTE[([...sku].reduce((a, c) => a + c.charCodeAt(0), 0)) % PALETTE.length];
  const url = `https://placehold.co/400x400/${color}/FFFFFF.png?text=${sku.toUpperCase()}`;
  await downloadViaWeserv(url, dest); // throw nếu fail → coi như lỗi
}

async function main() {
  console.log('📥 Downloading product images →', imgDir);
  fs.mkdirSync(imgDir, { recursive: true });

  let real = 0, ph = 0, fail = 0;
  for (const [sku, keyword] of Object.entries(KEYWORDS)) {
    const dest = path.join(imgDir, `${sku}.jpg`);
    if (fs.existsSync(dest)) { real++; continue; } // đã có
    try {
      const found = await findOnCommons(keyword);
      if (!found) throw new Error('không tìm thấy ảnh');
      await downloadViaWeserv(found, dest);
      real++;
      console.log(`  ✓ ${sku} (${keyword})`);
    } catch (e: any) {
      try {
        await placeholder(sku, dest);
        ph++;
        console.warn(`  ↻ ${sku}: placeholder (${e?.message})`);
      } catch (e2: any) {
        fail++;
        console.warn(`  ✗ ${sku}: ${e2?.message}`);
      }
    }
    await sleep(2500); // lịch sự với Commons API (tránh rate-limit 429)
  }
  console.log(`✅ downloaded: real=${real}, placeholder=${ph}, fail=${fail}`);
}

main()
  .catch((e) => { console.error('❌ Download failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
