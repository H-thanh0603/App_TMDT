import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

/** Port — Clean Architecture boundary cho Order aggregate */
export interface IOrderRepository {
  findCartWithItems(userId: string): Promise<any | null>;
  countOrders(args?: Prisma.OrderCountArgs): Promise<number>;
  findUnique(args: Prisma.OrderFindUniqueArgs): Promise<any | null>;
  findMany(args: Prisma.OrderFindManyArgs): Promise<any[]>;
  transactionList(
    findManyArgs: Prisma.OrderFindManyArgs,
    countArgs: Prisma.OrderCountArgs,
  ): Promise<[any[], number]>;
  getSummary(from?: Date, to?: Date): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    completedRevenue: number;
    periodOrders: number;
    periodRevenue: number;
  }>;
  getReport(from: Date | undefined, to: Date | undefined): Promise<{
    from: Date | undefined;
    to: Date | undefined;
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    statusBreakdown: Record<string, number>;
    daily: Array<{ date: string; revenue: number; orders: number }>;
    topProducts: Array<{ productId: string; name: string; quantity: number; revenue: number }>;
  }>;
  /** Full create-order unit of work */
  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCartWithItems(userId: string) {
    return this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: { include: { product: true } },
      },
    });
  }

  countOrders(args?: Prisma.OrderCountArgs) {
    return this.prisma.order.count(args);
  }

  findUnique(args: Prisma.OrderFindUniqueArgs) {
    return this.prisma.order.findUnique(args);
  }

  findMany(args: Prisma.OrderFindManyArgs) {
    return this.prisma.order.findMany(args);
  }

  transactionList(findManyArgs: Prisma.OrderFindManyArgs, countArgs: Prisma.OrderCountArgs) {
    return this.prisma.$transaction([
      this.prisma.order.findMany(findManyArgs),
      this.prisma.order.count(countArgs),
    ]) as Promise<[any[], number]>;
  }

  async getSummary(from?: Date, to?: Date) {
    const completed = { status: 'COMPLETED' as const };
    const period = from || to
      ? { ...completed, createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }
      : completed;
    const [totalOrders, pendingOrders, allCompleted, periodCompleted] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.aggregate({ where: completed, _count: true, _sum: { totalAmount: true } }),
      this.prisma.order.aggregate({ where: period, _count: true, _sum: { totalAmount: true } }),
    ]);
    return {
      totalOrders,
      pendingOrders,
      completedOrders: allCompleted._count,
      completedRevenue: Number(allCompleted._sum.totalAmount ?? 0),
      periodOrders: periodCompleted._count,
      periodRevenue: Number(periodCompleted._sum.totalAmount ?? 0),
    };
  }

  async getReport(from: Date | undefined, to: Date | undefined) {
    const completed = { status: 'COMPLETED' as const };
    const periodWhere = from || to
      ? { ...completed, completedAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }
      : completed;

    // Doanh thu/đơn COMPLETED trong kỳ
    const agg = await this.prisma.order.aggregate({
      where: periodWhere,
      _count: true,
      _sum: { totalAmount: true },
    });

    // Phân bổ theo trạng thái (toàn kỳ có completedAt → coi mọi đơn nếu không period)
    const statusGroups = await this.prisma.order.groupBy({
      by: ['status'],
      _count: true,
      where: from || to ? { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } } : undefined,
    });

    // Trend theo ngày — dùng completedAt (ngày hoàn thành) để ra doanh thu thực
    const dailyRaw = await this.prisma.$queryRaw<Array<{ date: string; revenue: number; orders: number }>>`
      SELECT to_char("completedAt", 'YYYY-MM-DD') AS date,
             COALESCE(SUM("totalAmount"), 0)::int AS revenue,
             COUNT(*)::int AS orders
      FROM orders
      WHERE "status" = 'COMPLETED'
        AND "completedAt" IS NOT NULL
        ${from ? Prisma.sql`AND "completedAt" >= ${from}` : Prisma.empty}
        ${to ? Prisma.sql`AND "completedAt" <= ${to}` : Prisma.empty}
      GROUP BY to_char("completedAt", 'YYYY-MM-DD')
      ORDER BY date ASC`;

    // Top sản phẩm bán chạy theo doanh thu (từ COMPLETED đơn hôm nay — period coi đơn mới nhất trước)
    const periodIds = await this.prisma.order.findMany({
      where: periodWhere,
      select: { id: true },
      orderBy: { completedAt: 'desc' },
      take: 500,
    });
    const topProductsRaw = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { status: 'COMPLETED', id: { in: periodIds.map((o) => o.id) } } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 10,
    });
    const topProducts = await Promise.all(
      topProductsRaw.map(async (row) => {
        const p = await this.prisma.product.findUnique({
          where: { id: row.productId },
          select: { name: true },
        });
        return {
          productId: row.productId,
          name: p?.name ?? '—',
          quantity: Number(row._sum.quantity ?? 0),
          revenue: Number(row._sum.subtotal ?? 0),
        };
      }),
    );

    return {
      from,
      to,
      totalRevenue: Number(agg._sum.totalAmount ?? 0),
      totalOrders: agg._count,
      avgOrderValue: agg._count > 0 ? Math.round(Number(agg._sum.totalAmount ?? 0) / agg._count) : 0,
      statusBreakdown: Object.fromEntries(statusGroups.map((s) => [s.status, s._count])),
      daily: dailyRaw.map((d) => ({
        date: d.date,
        revenue: Number(d.revenue),
        orders: Number(d.orders),
      })),
      topProducts,
    };
  }

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(fn);
  }
}
