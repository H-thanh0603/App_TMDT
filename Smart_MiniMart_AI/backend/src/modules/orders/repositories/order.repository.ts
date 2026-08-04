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

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(fn);
  }
}
