/**
 * Smart MiniMart AI — Seed dữ liệu mẫu
 *
 * Run: npm run db:seed
 */

import { PrismaClient, Role, AITaskType, AIMode, OCREngine, AIProviderType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Smart MiniMart AI database...');

  await seedUsers();
  await seedCategories();
  await seedProducts();
  await seedPromotions();
  await seedAIDefaults();

  console.log('✅ Seed hoàn tất.');
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash('123456', 10);
  const users = [
    { email: 'customer@minimart.vn',  fullName: 'Nguyễn Văn Khách', role: Role.CUSTOMER },
    { email: 'vip@minimart.vn',       fullName: 'Trần Thị VIP',     role: Role.CUSTOMER, isVip: true, loyaltyPoints: 5_000 },
    { email: 'staff@minimart.vn',     fullName: 'Lê Nhân Viên',     role: Role.STAFF },
    { email: 'admin@minimart.vn',     fullName: 'Phạm Quản Lý',     role: Role.STORE_ADMIN },
    { email: 'ai@minimart.vn',        fullName: 'Hoàng AI Manager', role: Role.AI_MANAGER },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    });
  }
  console.log(`  → ${users.length} users seeded`);
}

async function seedCategories() {
  const categories = [
    { name: 'Đồ uống',     slug: 'do-uong',     imageUrl: '/img/cat/do-uong.png',     sortOrder: 1 },
    { name: 'Sữa',         slug: 'sua',         imageUrl: '/img/cat/sua.png',         sortOrder: 2 },
    { name: 'Mì gói',      slug: 'mi-goi',      imageUrl: '/img/cat/mi-goi.png',      sortOrder: 3 },
    { name: 'Bánh kẹo',    slug: 'banh-keo',    imageUrl: '/img/cat/banh-keo.png',    sortOrder: 4 },
    { name: 'Đồ ăn nhanh', slug: 'do-an-nhanh', imageUrl: '/img/cat/an-nhanh.png',    sortOrder: 5 },
    { name: 'Gia vị',      slug: 'gia-vi',      imageUrl: '/img/cat/gia-vi.png',      sortOrder: 6 },
    { name: 'Đồ cá nhân',  slug: 'do-ca-nhan',  imageUrl: '/img/cat/ca-nhan.png',     sortOrder: 7 },
    { name: 'Đồ gia dụng', slug: 'do-gia-dung', imageUrl: '/img/cat/gia-dung.png',    sortOrder: 8 },
    { name: 'Cà phê & Trà', slug: 'cafe-tra',   imageUrl: '/img/cat/cafe-tra.png',    sortOrder: 9 },
  ];
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }
  console.log(`  → ${categories.length} categories seeded`);
}

async function seedProducts() {
  const cats = await prisma.category.findMany();
  const cat = (slug: string) => cats.find((c) => c.slug === slug)!.id;
  const tomorrow = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  const products: any[] = [
    // Đồ uống
    { sku: 'DU-001', name: 'Coca Cola lon 330ml', slug: 'coca-cola-lon-330ml',
      categoryId: cat('do-uong'), brand: 'Coca-Cola', unit: 'lon',
      price: 10_000, importPrice: 7_500, salePrice: 9_000, stock: 120, expiryDate: tomorrow(180),
      tags: ['nước ngọt', 'có ga'], isFeatured: true,
      imageUrl: 'https://salt.tikicdn.com/cache/280x280/ts/product/86/41/06/9be2bbc9efe28b7e3ab4cdf6a4b4ed8a.jpg' },
    { sku: 'DU-002', name: 'Pepsi lon 330ml', slug: 'pepsi-lon-330ml',
      categoryId: cat('do-uong'), brand: 'Pepsi', unit: 'lon',
      price: 10_000, importPrice: 7_500, stock: 100, expiryDate: tomorrow(180),
      tags: ['nước ngọt', 'có ga'] },
    { sku: 'DU-003', name: 'Trà xanh 0 độ 500ml', slug: 'tra-xanh-0-do-500ml',
      categoryId: cat('do-uong'), brand: 'Tân Hiệp Phát', unit: 'chai',
      price: 12_000, importPrice: 9_000, stock: 80, expiryDate: tomorrow(120),
      tags: ['ít đường', 'low-sugar', 'healthy'], isFeatured: true },
    { sku: 'DU-004', name: 'Nước suối Lavie 500ml', slug: 'lavie-500ml',
      categoryId: cat('do-uong'), brand: 'Lavie', unit: 'chai',
      price: 6_000, importPrice: 4_500, stock: 200, expiryDate: tomorrow(360),
      tags: ['nước'] },
    { sku: 'DU-005', name: 'Sting dâu 320ml', slug: 'sting-dau-320ml',
      categoryId: cat('do-uong'), brand: 'Sting', unit: 'lon',
      price: 11_000, importPrice: 8_000, stock: 60, expiryDate: tomorrow(150),
      tags: ['tăng lực', 'có ga'] },

    // Sữa
    { sku: 'SU-001', name: 'Sữa TH True Milk có đường 220ml', slug: 'th-co-duong-220ml',
      categoryId: cat('sua'), brand: 'TH True Milk', unit: 'hộp',
      price: 8_500, importPrice: 6_500, stock: 150, expiryDate: tomorrow(60),
      tags: ['sữa', 'có đường'], isFeatured: true },
    { sku: 'SU-002', name: 'Sữa Vinamilk không đường 180ml', slug: 'vnm-khong-duong-180ml',
      categoryId: cat('sua'), brand: 'Vinamilk', unit: 'hộp',
      price: 7_000, importPrice: 5_500, stock: 130, expiryDate: tomorrow(45),
      tags: ['sữa', 'không đường', 'low-sugar', 'healthy'] },
    { sku: 'SU-003', name: 'Sữa chua Vinamilk 100ml', slug: 'sua-chua-vnm',
      categoryId: cat('sua'), brand: 'Vinamilk', unit: 'hũ',
      price: 7_500, importPrice: 5_500, stock: 200, expiryDate: tomorrow(20),
      tags: ['sữa chua', 'lên men'] },
    { sku: 'SU-004', name: 'Sữa Milo bịch 180ml', slug: 'milo-180ml',
      categoryId: cat('sua'), brand: 'Nestlé', unit: 'bịch',
      price: 9_000, importPrice: 7_000, stock: 90, expiryDate: tomorrow(75),
      tags: ['sữa', 'cacao'] },

    // Mì gói
    { sku: 'MI-001', name: 'Mì Hảo Hảo tôm chua cay', slug: 'hao-hao-tom-chua-cay',
      categoryId: cat('mi-goi'), brand: 'Acecook', unit: 'gói',
      price: 4_000, importPrice: 3_200, stock: 500, expiryDate: tomorrow(180),
      tags: ['mì gói', 'cay'], isFeatured: true },
    { sku: 'MI-002', name: 'Mì Omachi sườn hầm', slug: 'omachi-suon-ham',
      categoryId: cat('mi-goi'), brand: 'Masan', unit: 'gói',
      price: 8_500, importPrice: 6_500, stock: 300, expiryDate: tomorrow(180),
      tags: ['mì gói', 'sườn'] },
    { sku: 'MI-003', name: 'Mì Modern lẩu Thái tôm', slug: 'modern-lau-thai',
      categoryId: cat('mi-goi'), brand: 'Asia Foods', unit: 'gói',
      price: 9_000, importPrice: 7_000, stock: 200, expiryDate: tomorrow(180),
      tags: ['mì gói', 'lẩu thái', 'cay'] },

    // Bánh kẹo
    { sku: 'BK-001', name: 'Bánh Choco-pie Lotte 12 cái', slug: 'choco-pie-12',
      categoryId: cat('banh-keo'), brand: 'Lotte', unit: 'hộp',
      price: 65_000, importPrice: 50_000, stock: 60, expiryDate: tomorrow(90),
      tags: ['bánh', 'sô cô la'], isFeatured: true },
    { sku: 'BK-002', name: 'Kẹo Mentos hương dâu', slug: 'mentos-dau',
      categoryId: cat('banh-keo'), brand: 'Mentos', unit: 'cuộn',
      price: 8_000, importPrice: 6_000, stock: 150, expiryDate: tomorrow(180),
      tags: ['kẹo'] },
    { sku: 'BK-003', name: 'Bánh Oreo vani 137g', slug: 'oreo-vani',
      categoryId: cat('banh-keo'), brand: 'Mondelez', unit: 'gói',
      price: 18_000, importPrice: 14_000, stock: 100, expiryDate: tomorrow(150),
      tags: ['bánh', 'sô cô la'] },
    // Hàng gần hết hạn (demo cảnh báo)
    { sku: 'BK-004', name: 'Bánh quy LU bơ (cận date)', slug: 'lu-bo-can-date',
      categoryId: cat('banh-keo'), brand: 'LU', unit: 'gói',
      price: 25_000, importPrice: 20_000, salePrice: 15_000, stock: 30,
      expiryDate: tomorrow(8), // 8 ngày → CRITICAL
      tags: ['bánh', 'sale', 'cận date'] },

    // Đồ ăn nhanh
    { sku: 'AN-001', name: 'Xúc xích Đức Việt 70g', slug: 'xuc-xich-duc-viet',
      categoryId: cat('do-an-nhanh'), brand: 'Đức Việt', unit: 'cây',
      price: 12_000, importPrice: 9_000, stock: 100, expiryDate: tomorrow(45),
      tags: ['ăn vặt', 'xúc xích'], isFeatured: true },
    { sku: 'AN-002', name: 'Phô mai con bò cười 8 miếng', slug: 'pho-mai-bo-cuoi',
      categoryId: cat('do-an-nhanh'), brand: 'The Laughing Cow', unit: 'hộp',
      price: 35_000, importPrice: 28_000, stock: 70, expiryDate: tomorrow(120),
      tags: ['phô mai', 'ăn sáng'] },
    { sku: 'AN-003', name: 'Snack khoai tây Lay\'s vị BBQ', slug: 'lays-bbq',
      categoryId: cat('do-an-nhanh'), brand: 'Lay\'s', unit: 'gói',
      price: 12_000, importPrice: 9_000, stock: 200, expiryDate: tomorrow(120),
      tags: ['snack', 'ăn vặt'] },

    // Gia vị
    { sku: 'GV-001', name: 'Nước mắm Nam Ngư 500ml', slug: 'nam-ngu-500ml',
      categoryId: cat('gia-vi'), brand: 'Nam Ngư', unit: 'chai',
      price: 35_000, importPrice: 28_000, stock: 80, expiryDate: tomorrow(360),
      tags: ['nước mắm', 'gia vị'] },
    { sku: 'GV-002', name: 'Tương ớt Cholimex 270g', slug: 'tuong-ot-cholimex',
      categoryId: cat('gia-vi'), brand: 'Cholimex', unit: 'chai',
      price: 18_000, importPrice: 14_000, stock: 120, expiryDate: tomorrow(360),
      tags: ['tương ớt', 'gia vị'] },
    { sku: 'GV-003', name: 'Hạt nêm Knorr 400g', slug: 'hat-nem-knorr',
      categoryId: cat('gia-vi'), brand: 'Knorr', unit: 'gói',
      price: 28_000, importPrice: 22_000, stock: 100, expiryDate: tomorrow(360),
      tags: ['hạt nêm', 'gia vị'] },

    // Đồ cá nhân
    { sku: 'CN-001', name: 'Khăn giấy Pulpy 4 cuộn', slug: 'pulpy-4-cuon',
      categoryId: cat('do-ca-nhan'), brand: 'Pulpy', unit: 'gói',
      price: 28_000, importPrice: 22_000, stock: 60,
      tags: ['khăn giấy'] },
    { sku: 'CN-002', name: 'Bàn chải Colgate', slug: 'ban-chai-colgate',
      categoryId: cat('do-ca-nhan'), brand: 'Colgate', unit: 'cái',
      price: 18_000, importPrice: 14_000, stock: 100,
      tags: ['vệ sinh'] },
    { sku: 'CN-003', name: 'Kem đánh răng PS 200g', slug: 'kem-ps-200g',
      categoryId: cat('do-ca-nhan'), brand: 'PS', unit: 'tuýp',
      price: 25_000, importPrice: 20_000, stock: 80, expiryDate: tomorrow(720),
      tags: ['vệ sinh'] },

    // Đồ gia dụng
    { sku: 'GD-001', name: 'Nước rửa chén Sunlight 750ml', slug: 'sunlight-750ml',
      categoryId: cat('do-gia-dung'), brand: 'Sunlight', unit: 'chai',
      price: 32_000, importPrice: 25_000, stock: 80,
      tags: ['rửa chén'] },
    { sku: 'GD-002', name: 'Bột giặt OMO 800g', slug: 'omo-800g',
      categoryId: cat('do-gia-dung'), brand: 'OMO', unit: 'gói',
      price: 55_000, importPrice: 45_000, stock: 60,
      tags: ['giặt giũ'] },

    // Cà phê & Trà
    { sku: 'CP-001', name: 'Cà phê G7 hòa tan 18 gói', slug: 'g7-18-goi',
      categoryId: cat('cafe-tra'), brand: 'Trung Nguyên', unit: 'hộp',
      price: 35_000, importPrice: 28_000, stock: 80, expiryDate: tomorrow(360),
      tags: ['cà phê', 'hòa tan'], isFeatured: true },
    { sku: 'CP-002', name: 'Trà Lipton 25 túi lọc', slug: 'lipton-25-tui',
      categoryId: cat('cafe-tra'), brand: 'Lipton', unit: 'hộp',
      price: 28_000, importPrice: 22_000, stock: 60, expiryDate: tomorrow(360),
      tags: ['trà', 'túi lọc'] },
    // Hàng bán chậm (demo): tồn cao, soldCount=0
    { sku: 'CP-003', name: 'Cà phê Hồng Vịnh phin (chậm bán)', slug: 'hong-vinh-phin',
      categoryId: cat('cafe-tra'), brand: 'Hồng Vịnh', unit: 'gói',
      price: 75_000, importPrice: 60_000, stock: 50, expiryDate: tomorrow(180),
      tags: ['cà phê', 'phin'] },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
  }
  console.log(`  → ${products.length} products seeded`);
}

async function seedPromotions() {
  const now = new Date();
  const in30 = new Date(); in30.setDate(now.getDate() + 30);

  const promos = [
    {
      code: 'WELCOME10', name: 'Giảm 10% đơn đầu tiên',
      type: 'PERCENT' as const, discountValue: 10,
      minOrderValue: 50_000, maxDiscount: 30_000,
      startDate: now, endDate: in30, isActive: true,
    },
    {
      code: 'FREESHIP', name: 'Miễn phí giao hàng đơn từ 100k',
      type: 'AMOUNT' as const, discountValue: 15_000,
      minOrderValue: 100_000,
      startDate: now, endDate: in30, isActive: true,
    },
    {
      code: 'EXP_SALE', name: 'Hàng cận date giảm 40%',
      type: 'EXPIRY_DISCOUNT' as const, discountValue: 40,
      startDate: now, endDate: in30, isActive: true, isAutoApply: true,
    },
  ];

  for (const p of promos) {
    await prisma.promotion.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
  }
  console.log(`  → ${promos.length} promotions seeded`);
}

async function seedAIDefaults() {
  // System default provider (DeepSeek)
  await prisma.aIProvider.upsert({
    where: { name: 'System Default (DeepSeek)' },
    update: {},
    create: {
      name: 'System Default (DeepSeek)',
      type: AIProviderType.DEEPSEEK,
      baseUrl: 'https://api.deepseek.com',
      defaultModel: 'deepseek-chat',
      isSystemDefault: true,
      apiKeyMasked: 'sk-3***6be',
    },
  });

  // Mock provider luôn có sẵn
  await prisma.aIProvider.upsert({
    where: { name: 'Mock AI (Demo)' },
    update: {},
    create: {
      name: 'Mock AI (Demo)',
      type: AIProviderType.MOCK,
      defaultModel: 'mock-v1',
    },
  });

  // OCR settings singleton
  const existing = await prisma.oCRSettings.findFirst();
  if (!existing) {
    await prisma.oCRSettings.create({
      data: {
        defaultEngine: OCREngine.MOCK,
        fallbackEngine: OCREngine.MOCK,
        confidenceThreshold: 0.6,
        requireReview: true,
        llmParserEnabled: true,
      },
    });
  }

  // Task configs mặc định cho từng task
  const taskDefaults: Array<{ taskType: AITaskType; mode: AIMode }> = [
    { taskType: AITaskType.AI_SEARCH,            mode: AIMode.HYBRID },
    { taskType: AITaskType.AI_ASSISTANT,         mode: AIMode.ONLINE },
    { taskType: AITaskType.OCR_PARSE,            mode: AIMode.HYBRID },
    { taskType: AITaskType.ANALYTICS_SLOWMOVING, mode: AIMode.HYBRID },
    { taskType: AITaskType.PROMOTION_SUGGEST,    mode: AIMode.ONLINE },
    { taskType: AITaskType.REVIEW_SUMMARY,       mode: AIMode.ONLINE },
    { taskType: AITaskType.CONTENT_GENERATION,   mode: AIMode.ONLINE },
    { taskType: AITaskType.RESTOCK_SUGGEST,      mode: AIMode.HYBRID },
  ];
  for (const t of taskDefaults) {
    await prisma.aITaskConfig.upsert({
      where: { taskType: t.taskType },
      update: {},
      create: t,
    });
  }
  console.log(`  → AI defaults seeded (providers + OCR + ${taskDefaults.length} task configs)`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
