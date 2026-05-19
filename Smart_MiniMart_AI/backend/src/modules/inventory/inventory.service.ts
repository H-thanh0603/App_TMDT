import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async listTransactions(productId?: string, limit = 50) {
    return this.prisma.inventoryTransaction.findMany({
      where: productId ? { productId } : {},
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      include: {
        product: { select: { id: true, name: true, sku: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async adjustStock(dto: AdjustStockDto, userId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');

    const before = product.stock;
    const after = before + dto.delta;
    if (after < 0) {
      throw new Error('Tồn kho sau điều chỉnh không thể âm');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: dto.productId },
        data: { stock: after },
      });
      await tx.inventoryTransaction.create({
        data: {
          productId: dto.productId,
          type: dto.type,
          quantity: dto.delta,
          reason: dto.reason ?? 'Điều chỉnh kho',
          refType: 'MANUAL',
          beforeQty: before,
          afterQty: after,
          createdById: userId,
        },
      });
      return updated;
    });
  }

  async expiringProducts(thresholdDays = 30) {
    const now = new Date();
    const limit = new Date();
    limit.setDate(now.getDate() + thresholdDays);

    const items = await this.prisma.product.findMany({
      where: {
        isActive: true,
        expiryDate: { not: null, gte: now, lte: limit },
        stock: { gt: 0 },
      },
      orderBy: { expiryDate: 'asc' },
      include: { category: { select: { name: true } } },
    });

    return items.map((p) => {
      const days = Math.ceil(
        (new Date(p.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const tier = days <= 7 ? 'CRITICAL' : days <= 15 ? 'WARNING' : 'NOTICE';
      return { ...p, daysToExpire: days, alertTier: tier };
    });
  }

  async slowMovingProducts(days = 30, minStock = 10) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const products = await this.prisma.product.findMany({
      where: { isActive: true, stock: { gte: minStock } },
      include: { category: { select: { name: true } } },
    });

    const result = await Promise.all(
      products.map(async (p) => {
        const sold = await this.prisma.orderItem.aggregate({
          where: {
            productId: p.id,
            order: { status: 'COMPLETED', createdAt: { gte: since } },
          },
          _sum: { quantity: true },
        });
        const soldQty = sold._sum.quantity ?? 0;
        const turnoverRate = soldQty / p.stock;
        return { ...p, soldInPeriod: soldQty, turnoverRate };
      }),
    );

    return result
      .filter((p) => p.turnoverRate < 0.3)
      .sort((a, b) => a.turnoverRate - b.turnoverRate);
  }

  async restockSuggestions(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: { category: { select: { name: true } } },
    });

    const result = await Promise.all(
      products.map(async (p) => {
        const sold = await this.prisma.orderItem.aggregate({
          where: {
            productId: p.id,
            order: { status: 'COMPLETED', createdAt: { gte: since } },
          },
          _sum: { quantity: true },
        });
        const soldQty = sold._sum.quantity ?? 0;
        const dailyRate = soldQty / days;
        const projectedDays = dailyRate > 0 ? Math.floor(p.stock / dailyRate) : 999;
        const suggested = dailyRate > 0
          ? Math.max(p.maxStock - p.stock, Math.ceil(dailyRate * 14))
          : 0;
        return {
          id: p.id, name: p.name, currentStock: p.stock, minStock: p.minStock,
          maxStock: p.maxStock, soldInPeriod: soldQty, dailyRate: Number(dailyRate.toFixed(2)),
          projectedDays, suggestedRestock: suggested,
          urgency: projectedDays <= 3 ? 'HIGH' : projectedDays <= 7 ? 'MEDIUM' : 'LOW',
        };
      }),
    );

    return result.filter((r) => r.suggestedRestock > 0 && r.currentStock < r.minStock * 2)
                 .sort((a, b) => a.projectedDays - b.projectedDays);
  }
}
