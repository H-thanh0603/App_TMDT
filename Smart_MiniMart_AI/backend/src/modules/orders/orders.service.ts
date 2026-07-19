import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { OrderStatus, Prisma, PromotionType, Role } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { ORDER_REPOSITORY, IOrderRepository } from './repositories/order.repository';

const VIP_THRESHOLD = 1_000;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly repo: IOrderRepository,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const cart = await this.repo.findCartWithItems(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Giỏ hàng trống');
    }

    // Validate stock
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

    let subtotal = 0;
    const cartProductIds = new Set<string>();
    const itemsData = cart.items.map((it: any) => {
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

    const shippingFee = subtotal >= 200_000 ? 0 : 15_000;

    let discountAmount = 0;
    let appliedPromoCode: string | null = null;
    let promoIdToIncrement: string | null = null;

    if (dto.promotionCode?.trim()) {
      const promo = await this.resolvePromotion(
        dto.promotionCode.trim().toUpperCase(),
        subtotal,
        cartProductIds,
      );
      discountAmount = promo.discountAmount;
      appliedPromoCode = promo.code;
      promoIdToIncrement = promo.id;
    }

    const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);
    const orderNumber = await this.nextOrderNumber();

    return this.repo.runInTransaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId: dto.addressId,
          paymentMethod: dto.paymentMethod,
          subtotal,
          discountAmount,
          shippingFee,
          totalAmount,
          promotionCode: appliedPromoCode,
          note: dto.note,
          items: { create: itemsData },
        },
        include: { items: true },
      });

      for (const it of cart.items) {
        await tx.product.update({
          where: { id: it.product.id },
          data: {
            stock: { decrement: it.quantity },
            soldCount: { increment: it.quantity },
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: it.product.id,
            type: 'SALE',
            quantity: -it.quantity,
            reason: `Đơn ${orderNumber}`,
            refType: 'ORDER',
            refId: order.id,
            beforeQty: it.product.stock,
            afterQty: it.product.stock - it.quantity,
            createdById: userId,
          },
        });
      }

      if (promoIdToIncrement) {
        await tx.promotion.update({
          where: { id: promoIdToIncrement },
          data: { usageCount: { increment: 1 } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      this.logger.log(
        `Đơn ${orderNumber} bởi ${userId} | sub=${subtotal} disc=${discountAmount} ship=${shippingFee} total=${totalAmount}`,
      );
      return order;
    });
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
    if (dto.status === OrderStatus.COMPLETED) data.completedAt = new Date();

    const updated = await this.repo.runInTransaction(async (tx) => {
      const upd = await tx.order.update({ where: { id: orderId }, data });

      if (dto.status === OrderStatus.CANCELED) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              type: 'RETURN',
              quantity: item.quantity,
              reason: `Hủy đơn ${order.orderNumber}`,
              refType: 'ORDER',
              refId: orderId,
              beforeQty: 0,
              afterQty: (await tx.product.findUnique({ where: { id: item.productId } }))?.stock ?? 0,
              createdById: staffId,
            },
          });
        }
      }
      return upd;
    });
    return updated;
  }

  // ========== Private helpers (use repo's prisma internally via runInTransaction) ==========

  private async resolvePromotion(code: string, subtotal: number, cartProductIds: Set<string>) {
    let promo: any;
    await this.repo.runInTransaction(async (tx) => {
      promo = await tx.promotion.findFirst({
        where: { code, isActive: true },
        include: { products: true },
      });
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
      const allowed = new Set(promo.products.map((p: any) => p.productId));
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

  private async nextOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.repo.countOrders({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    return `SMM-${year}-${String(count + 1).padStart(6, '0')}`;
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
