import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, Role } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderQueryDto } from './dto/order-query.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private prisma: PrismaService) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: { include: { product: true } },
      },
    });
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

    // Compute totals
    let subtotal = 0;
    const itemsData = cart.items.map((it) => {
      const price = Number(it.product.salePrice ?? it.product.price);
      const lineTotal = price * it.quantity;
      subtotal += lineTotal;
      return {
        productId: it.product.id,
        productName: it.product.name,
        unitPrice: price,
        quantity: it.quantity,
        subtotal: lineTotal,
      };
    });

    const shippingFee = subtotal >= 200_000 ? 0 : 15_000;
    const totalAmount = subtotal + shippingFee;

    const orderNumber = await this.nextOrderNumber();

    // Transaction: create order + decrement stock + log + clear cart
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId: dto.addressId,
          paymentMethod: dto.paymentMethod,
          subtotal,
          shippingFee,
          totalAmount,
          promotionCode: dto.promotionCode,
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

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      this.logger.log(`Đơn hàng ${orderNumber} được tạo bởi ${userId}`);
      return order;
    });
  }

  async listMyOrders(userId: string, q: OrderQueryDto) {
    const page = q.page ?? 1;
    const limit = Math.min(q.limit ?? 20, 50);
    const where: Prisma.OrderWhereInput = { userId };
    if (q.status) where.status = q.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
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
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(orderId: string, userId: string, role: Role) {
    const order = await this.prisma.order.findUnique({
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

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          items: { select: { id: true, quantity: true, productName: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateStatus(orderId: string, dto: UpdateOrderStatusDto, staffId: string) {
    const order = await this.prisma.order.findUnique({
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
    if (dto.status === OrderStatus.CONFIRMED)  data.confirmedAt = new Date();
    if (dto.status === OrderStatus.DELIVERING) data.deliveredAt = new Date();
    if (dto.status === OrderStatus.COMPLETED) {
      data.completedAt = new Date();
      data.paymentStatus = 'PAID';
      data.loyaltyEarned = Math.floor(Number(order.totalAmount) / 10_000);
    }
    if (dto.status === OrderStatus.CANCELED) {
      data.canceledAt = new Date();
      data.cancelReason = dto.reason ?? 'Bị hủy';
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({ where: { id: orderId }, data });

      // Khi hủy: hoàn kho
      if (dto.status === OrderStatus.CANCELED && order.status !== OrderStatus.CANCELED) {
        for (const it of order.items) {
          const p = await tx.product.findUnique({ where: { id: it.productId } });
          if (!p) continue;
          await tx.product.update({
            where: { id: it.productId },
            data: {
              stock: { increment: it.quantity },
              soldCount: { decrement: it.quantity },
            },
          });
          await tx.inventoryTransaction.create({
            data: {
              productId: it.productId,
              type: 'RETURN',
              quantity: it.quantity,
              reason: `Hủy đơn ${order.orderNumber}`,
              refType: 'ORDER',
              refId: order.id,
              beforeQty: p.stock,
              afterQty: p.stock + it.quantity,
              createdById: staffId,
            },
          });
        }
      }

      // Cộng điểm khi hoàn tất
      if (dto.status === OrderStatus.COMPLETED && data.loyaltyEarned) {
        await tx.user.update({
          where: { id: order.userId },
          data: { loyaltyPoints: { increment: data.loyaltyEarned as number } },
        });
      }

      return updated;
    });
  }

  // ========== Helpers ==========

  private async nextOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.order.count({
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
      PENDING:    [OrderStatus.CONFIRMED, OrderStatus.CANCELED],
      CONFIRMED:  [OrderStatus.PREPARING, OrderStatus.CANCELED],
      PREPARING:  [OrderStatus.DELIVERING, OrderStatus.CANCELED],
      DELIVERING: [OrderStatus.COMPLETED, OrderStatus.CANCELED],
      COMPLETED:  [],
      CANCELED:   [],
    };
    return flow[from]?.includes(to) ?? false;
  }
}
