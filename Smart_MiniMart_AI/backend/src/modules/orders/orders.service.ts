import { BadRequestException, Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  PromotionType,
  Role,
} from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { ORDER_REPOSITORY, IOrderRepository, CartWithItems } from './repositories/order.repository';
import { SettingsService } from '../settings/settings.service';

type PromotionWithProducts = Prisma.PromotionGetPayload<{ include: { products: true } }>;
type CartItemWithProduct = CartWithItems['items'][number];

const VIP_THRESHOLD = 1_000;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly repo: IOrderRepository,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Tạo đơn từ giỏ. `idempotencyKey` (header Idempotency-Key, optional): retry cùng key trong
   * 24h trả lại đơn cũ (SEC-004 bổ sung — cart lock chống double-submit đồng thời, key chống
   * retry sau timeout mà server đã tạo đơn). Trả cùng shape đơn bình thường.
   */
  async createOrder(userId: string, dto: CreateOrderDto, idempotencyKey?: string) {
    // Replay: key của chính user, tạo trong 24h → trả đơn cũ, không tạo mới.
    if (idempotencyKey) {
      const existing = await this.repo.findUnique({
        where: { idempotencyKey },
        include: { items: true },
      });
      if (existing) {
        if (existing.userId !== userId) {
          throw new BadRequestException('Khóa idempotency đã dùng cho đơn khác');
        }
        const ageMs = Date.now() - new Date(existing.createdAt).getTime();
        if (ageMs < 24 * 3_600_000) return existing;
        // Key quá hạn → cho tạo đơn mới (tiếp tục flow bên dưới).
      }
    }
    const [policies, paymentMethods] = await Promise.all([
      this.settings.getStorePolicies(),
      this.settings.getPaymentMethods(),
    ]);
    const paymentEnabled: Partial<Record<PaymentMethod, boolean>> = {
      [PaymentMethod.COD]: paymentMethods.cod.enabled,
      [PaymentMethod.VNPAY_SANDBOX]: paymentMethods.vnpay.enabled,
      [PaymentMethod.BANK]: paymentMethods.bank.enabled,
    };
    if (paymentEnabled[dto.paymentMethod] === false) {
      throw new BadRequestException('Phương thức thanh toán hiện không khả dụng');
    }
    // Pre-check (UX/validation nhanh) — nguồn xác thực THẬT nằm trong transaction bên dưới
    const cart = await this.repo.findCartWithItems(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Giỏ hàng trống');
    }
    for (const item of cart.items) {
      if (!item.product.isActive) {
        throw new BadRequestException(`Sản phẩm "${item.product.name}" không còn bán`);
      }
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Sản phẩm "${item.product.name}" chỉ còn ${item.product.stock}`,
        );
      }
    }

    const pre = this.assembleItems(cart.items);

    let discountAmount = 0;
    let appliedPromoCode: string | null = null;
    let promoIdToIncrement: string | null = null;

    if (dto.promotionCode?.trim()) {
      const promo = await this.resolvePromotion(
        dto.promotionCode.trim().toUpperCase(),
        pre.subtotal,
        pre.cartProductIds,
      );
      discountAmount = promo.discountAmount;
      appliedPromoCode = promo.code;
      promoIdToIncrement = promo.id;
    }

    // Retry để chống trùng orderNumber khi có đơn tạo đồng thời (SEC-008)
    const MAX_ATTEMPTS = 4;
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.repo.runInTransaction(async (tx) => {
          // 1) Khóa dòng giỏ hàng → serialize checkout đồng thời của cùng user (chống double-submit, SEC-004)
          const locked = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM carts WHERE "userId" = ${userId} FOR UPDATE`;
          if (!locked.length) throw new BadRequestException('Giỏ hàng trống');
          const cartId = locked[0].id;

          // 2) Đọc lại items DƯỚI lock (nếu đơn trước đã xử lý xong sẽ thấy giỏ rỗng)
          const freshItems = await tx.cartItem.findMany({
            where: { cartId },
            include: { product: true },
          });
          if (freshItems.length === 0) throw new BadRequestException('Giỏ hàng trống');

          // Địa chỉ giao hàng (nếu có) phải thuộc về chính user (chống IDOR)
          if (dto.addressId) {
            const addr = await tx.address.findFirst({
              where: { id: dto.addressId, userId },
              select: { id: true },
            });
            if (!addr) throw new BadRequestException('Địa chỉ giao hàng không hợp lệ');
          }

          const { itemsData, subtotal } = this.assembleItems(freshItems);
          if (subtotal < policies.minOrderValue) {
            throw new BadRequestException(
              `Đơn tối thiểu ${policies.minOrderValue.toLocaleString('vi-VN')}đ`,
            );
          }
          // SEC-004: key cũ quá hạn (>24h) thì giải phóng để tái dùng — cùng transaction,
          // dưới cart lock nên không race với checkout khác của chính user.
          if (idempotencyKey) {
            await tx.order.deleteMany({
              where: {
                idempotencyKey,
                userId,
                createdAt: { lt: new Date(Date.now() - 24 * 3_600_000) },
              },
            });
          }
          const shippingFee = subtotal >= policies.freeShipThreshold ? 0 : policies.shippingFee;
          const discount = Math.min(discountAmount, subtotal);
          const totalAmount = Math.max(0, subtotal - discount + shippingFee);
          const orderNumber = await this.nextOrderNumberTx(tx);

          const order = await tx.order.create({
            data: {
              orderNumber,
              userId,
              addressId: dto.addressId,
              paymentMethod: dto.paymentMethod,
              subtotal,
              discountAmount: discount,
              shippingFee,
              totalAmount,
              promotionCode: appliedPromoCode,
              // SEC-004: bỏ qua nếu key quá hạn đã có chủ (unique) — replay lookup phía trên đã trả đơn cũ.
              idempotencyKey: idempotencyKey ?? undefined,
              note: dto.note,
              items: { create: itemsData },
            },
            include: { items: true },
          });

          // 3) Trừ kho NGUYÊN TỬ có điều kiện — chống oversell / kho âm / race (SEC-003)
          for (const it of freshItems) {
            const dec = await tx.product.updateMany({
              where: { id: it.productId, isActive: true, stock: { gte: it.quantity } },
              data: {
                stock: { decrement: it.quantity },
                soldCount: { increment: it.quantity },
              },
            });
            if (dec.count === 0) {
              // Ném lỗi → rollback toàn bộ transaction (kể cả order vừa tạo)
              throw new BadRequestException(`Sản phẩm "${it.product.name}" không đủ tồn kho`);
            }

            const after = await tx.product.findUnique({
              where: { id: it.productId },
              select: { stock: true },
            });
            const afterQty = after?.stock ?? 0;

            await tx.inventoryTransaction.create({
              data: {
                productId: it.productId,
                type: 'SALE',
                quantity: -it.quantity,
                reason: `Đơn ${orderNumber}`,
                refType: 'ORDER',
                refId: order.id,
                beforeQty: afterQty + it.quantity,
                afterQty,
                createdById: userId,
              },
            });
          }

          if (promoIdToIncrement) {
            // Tăng lượt dùng NGUYÊN TỬ, không vượt usageLimit khi có đơn đồng thời (SEC-015)
            const claimed = await tx.$executeRaw`
              UPDATE promotions SET "usageCount" = "usageCount" + 1
              WHERE id = ${promoIdToIncrement}
                AND ("usageLimit" IS NULL OR "usageCount" < "usageLimit")`;
            if (claimed === 0) {
              throw new BadRequestException('Mã khuyến mãi đã hết lượt sử dụng');
            }
          }

          await tx.cartItem.deleteMany({ where: { cartId } });
          this.logger.log(
            `Đơn ${orderNumber} bởi ${userId} | sub=${subtotal} disc=${discount} ship=${shippingFee} total=${totalAmount}`,
          );
          return order;
        });
      } catch (err) {
        if (this.isDuplicateOrderNumber(err) && attempt < MAX_ATTEMPTS) {
          this.logger.warn(`Trùng orderNumber, thử lại (lần ${attempt})`);
          continue;
        }
        // SEC-004: race 2 request cùng key — request thua thấy P2002 unique thì trả đơn đã thắng.
        if (idempotencyKey && this.isDuplicateIdempotencyKey(err)) {
          const raced = await this.repo.findUnique({
            where: { idempotencyKey },
            include: { items: true },
          });
          if (raced && raced.userId === userId) return raced;
        }
        throw err;
      }
    }
  }

  async listMyOrders(userId: string, q: OrderQueryDto) {
    const page = q.page ?? 1;
    const limit = Math.min(q.limit ?? 20, 50);
    const where: Prisma.OrderWhereInput = { userId };
    if (q.status) where.status = q.status;

    const [items, total] = await this.repo.transactionList(
      {
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: { product: { select: { id: true, name: true, imageUrl: true } } },
          },
          address: true,
        },
      },
      { where },
    );
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(orderId: string, userId: string, role: Role) {
    const order = await this.repo.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        address: true,
        user: { select: { id: true, email: true, fullName: true, phone: true } },
      },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (role === Role.CUSTOMER && order.userId !== userId) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }
    return order;
  }

  async listAllOrders(q: OrderQueryDto) {
    const page = q.page ?? 1;
    const limit = Math.min(q.limit ?? 20, 100);
    const where: Prisma.OrderWhereInput = {};
    if (q.status) where.status = q.status;

    const [items, total] = await this.repo.transactionList(
      {
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          items: { select: { id: true, quantity: true, productName: true } },
        },
      },
      { where },
    );
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getSummary(from?: string, to?: string) {
    const start = from ? new Date(from) : undefined;
    const end = to ? new Date(to) : undefined;
    if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
      throw new BadRequestException('Khoảng thời gian không hợp lệ');
    }
    if (start && end && start > end) throw new BadRequestException('Khoảng thời gian không hợp lệ');
    return this.repo.getSummary(start, end);
  }

  async getReport(from?: string, to?: string) {
    const start = from ? new Date(from) : undefined;
    const end = to ? new Date(to) : undefined;
    if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
      throw new BadRequestException('Khoảng thời gian không hợp lệ');
    }
    if (start && end && start > end) throw new BadRequestException('Khoảng thời gian không hợp lệ');
    return this.repo.getReport(start, end);
  }

  /** Xuất báo cáo CSV (BOM để mở đúng tiếng Việt trong Excel). */
  async exportReportCsv(from?: string, to?: string): Promise<string> {
    const report = await this.getReport(from, to);
    const lines: string[] = [];
    lines.push('Ngày,Doanh thu (VND),Số đơn');
    for (const d of report.daily) {
      lines.push(`${d.date},${d.revenue},${d.orders}`);
    }
    lines.push('');
    lines.push('Sản phẩm bán chạy');
    lines.push('Tên sản phẩm,Số lượng,Doanh thu (VND)');
    for (const p of report.topProducts) {
      lines.push(`"${p.name.replace(/"/g, '""')}",${p.quantity},${p.revenue}`);
    }
    return '﻿' + lines.join('\r\n');
  }

  async updateStatus(orderId: string, dto: UpdateOrderStatusDto, staffId: string) {
    const order = await this.repo.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    if (!this.canTransition(order.status, dto.status)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái từ ${order.status} sang ${dto.status}`,
      );
    }

    const data: Prisma.OrderUpdateInput = { status: dto.status };
    if (dto.status === OrderStatus.CONFIRMED) data.confirmedAt = new Date();
    if (dto.status === OrderStatus.DELIVERING) data.deliveredAt = new Date();
    if (dto.status === OrderStatus.COMPLETED) {
      // SEC-025: đơn trả trước (VNPay/BANK) chưa thanh toán thì KHÔNG được hoàn tất —
      // nếu không sẽ ghi nhận doanh thu + điểm thưởng cho đơn chưa có tiền.
      if (
        order.paymentMethod !== PaymentMethod.COD &&
        (order.paymentStatus === PaymentStatus.UNPAID ||
          order.paymentStatus === PaymentStatus.FAILED)
      ) {
        throw new BadRequestException(
          'Đơn chưa thanh toán — cần xác nhận thanh toán trước khi hoàn tất đơn',
        );
      }
      data.completedAt = new Date();
    }
    if (dto.status === OrderStatus.CANCELED) {
      data.canceledAt = new Date();
      if (dto.reason) data.cancelReason = dto.reason;
      // Đơn đã thu tiền mà bị huỷ → đánh dấu REFUNDED để kế toán xử lý hoàn tiền.
      if (order.paymentStatus === PaymentStatus.PAID) {
        data.paymentStatus = PaymentStatus.REFUNDED;
      }
    }

    const updated = await this.repo.runInTransaction(async (tx) => {
      const upd = await tx.order.update({ where: { id: orderId }, data });

      // Cộng điểm tích lũy khi đơn hoàn tất (10.000đ = 1 điểm), cập nhật hạng VIP
      if (dto.status === OrderStatus.COMPLETED) {
        const points = Math.floor(Number(order.totalAmount) / 10_000);
        if (points > 0) {
          const u = await tx.user.update({
            where: { id: order.userId },
            data: { loyaltyPoints: { increment: points } },
            select: { loyaltyPoints: true },
          });
          await tx.user.update({
            where: { id: order.userId },
            data: { isVip: u.loyaltyPoints >= VIP_THRESHOLD },
          });
          await tx.order.update({
            where: { id: orderId },
            data: { loyaltyEarned: points },
          });
        }
      }

      if (dto.status === OrderStatus.CANCELED) {
        for (const item of order.items) {
          // Hoàn kho + trả lại soldCount (nguyên tử trong 1 update)
          const p = await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
              soldCount: { decrement: item.quantity },
            },
            select: { stock: true },
          });
          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              type: 'RETURN',
              quantity: item.quantity,
              reason: `Hủy đơn ${order.orderNumber}`,
              refType: 'ORDER',
              refId: orderId,
              beforeQty: p.stock - item.quantity,
              afterQty: p.stock,
              createdById: staffId,
            },
          });
        }
        // Hoàn lại lượt dùng mã khuyến mãi đã áp cho đơn
        if (order.promotionCode) {
          await tx.promotion.updateMany({
            where: { code: order.promotionCode, usageCount: { gt: 0 } },
            data: { usageCount: { decrement: 1 } },
          });
        }
      }
      return upd;
    });
    return updated;
  }

  // ========== Private helpers (use repo's prisma internally via runInTransaction) ==========

  private async resolvePromotion(code: string, subtotal: number, cartProductIds: Set<string>) {
    // tx trong runInTransaction là TransactionClient (model delegates không typed) →
    // ép về payload chuẩn tại biên, logic bên dưới dùng type thật.
    // Trả promo RA KHỎI transaction (thay vì gán biến ngoài) — TS narrow được, không thành never.
    const promo: PromotionWithProducts | null = await this.repo.runInTransaction(async (tx) => {
      // SAFETY: TransactionClient không expose typed model delegates — ép hẹp tại biên duy nhất
      // này; shape trả về khớp PromotionWithProducts do query select/include tường minh ở dưới.
      const found = await (
        tx as unknown as {
          promotion: { findFirst: (a: unknown) => Promise<PromotionWithProducts | null> };
        }
      ).promotion.findFirst({
        where: { code, isActive: true },
        include: { products: true },
      });
      return found;
    });
    if (!promo) throw new BadRequestException('Mã khuyến mãi không tồn tại hoặc đã hết hạn');

    const now = new Date();
    if (promo.startDate > now || promo.endDate < now) {
      throw new BadRequestException('Mã khuyến mãi chưa đến hạn hoặc đã hết hạn');
    }
    if (promo.usageLimit != null && promo.usageCount >= promo.usageLimit) {
      throw new BadRequestException('Mã khuyến mãi đã hết lượt sử dụng');
    }
    const minOrder = promo.minOrderValue != null ? Number(promo.minOrderValue) : 0;
    if (subtotal < minOrder) {
      throw new BadRequestException(
        `Đơn tối thiểu ${minOrder.toLocaleString('vi-VN')}đ để dùng mã ${promo.code}`,
      );
    }

    if (promo.products.length > 0) {
      const allowed = new Set(promo.products.map((p) => p.productId));
      const hit = [...cartProductIds].some((id) => allowed.has(id));
      if (!hit) {
        throw new BadRequestException('Mã khuyến mãi không áp dụng cho sản phẩm trong giỏ');
      }
    }

    const value = Number(promo.discountValue);
    let discount = 0;
    switch (promo.type) {
      case PromotionType.PERCENT:
      case PromotionType.EXPIRY_DISCOUNT:
      case PromotionType.FLASH_SALE:
        discount = (subtotal * value) / 100;
        break;
      case PromotionType.AMOUNT:
      case PromotionType.COMBO:
        discount = value;
        break;
      default:
        discount = value;
    }

    if (promo.maxDiscount != null) {
      discount = Math.min(discount, Number(promo.maxDiscount));
    }
    discount = Math.min(Math.max(0, discount), subtotal);
    discount = Math.round(discount);

    if (discount <= 0) {
      throw new BadRequestException('Mã khuyến mãi không tạo được giảm giá cho đơn này');
    }

    return { id: promo.id, code: promo.code, discountAmount: discount };
  }

  /** Gom itemsData + subtotal + tập productId từ danh sách cart item. */
  private assembleItems(cartItems: CartItemWithProduct[]) {
    let subtotal = 0;
    const cartProductIds = new Set<string>();
    const itemsData = cartItems.map((it) => {
      const price = Number(it.product.salePrice ?? it.product.price);
      const lineTotal = price * it.quantity;
      subtotal += lineTotal;
      cartProductIds.add(it.product.id);
      return {
        productId: it.product.id,
        productName: it.product.name,
        unitPrice: price,
        quantity: it.quantity,
        subtotal: lineTotal,
      };
    });
    return { itemsData, subtotal, cartProductIds };
  }

  /** Sinh orderNumber trong transaction (count trong cùng tx để giảm khả năng trùng). */
  private async nextOrderNumberTx(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const count = await tx.order.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    return `SMM-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  /** Nhận diện lỗi vi phạm unique constraint orderNumber (Prisma P2002) để retry. */
  private isDuplicateOrderNumber(err: unknown): boolean {
    return this.isUniqueViolationOn(err, 'ordernumber');
  }

  /** SEC-004: unique index nào của orders bị đụng — orderNumber (retry) hay idempotencyKey (race). */
  private isDuplicateIdempotencyKey(err: unknown): boolean {
    return this.isUniqueViolationOn(err, 'idempotencykey');
  }

  private isUniqueViolationOn(err: unknown, field: string): boolean {
    const e = err as { code?: string; meta?: { target?: unknown } };
    if (e?.code !== 'P2002') return false;
    const target = e.meta?.target;
    const asText = Array.isArray(target) ? target.join(',') : String(target ?? '');
    return asText.toLowerCase().includes(field);
  }

  private canTransition(from: OrderStatus, to: OrderStatus): boolean {
    const flow: Record<OrderStatus, OrderStatus[]> = {
      PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELED],
      CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELED],
      PREPARING: [OrderStatus.DELIVERING, OrderStatus.CANCELED],
      DELIVERING: [OrderStatus.COMPLETED, OrderStatus.CANCELED],
      COMPLETED: [],
      CANCELED: [],
    };
    return flow[from]?.includes(to) ?? false;
  }
}
