/**
 * Smart MiniMart AI — Seed kịch bản demo (P0)
 *
 * Chạy SAU khi đã có users + products (seed gốc / crawl VN).
 * Không xóa SP active. Idempotent theo orderNumber/receiptNumber prefix DEMO-.
 *
 * Run:
 *   cd backend && npx ts-node -r tsconfig-paths/register prisma/seed-demo-scenarios.ts
 */
import {
  PrismaClient,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ImportReceiptStatus,
  OCREngine,
  InventoryTxnType,
} from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const ORDER_PREFIX = 'DEMO-SMM-';
const RECEIPT_PREFIX = 'DEMO-IR-';

async function main() {
  console.log('🎬 Seed demo scenarios...');

  // Clean previous DEMO data (safe, only our prefixes)
  await prisma.review.deleteMany({
    where: { comment: { startsWith: '[DEMO]' } },
  });
  await prisma.orderItem.deleteMany({
    where: { order: { orderNumber: { startsWith: ORDER_PREFIX } } },
  });
  await prisma.order.deleteMany({
    where: { orderNumber: { startsWith: ORDER_PREFIX } },
  });
  await prisma.importReceiptItem.deleteMany({
    where: { importReceipt: { receiptNumber: { startsWith: RECEIPT_PREFIX } } },
  });
  await prisma.importReceipt.deleteMany({
    where: { receiptNumber: { startsWith: RECEIPT_PREFIX } },
  });

  const customer = await prisma.user.findUnique({ where: { email: 'customer@minimart.vn' } });
  const vip = await prisma.user.findUnique({ where: { email: 'vip@minimart.vn' } });
  const staff = await prisma.user.findUnique({ where: { email: 'staff@minimart.vn' } });
  if (!customer || !vip || !staff) {
    throw new Error('Thiếu user demo (customer/vip/staff). Chạy seed.ts trước.');
  }

  // Ensure addresses
  let custAddr = await prisma.address.findFirst({ where: { userId: customer.id } });
  if (!custAddr) {
    custAddr = await prisma.address.create({
      data: {
        userId: customer.id,
        recipient: customer.fullName,
        phone: '0901234567',
        line1: '12 Nguyễn Văn Cừ',
        ward: 'Phường 4',
        district: 'Quận 5',
        city: 'TP.HCM',
        isDefault: true,
      },
    });
  }
  let vipAddr = await prisma.address.findFirst({ where: { userId: vip.id } });
  if (!vipAddr) {
    vipAddr = await prisma.address.create({
      data: {
        userId: vip.id,
        recipient: vip.fullName,
        phone: '0912345678',
        line1: '88 Lê Lợi',
        ward: 'Bến Nghé',
        district: 'Quận 1',
        city: 'TP.HCM',
        isDefault: true,
      },
    });
  }

  const products = await prisma.product.findMany({
    where: { isActive: true, stock: { gt: 5 } },
    orderBy: { soldCount: 'desc' },
    take: 80,
  });
  if (products.length < 10) throw new Error('Cần ≥10 SP active để seed kịch bản');

  // ========== 1) Flag SP: cận date + bán chậm ==========
  const now = new Date();
  const days = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return d;
  };

  // Cận date: 12 SP
  const expiring = products.slice(0, 12);
  for (let i = 0; i < expiring.length; i++) {
    const p = expiring[i];
    const dayMarks = [3, 5, 7, 10, 12, 15, 20, 25, 28, 30, 45, 55];
    await prisma.product.update({
      where: { id: p.id },
      data: {
        expiryDate: days(dayMarks[i] ?? 10),
        // một số SP sale vì cận date
        salePrice: i % 2 === 0 ? Number(p.price) * 0.85 : p.salePrice,
      },
    });
  }
  console.log(`  → ${expiring.length} SP gắn hạn dùng cận date (3–55 ngày)`);

  // Bán chậm: stock cao + soldCount thấp
  const slow = products.slice(12, 24);
  for (const p of slow) {
    await prisma.product.update({
      where: { id: p.id },
      data: { stock: 80 + Math.floor(Math.random() * 80), soldCount: Math.floor(Math.random() * 3) },
    });
  }
  console.log(`  → ${slow.length} SP gắn bán chậm (stock cao, soldCount thấp)`);

  // Bán chạy: soldCount cao
  const hot = products.slice(24, 36);
  for (const p of hot) {
    await prisma.product.update({
      where: { id: p.id },
      data: { soldCount: 40 + Math.floor(Math.random() * 80), isFeatured: true },
    });
  }
  console.log(`  → ${hot.length} SP gắn bán chạy/featured`);

  // ========== 2) Orders đủ status (40 đơn) ==========
  const statusPlan: Array<{ status: OrderStatus; count: number; payment?: PaymentStatus }> = [
    { status: OrderStatus.PENDING, count: 6, payment: PaymentStatus.UNPAID },
    { status: OrderStatus.CONFIRMED, count: 7, payment: PaymentStatus.UNPAID },
    { status: OrderStatus.PREPARING, count: 6, payment: PaymentStatus.UNPAID },
    { status: OrderStatus.DELIVERING, count: 7, payment: PaymentStatus.UNPAID },
    { status: OrderStatus.COMPLETED, count: 10, payment: PaymentStatus.PAID },
    { status: OrderStatus.CANCELED, count: 4, payment: PaymentStatus.FAILED },
  ];

  let orderSeq = 1;
  let createdOrders = 0;
  const completedOrderIds: string[] = [];

  for (const plan of statusPlan) {
    for (let i = 0; i < plan.count; i++) {
      const buyer = i % 3 === 0 ? vip : customer;
      const addr = buyer.id === vip.id ? vipAddr! : custAddr!;
      const itemCount = 1 + (i % 3);
      const chosen = pick(products, itemCount, orderSeq);
      let subtotal = 0;
      const itemsData = chosen.map((p) => {
        const qty = 1 + (orderSeq % 2);
        const unitPrice = Number(p.salePrice ?? p.price);
        const line = unitPrice * qty;
        subtotal += line;
        return {
          productId: p.id,
          productName: p.name,
          unitPrice,
          quantity: qty,
          subtotal: line,
        };
      });
      const shippingFee = subtotal >= 200_000 ? 0 : 15_000;
      const discountAmount = i % 5 === 0 ? Math.min(15_000, subtotal * 0.1) : 0;
      const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);
      const orderNumber = `${ORDER_PREFIX}${String(orderSeq).padStart(4, '0')}`;
      const createdAt = days(-(1 + (orderSeq % 25)));

      const st = plan.status as string;
      const order = await prisma.order.create({
        data: {
          orderNumber,
          userId: buyer.id,
          addressId: addr.id,
          status: plan.status,
          paymentMethod: i % 4 === 0 ? PaymentMethod.VNPAY_SANDBOX : PaymentMethod.COD,
          paymentStatus: plan.payment ?? PaymentStatus.UNPAID,
          subtotal,
          discountAmount,
          shippingFee,
          totalAmount,
          promotionCode: discountAmount > 0 ? 'FREESHIP' : null,
          note: `[DEMO] Đơn kịch bản ${plan.status}`,
          loyaltyEarned: plan.status === OrderStatus.COMPLETED ? Math.floor(totalAmount / 10_000) : 0,
          confirmedAt: ['CONFIRMED', 'PREPARING', 'DELIVERING', 'COMPLETED'].includes(st)
            ? createdAt : null,
          deliveredAt: ['DELIVERING', 'COMPLETED'].includes(st) ? createdAt : null,
          completedAt: plan.status === OrderStatus.COMPLETED ? createdAt : null,
          canceledAt: plan.status === OrderStatus.CANCELED ? createdAt : null,
          cancelReason: plan.status === OrderStatus.CANCELED ? 'Khách hủy demo' : null,
          createdAt,
          updatedAt: createdAt,
          items: { create: itemsData },
        },
      });
      if (plan.status === OrderStatus.COMPLETED) completedOrderIds.push(order.id);
      createdOrders++;
      orderSeq++;
    }
  }
  console.log(`  → ${createdOrders} orders DEMO (PENDING→CANCELED)`);

  // ========== 3) Reviews trên đơn COMPLETED ==========
  let reviewCount = 0;
  const reviewComments = [
    '[DEMO] Sản phẩm ngon, giao nhanh!',
    '[DEMO] Đóng gói cẩn thận, sẽ ủng hộ tiếp.',
    '[DEMO] Giá ổn, chất lượng ổn cho cửa hàng tiện lợi.',
    '[DEMO] Hơi gần hạn nhưng vẫn dùng được, sale hợp lý.',
    '[DEMO] AI gợi ý đúng nhu cầu của mình.',
  ];
  for (const orderId of completedOrderIds) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) continue;
    for (const it of order.items.slice(0, 2)) {
      try {
        await prisma.review.create({
          data: {
            userId: order.userId,
            productId: it.productId,
            orderId: order.id,
            rating: 3 + (reviewCount % 3), // 3–5
            comment: reviewComments[reviewCount % reviewComments.length],
            imageUrls: [],
          },
        });
        reviewCount++;
      } catch {
        // unique (user, product, order) — skip
      }
    }
  }
  console.log(`  → ${reviewCount} reviews [DEMO]`);

  // ========== 4) Import receipts (CONFIRMED + OCR_DONE) ==========
  let receiptCount = 0;
  for (let i = 1; i <= 8; i++) {
    const status = i <= 5 ? ImportReceiptStatus.CONFIRMED : ImportReceiptStatus.OCR_DONE;
    const chosen = pick(products, 3 + (i % 2), i * 7);
    let total = 0;
    const items = chosen.map((p, idx) => {
      const qty = 10 + idx * 5;
      const unitPrice = Number(p.importPrice || Number(p.price) * 0.7);
      total += qty * unitPrice;
      return {
        rawProductName: p.name,
        productId: p.id,
        productName: p.name,
        unit: p.unit,
        quantity: qty,
        unitPrice,
        expiryDate: days(60 + idx * 30),
        confidence: 0.85 + idx * 0.03,
        isVerified: status === ImportReceiptStatus.CONFIRMED,
      };
    });

    const receipt = await prisma.importReceipt.create({
      data: {
        receiptNumber: `${RECEIPT_PREFIX}${String(i).padStart(3, '0')}`,
        supplierName: i % 2 === 0 ? 'Nhà phân phối ABC' : 'Công ty TNHH MiniMart Supply',
        supplierPhone: '0281234567',
        importDate: days(-i * 2),
        imageUrl: 'https://placehold.co/600x800/png?text=Phieu+nhap+DEMO',
        status,
        ocrEngine: OCREngine.MOCK,
        ocrRawText: '[DEMO OCR] Phiếu nhập kịch bản',
        ocrParsedJson: { items: items.map((x) => ({ productName: x.productName, quantity: x.quantity })) },
        ocrConfidence: 0.92,
        totalAmount: total,
        notes: '[DEMO] Phiếu nhập kịch bản',
        createdById: staff.id,
        reviewedById: status === ImportReceiptStatus.CONFIRMED ? staff.id : null,
        confirmedAt: status === ImportReceiptStatus.CONFIRMED ? days(-i) : null,
        items: {
          create: items.map((it) => ({
            rawProductName: it.rawProductName,
            productId: it.productId,
            productName: it.productName,
            unit: it.unit,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            expiryDate: it.expiryDate,
            confidence: it.confidence,
            isVerified: it.isVerified,
          })),
        },
      },
    });

    // Inventory txn for confirmed receipts
    if (status === ImportReceiptStatus.CONFIRMED) {
      for (const it of items) {
        const prod = await prisma.product.findUnique({ where: { id: it.productId! } });
        if (!prod) continue;
        await prisma.inventoryTransaction.create({
          data: {
            productId: prod.id,
            type: InventoryTxnType.IMPORT,
            quantity: it.quantity,
            reason: `Nhập ${receipt.receiptNumber}`,
            refType: 'IMPORT_RECEIPT',
            refId: receipt.id,
            beforeQty: prod.stock,
            afterQty: prod.stock + it.quantity,
            createdById: staff.id,
          },
        });
        await prisma.product.update({
          where: { id: prod.id },
          data: { stock: { increment: it.quantity } },
        });
      }
    }
    receiptCount++;
  }
  console.log(`  → ${receiptCount} import receipts DEMO (5 CONFIRMED + 3 OCR_DONE)`);

  // ========== 5) Notifications demo ==========
  await prisma.notification.createMany({
    data: [
      {
        id: randomUUID(),
        userId: customer.id,
        title: '[DEMO] Đơn hàng đang giao',
        body: 'Đơn DEMO của bạn đang trên đường giao.',
        type: 'ORDER',
        isRead: false,
      },
      {
        id: randomUUID(),
        userId: vip.id,
        title: '[DEMO] Ưu đãi VIP',
        body: 'Giảm thêm cho khách VIP tuần này.',
        type: 'PROMO',
        isRead: false,
      },
      {
        id: randomUUID(),
        userId: staff.id,
        title: '[DEMO] Có phiếu OCR cần review',
        body: '3 phiếu OCR_DONE chờ xác nhận nhập kho.',
        type: 'SYSTEM',
        isRead: false,
      },
    ],
    skipDuplicates: true,
  });
  console.log('  → notifications DEMO');

  // Summary
  const [orders, reviews, receipts, expSoon, slowCnt] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], _count: true }),
    prisma.review.count(),
    prisma.importReceipt.groupBy({ by: ['status'], _count: true }),
    prisma.product.count({
      where: { isActive: true, expiryDate: { lte: days(30), gte: now } },
    }),
    prisma.product.count({
      where: { isActive: true, stock: { gte: 50 }, soldCount: { lte: 5 } },
    }),
  ]);
  console.log('✅ Demo scenarios done.');
  console.log('  orders by status:', Object.fromEntries(orders.map((o) => [o.status, o._count])));
  console.log('  reviews:', reviews);
  console.log('  receipts by status:', Object.fromEntries(receipts.map((r) => [r.status, r._count])));
  console.log('  SP cận date ≤30d:', expSoon);
  console.log('  SP bán chậm (stock≥50, sold≤5):', slowCnt);
}

function pick<T>(arr: T[], n: number, salt: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    out.push(arr[(salt * 3 + i * 7) % arr.length]);
  }
  return out;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
