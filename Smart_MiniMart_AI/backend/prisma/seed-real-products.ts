/**
 * Seed 50 sản phẩm thật (tên/brand/giá VN thật) kèm ảnh local.
 *
 * Ảnh thật được tải về backend/uploads/products/<sku>.jpg bởi download-product-images.ts.
 * DB chỉ lưu path tương đối "/uploads/products/<sku>.jpg" (ServeStaticModule serve từ UPLOAD_DIR).
 *
 * Run (2 bước):
 *   1) npm run db:download-images   # tải ảnh về máy
 *   2) npm run db:seed-real         # upsert sản phẩm
 *
 * Upsert theo SKU: chạy lại an toàn, giữ nguyên dữ liệu phát sinh (giỏ, đơn, review).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedProduct {
  sku: string;
  name: string;
  brand: string;
  categorySlug: string;
  unit: string;
  price: number; // VND
  importPrice: number;
  salePrice?: number;
  stock: number;
  tags: string[];
  isFeatured?: boolean;
  description: string;
}

/** Ngày hết hạn: hôm nay + n ngày (ổn định khi chạy lại) */
function dateOffset(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

const PRODUCTS: SeedProduct[] = [
  // ========== ĐỒ UỐNG (do-uong) — 8 ==========
  { sku: 'DU-201', name: 'Coca-Cola lon 330ml', brand: 'Coca-Cola', categorySlug: 'do-uong', unit: 'lon',
    price: 10_000, importPrice: 8_000, stock: 120, tags: ['nước ngọt', 'có ga'],
    isFeatured: true, description: 'Nước ngọt có ga Coca-Cola lon 330ml, vị thanh mát quen thuộc.' },
  { sku: 'DU-202', name: 'Pepsi lon 330ml', brand: 'Pepsi', categorySlug: 'do-uong', unit: 'lon',
    price: 10_000, importPrice: 8_000, stock: 90, tags: ['nước ngọt', 'có ga'],
    description: 'Nước ngọt có ga Pepsi lon 330ml, vị ngọt đậm đà.' },
  { sku: 'DU-203', name: 'Sprite lon 330ml', brand: 'Sprite', categorySlug: 'do-uong', unit: 'lon',
    price: 10_000, importPrice: 8_000, stock: 80, tags: ['nước ngọt', 'chanh'],
    description: 'Nước ngọt có ga Sprite vị chanh, lon 330ml.' },
  { sku: 'DU-204', name: 'Sting vị dâu 320ml', brand: 'Sting', categorySlug: 'do-uong', unit: 'chai',
    price: 15_000, importPrice: 12_000, stock: 70, tags: ['tăng lực', 'có ga'],
    description: 'Nước tăng lực Sting vị dâu, chai 320ml.' },
  { sku: 'DU-205', name: 'Nước tăng lực Red Bull 250ml', brand: 'Red Bull', categorySlug: 'do-uong', unit: 'lon',
    price: 14_000, importPrice: 11_000, stock: 80, tags: ['tăng lực', 'có ga'],
    description: 'Nước tăng lực Red Bull lon 250ml, giúp tỉnh táo tức thì.' },
  { sku: 'DU-206', name: 'Trà xanh C2 không đường 700ml', brand: 'Tân Hiệp Phát', categorySlug: 'do-uong', unit: 'chai',
    price: 12_000, importPrice: 10_000, stock: 100, tags: ['trà xanh', 'không đường'],
    isFeatured: true, description: 'Trà xanh C2 không đường, chai 700ml, vị thanh mát.' },
  { sku: 'DU-207', name: 'Nước suối LaVie 500ml', brand: 'LaVie', categorySlug: 'do-uong', unit: 'chai',
    price: 8_000, importPrice: 6_500, stock: 150, tags: ['nước suối'],
    description: 'Nước tinh khiết LaVie, chai 500ml.' },
  { sku: 'DU-208', name: 'Bia Tiger lon 330ml', brand: 'Tiger', categorySlug: 'do-uong', unit: 'lon',
    price: 16_000, importPrice: 13_000, stock: 60, tags: ['bia'],
    description: 'Bia Tiger lon 330ml, hương vị lúa mạch đậm đà.' },

  // ====== SỮA (sua) — 6 ======
  { sku: 'SU-201', name: 'Sữa tươi tiệt trùng Vinamilk có đường 1 lít', brand: 'Vinamilk', categorySlug: 'sua', unit: 'hộp',
    price: 30_000, importPrice: 24_000, stock: 80, tags: ['sữa tươi', 'có đường'],
    isFeatured: true, description: 'Sữa tươi nguyên chất Vinamilk có đường, hộp giấy 1 lít.' },
  { sku: 'SU-202', name: 'Sữa tươi tiệt trùng Vinamilk không đường 1 lít', brand: 'Vinamilk', categorySlug: 'sua', unit: 'hộp',
    price: 30_000, importPrice: 24_000, stock: 80, tags: ['sữa tươi', 'không đường'],
    description: 'Sữa tươi nguyên chất Vinamilk không đường, hộp giấy 1 lít.' },
  { sku: 'SU-203', name: 'Sữa đặc Ông Thọ 380g', brand: 'Vinamilk', categorySlug: 'sua', unit: 'lon',
    price: 35_000, importPrice: 28_000, stock: 60, tags: ['sữa đặc'],
    description: 'Sữa đặc có đường Ông Thọ Vinamilk, lon 380g.' },
  { sku: 'SU-204', name: 'Sữa Milo bịch 180ml', brand: 'Nestlé', categorySlug: 'sua', unit: 'bịch',
    price: 9_000, importPrice: 7_000, stock: 100, tags: ['sữa malt', 'cacao'],
    description: 'Sữa Milo Nestlé hương vị cacao, bịch 180ml.' },
  { sku: 'SU-205', name: 'Sữa chua ăn Vinamilk 100g', brand: 'Vinamilk', categorySlug: 'sua', unit: 'hũ',
    price: 6_000, importPrice: 5_000, stock: 180, tags: ['sữa chua'],
    description: 'Sữa chua ăn Vinamilk vị dâu, hũ 100g.' },
  { sku: 'SU-206', name: 'Sữa chua uống Probi 100ml', brand: 'Vinamilk', categorySlug: 'sua', unit: 'chai',
    price: 8_000, importPrice: 6_500, stock: 90, tags: ['sữa chua', 'uống'],
    description: 'Sữa chua uống Probi Vinamilk giúp tiêu hóa tốt, chai 100g.' },

  // ====== MÌ GÓI (mi-goi) — 6 ======
  { sku: 'MI-201', name: 'Mì Hảo Hảo tôm chua cay 77g', brand: 'Acecook', categorySlug: 'mi-goi', unit: 'gói',
    price: 4_000, importPrice: 3_200, stock: 250, tags: ['mì gói', 'tôm chua cay'],
    isFeatured: true, description: 'Mì Hảo Hảo tôm chua cay, gói 77g, hương vị quen thuộc.' },
  { sku: 'MI-202', name: 'Mì Hảo Hảo tôm chua cay (thùng 30 gói)', brand: 'Acecook', categorySlug: 'mi-goi', unit: 'thùng',
    price: 118_000, importPrice: 95_000, salePrice: 99_000, stock: 40, tags: ['mì gói', 'tôm chua cay'],
    description: 'Thùng 30 gói mì Hảo Hảo tôm chua cay.' },
  { sku: 'MI-203', name: 'Mì Omachi sườn hầm 79g', brand: 'Acecook', categorySlug: 'mi-goi', unit: 'gói',
    price: 9_000, importPrice: 7_200, stock: 90, tags: ['mì gói', 'sườn hầm'],
    description: 'Mì Omachi vị sườn hầm đậm đà, gói 79g.' },
  { sku: 'MI-204', name: 'Phở ăn liền vị bò Việt Nam 65g', brand: 'Vifon', categorySlug: 'mi-goi', unit: 'gói',
    price: 6_000, importPrice: 5_000, stock: 120, tags: ['phở', 'ăn liền'],
    description: 'Phở ăn liền Vifon vị bò, gói 65g, tiện lợi.' },
  { sku: 'MI-205', name: 'Mì cay Shin Ramen 120g', brand: 'Nongshim', categorySlug: 'mi-goi', unit: 'gói',
    price: 17_000, importPrice: 14_000, stock: 50, tags: ['mì cay'],
    description: 'Mì cay Hàn Quốc Shin Ramen, gói 120g.' },
  { sku: 'MI-206', name: 'Bún gạo khô Vifon 400g', brand: 'Vifon', categorySlug: 'mi-goi', unit: 'bịch',
    price: 13_000, importPrice: 10_000, stock: 60, tags: ['bún', 'khô'],
    description: 'Bún gạo khô Vifon, bịch 400g, nấu nhanh.' },

  // ====== BÁNH KẸO (banh-keo) — 6 ======
  { sku: 'BK-201', name: 'Bánh Oreo vị vani 137g', brand: 'Oreo', categorySlug: 'banh-keo', unit: 'gói',
    price: 25_000, importPrice: 20_000, stock: 80, tags: ['bánh quy', 'vani'],
    isFeatured: true, description: 'Bánh quy Oreo vị vani với lớp kem ngọt ngào, gói 137g.' },
  { sku: 'BK-202', name: 'Sô cô la đen Dela 70% 100g', brand: 'Dela', categorySlug: 'banh-keo', unit: 'thanh',
    price: 35_000, importPrice: 28_000, stock: 50, tags: ['sô cô la', 'đắng'],
    description: 'Sô cô la đen Dela 70% cacao, thanh 100g.' },
  { sku: 'BK-203', name: 'Bánh quy Cosy vị sữa 100g', brand: 'Cosy', categorySlug: 'banh-keo', unit: 'gói',
    price: 8_000, importPrice: 6_000, stock: 110, tags: ['bánh quy', 'vị sữa'],
    description: 'Bánh quy Cosy vị sữa béo ngậy, gói 100g.' },
  { sku: 'BK-204', name: 'Bánh quế Tràng Tiền vị sữa 12 cái', brand: 'Tràng Tiền', categorySlug: 'banh-keo', unit: 'hộp',
    price: 30_000, importPrice: 24_000, stock: 40, tags: ['bánh quế', 'sữa'],
    description: 'Bánh quế Tràng Tiền vị sữa kem, hộp 12 cái.' },
  { sku: 'BK-205', name: 'Kẹo dẻo trái cây Bibica 200g', brand: 'Bibica', categorySlug: 'banh-keo', unit: 'túi',
    price: 25_000, importPrice: 20_000, stock: 70, tags: ['kẹo dẻo', 'trái cây'],
    description: 'Kẹo dẻo nhiều vị trái cây Bibica, túi 200g.' },
  { sku: 'BK-206', name: 'Kẹo bạc hà Mentos 40g', brand: 'Mentos', categorySlug: 'banh-keo', unit: 'cuốn',
    price: 8_000, importPrice: 6_000, stock: 130, tags: ['kẹo', 'bạc hà'],
    description: 'Kẹo ngậm bạc hà Mentos vị mát lạnh, gói 40g.' },

  // ====== ĐỒ ĂN NHANH (do-an-nhanh) — 4 ======
  { sku: 'AN-201', name: 'Snack khoai tây Lay\'s vị cua 45g', brand: 'Lay\'s', categorySlug: 'do-an-nhanh', unit: 'gói',
    price: 10_000, importPrice: 8_000, stock: 100, tags: ['snack', 'khoai tây'],
    isFeatured: true, description: 'Khoai tây chiên Lay\'s vị cua, gói 45g.' },
  { sku: 'AN-202', name: 'Xúc xích heo Đức Việt 70g', brand: 'Đức Việt', categorySlug: 'do-an-nhanh', unit: 'cây',
    price: 8_000, importPrice: 6_500, stock: 120, tags: ['xúc xích', 'ăn nhẹ'],
    description: 'Xúc xích heo Đức Việt, cây 70g.' },
  { sku: 'AN-203', name: 'Snack bắp phô mai Bimi 55g', brand: 'Bimi', categorySlug: 'do-an-nhanh', unit: 'gói',
    price: 8_000, importPrice: 6_000, stock: 90, tags: ['snack', 'bắp'],
    description: 'Snack bắp phô mai Bimi giòn tan, gói 55g.' },
  { sku: 'AN-204', name: 'Chả giò chiên sẵn Vissan 200g', brand: 'Vissan', categorySlug: 'do-an-nhanh', unit: 'gói',
    price: 35_000, importPrice: 28_000, stock: 40, tags: ['chả giò', 'chiên'],
    description: 'Chả giò chiên sẵn Vissan, gói 200g.' },

  // ====== GIA VỊ (gia-vi) — 6 ======
  { sku: 'GV-201', name: 'Nước mắm Nam Ngư 500ml', brand: 'Nam Ngư', categorySlug: 'gia-vi', unit: 'chai',
    price: 38_000, importPrice: 30_000, stock: 40, tags: ['nước mắm', 'mắm'],
    isFeatured: true, description: 'Nước mắm Nam Ngư đậm đà, chai 500ml.' },
  { sku: 'GV-202', name: 'Hạt nêm Knorr vị gà 400g', brand: 'Knorr', categorySlug: 'gia-vi', unit: 'gói',
    price: 33_000, importPrice: 27_000, stock: 60, tags: ['hạt nêm', 'nấu ăn'],
    description: 'Hạt nêm Knorr vị gà, gói 400g.' },
  { sku: 'GV-203', name: 'Tương ớt Cholimex 270g', brand: 'Cholimex', categorySlug: 'gia-vi', unit: 'chai',
    price: 18_000, importPrice: 14_000, stock: 90, tags: ['tương ớt'],
    description: 'Tương ớt Cholimex cay tê, chai 270g.' },
  { sku: 'GV-204', name: 'Bột canh Cham 100g', brand: 'Cham', categorySlug: 'gia-vi', unit: 'túi',
    price: 32_000, importPrice: 26_000, stock: 50, tags: ['bột canh'],
    description: 'Bột canh Cham rong biển, túi 100g.' },
  { sku: 'GV-205', name: 'Dấm gạo trắng 500ml', brand: 'Cholimex', categorySlug: 'gia-vi', unit: 'chai',
    price: 20_000, importPrice: 16_000, stock: 40, tags: ['dấm', 'nấu ăn'],
    description: 'Dấm gạo trắng dùng nêm nếm, chai 500ml.' },
  { sku: 'GV-206', name: 'Sa tế tôm Cholimex 200g', brand: 'Cholimex', categorySlug: 'gia-vi', unit: 'chai',
    price: 25_000, importPrice: 20_000, stock: 45, tags: ['sa tế', 'cay'],
    description: 'Sa tế tôm Cholimex có thể dùng lẩu, mỳ, phở.' },

  // ====== ĐỒ CÁ NHÂN (do-ca-nhan) — 5 ======
  { sku: 'CN-201', name: 'Khẩu trang y tế Nam Long 50 chiếc', brand: 'Nam Long', categorySlug: 'do-ca-nhan', unit: 'hộp',
    price: 25_000, importPrice: 20_000, stock: 40, tags: ['khẩu trang', 'y tế'],
    description: 'Khẩu trang y tế Nam Long 4 lớp, hộp 50 chiếc.' },
  { sku: 'CN-202', name: 'Kem đánh răng P/S hương bạc hà 130g', brand: 'Unilever', categorySlug: 'do-ca-nhan', unit: 'tuýp',
    price: 22_000, importPrice: 17_000, stock: 60, tags: ['đánh răng', 'bạc hà'],
    isFeatured: true, description: 'Kem đánh răng P/S vị bạc hà, tuýp 130g.' },
  { sku: 'CN-203', name: 'Bàn chải đánh răng P/S mềm', brand: 'P/S', categorySlug: 'do-ca-nhan', unit: 'cái',
    price: 18_000, importPrice: 14_000, stock: 70, tags: ['bàn chải', 'đánh răng'],
    description: 'Bàn chải đánh răng P/S lông mềm, cái.' },
  { sku: 'CN-204', name: 'Sữa tắm Dove trắng mịn 300ml', brand: 'Dove', categorySlug: 'do-ca-nhan', unit: 'chai',
    price: 50_000, importPrice: 40_000, stock: 30, tags: ['sữa tắm', 'dưỡng ẩm'],
    description: 'Sữa tắm Dove trắng mịn, chai 300ml.' },
  { sku: 'CN-205', name: 'Dầu gội Sunsilk bồng bềnh 200ml', brand: 'Sunsilk', categorySlug: 'do-ca-nhan', unit: 'chai',
    price: 25_000, importPrice: 20_000, stock: 35, tags: ['dầu gội', 'mềm tóc'],
    description: 'Dầu gội Sunsilk giúp tóc bồng bềnh, chai 200ml.' },

  // ====== ĐỒ GIA DỤNG (do-gia-dung) — 5 ======
  { sku: 'GD-201', name: 'Nước rửa chén Sunlight chanh 750ml', brand: 'Sunlight', categorySlug: 'do-gia-dung', unit: 'chai',
    price: 32_000, importPrice: 26_000, stock: 50, tags: ['rửa chén', 'sạch'],
    isFeatured: true, description: 'Nước rửa chén Sunlight hương chanh, chai 750ml.' },
  { sku: 'GD-202', name: 'Bột giặt OMO 800g', brand: 'OMO', categorySlug: 'do-gia-dung', unit: 'gói',
    price: 78_000, importPrice: 62_000, stock: 30, tags: ['bột giặt', 'thơm'],
    description: 'Bột giặt OMO hương oải hương, gói 800g.' },
  { sku: 'GD-203', name: 'Nước lau sàn Vim hương chanh 500ml', brand: 'Vim', categorySlug: 'do-gia-dung', unit: 'chai',
    price: 28_000, importPrice: 22_000, stock: 60, tags: ['lau sàn', 'chanh'],
    description: 'Nước lau sàn Vim hương chanh, chai 500ml.' },
  { sku: 'GD-204', name: 'Túi rác tự hủy 30 chiếc', brand: 'Green Life', categorySlug: 'do-gia-dung', unit: 'cuộn',
    price: 35_000, importPrice: 28_000, stock: 30, tags: ['túi rác', 'tự hủy'],
    description: 'Túi rác tự hủy sinh học, cuộn 30 chiếc.' },
  { sku: 'GD-205', name: 'Viên vệ sinh bồn cầu 3D hương chanh', brand: '3D', categorySlug: 'do-gia-dung', unit: 'hộp',
    price: 24_000, importPrice: 19_000, stock: 35, tags: ['vệ sinh', 'bồn cầu'],
    description: 'Viên vệ sinh bồn cầu 3D hương chanh, hộp 3 viên.' },

  // ====== CÀ PHÊ & TRÀ (cafe-tra) — 4 ======
  { sku: 'CP-201', name: 'Cà phê hòa tan Trung Nguyên G7 16 gói', brand: 'Trung Nguyên', categorySlug: 'cafe-tra', unit: 'hộp',
    price: 95_000, importPrice: 78_000, stock: 30, tags: ['cà phê', 'hòa tan'],
    isFeatured: true, description: 'Cà phê hòa tan 3 trong 1 G7 Trung Nguyên, hộp 16 gói.' },
  { sku: 'CP-202', name: 'Cà phê hòa tan Nescafé Sài Gòn 16 gói', brand: 'Nescafé', categorySlug: 'cafe-tra', unit: 'hộp',
    price: 62_000, importPrice: 52_000, stock: 45, tags: ['cà phê', 'hòa tan'],
    description: 'Cà phê hòa tan Nescafé vị Sài Gòn, hộp 16 gói.' },
  { sku: 'CP-203', name: 'Trà Lipton Yellow Label 20 túi lọc', brand: 'Lipton', categorySlug: 'cafe-tra', unit: 'hộp',
    price: 28_000, importPrice: 23_000, salePrice: 24_000, stock: 50, tags: ['trà', 'túi lọc'],
    description: 'Trà túi lọc Lipton Yellow Label, hộp 20 túi.' },
  { sku: 'CP-204', name: 'Bột trà xanh Matcha Lotte 250g', brand: 'Lotte', categorySlug: 'cafe-tra', unit: 'hộp',
    price: 88_000, importPrice: 74_000, stock: 25, tags: ['matcha', 'trà'],
    description: 'Bột trà xanh matcha Lotte, hộp 250g.' },
];

/** Slug duy nhất từ tên (bỏ dấu, gạch nối) */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  console.log('🛒 Seeding sản phẩm thật (ảnh local)...');
  const cats = await prisma.category.findMany();
  const catBySlug = new Map(cats.map((c) => [c.slug, c.id]));

  let created = 0, updated = 0, skipped = 0;
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const categoryId = catBySlug.get(p.categorySlug);
    if (!categoryId) { skipped++; continue; }

    const slug = slugify(p.name);
    const imageUrl = `/uploads/products/${p.sku.toLowerCase()}.jpg`;
    const data = {
      name: p.name, slug, categoryId, brand: p.brand, unit: p.unit,
      price: p.price, importPrice: p.importPrice,
      salePrice: p.salePrice ?? null,
      stock: p.stock,
      tags: p.tags,
      isFeatured: p.isFeatured ?? false,
      description: p.description,
      imageUrl,
      expiryDate: dateOffset(80 + ((i * 37) % 250)), // hạn ngẫu nhiên ổn định
    };

    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (!existing) { await prisma.product.create({ data }); created++; }
    else { await prisma.product.update({ where: { sku: p.sku }, data }); updated++; }
  }

  const total = await prisma.product.count();
  console.log(`  ✅ seeded: created=${created}, updated=${updated}, skipped=${skipped}`);
  console.log(`  tổng sản phẩm trong DB = ${total}`);
}

main()
  .catch((e) => { console.error('❌ Seed real products failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });