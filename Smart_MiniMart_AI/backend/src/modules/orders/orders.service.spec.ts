import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { OrdersService } from './orders.service';
import { IOrderRepository } from './repositories/order.repository';

describe('OrdersService', () => {
  let service: OrdersService;
  let repo: jest.Mocked<IOrderRepository>;

  const product = {
    id: 'prod-1',
    name: 'Mì Hảo Hảo',
    isActive: true,
    stock: 10,
    price: 5000,
    salePrice: null,
  };

  /** Tạo tx mock giả lập Prisma.TransactionClient dùng trong runInTransaction. */
  function makeTx(overrides: any = {}) {
    return {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'cart-1' }]),
      cartItem: {
        findMany: jest.fn().mockResolvedValue([{ quantity: 2, productId: 'prod-1', product }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      order: {
        count: jest.fn().mockResolvedValue(0),
        create: jest
          .fn()
          .mockResolvedValue({ id: 'order-1', orderNumber: 'SMM-2026-000001', items: [] }),
        update: jest.fn().mockResolvedValue({ id: 'order-1', status: 'CANCELED' }),
      },
      product: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({ stock: 8 }),
        update: jest.fn().mockResolvedValue({ stock: 12 }),
      },
      address: { findFirst: jest.fn().mockResolvedValue({ id: 'addr-1' }) },
      inventoryTransaction: { create: jest.fn().mockResolvedValue({}) },
      user: {
        update: jest.fn().mockResolvedValue({ loyaltyPoints: 25 }),
      },
      promotion: {
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $executeRaw: jest.fn().mockResolvedValue(1),
      ...overrides,
    };
  }

  beforeEach(() => {
    repo = {
      findCartWithItems: jest.fn(),
      countOrders: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      transactionList: jest.fn(),
      runInTransaction: jest.fn(),
    };
    service = new OrdersService(repo);
  });

  describe('createOrder', () => {
    it('throws when cart is empty', async () => {
      repo.findCartWithItems.mockResolvedValue({ id: 'cart-1', items: [] });

      await expect(
        service.createOrder('user-1', { paymentMethod: PaymentMethod.COD } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when product stock is insufficient (pre-check)', async () => {
      repo.findCartWithItems.mockResolvedValue({
        id: 'cart-1',
        items: [{ quantity: 99, product: { ...product, stock: 2 } }],
      });

      await expect(
        service.createOrder('user-1', { paymentMethod: PaymentMethod.COD } as any),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: expect.stringContaining('chỉ còn'),
        }),
      });
    });

    it('creates order with atomic stock decrement and clears cart on success', async () => {
      repo.findCartWithItems.mockResolvedValue({
        id: 'cart-1',
        items: [{ quantity: 2, product }],
      });
      const tx = makeTx();
      repo.runInTransaction.mockImplementation(async (fn: any) => fn(tx));

      const result = await service.createOrder('user-1', {
        paymentMethod: PaymentMethod.COD,
        addressId: 'addr-1',
      } as any);

      expect(result.id).toBe('order-1');
      // Trừ kho phải là conditional update guard theo stock >= quantity (chống oversell)
      expect(tx.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'prod-1', isActive: true, stock: { gte: 2 } },
        data: { stock: { decrement: 2 }, soldCount: { increment: 2 } },
      });
      expect(tx.cartItem.deleteMany).toHaveBeenCalled();
    });

    it('rolls back (throws) when stock guard fails — no oversell (SEC-003)', async () => {
      repo.findCartWithItems.mockResolvedValue({
        id: 'cart-1',
        items: [{ quantity: 2, product }],
      });
      // updateMany trả count=0 → hết hàng ngay trước khi commit
      const tx = makeTx({
        product: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findUnique: jest.fn(),
        },
      });
      repo.runInTransaction.mockImplementation(async (fn: any) => fn(tx));

      await expect(
        service.createOrder('user-1', { paymentMethod: PaymentMethod.COD } as any),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: expect.stringContaining('không đủ tồn kho'),
        }),
      });
      expect(tx.cartItem.deleteMany).not.toHaveBeenCalled();
    });

    it('treats a concurrent duplicate checkout as empty cart (SEC-004 idempotency via lock)', async () => {
      repo.findCartWithItems.mockResolvedValue({
        id: 'cart-1',
        items: [{ quantity: 2, product }],
      });
      // Dưới lock, giỏ đã bị đơn trước xử lý → rỗng
      const tx = makeTx({
        cartItem: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn() },
      });
      repo.runInTransaction.mockImplementation(async (fn: any) => fn(tx));

      await expect(
        service.createOrder('user-1', { paymentMethod: PaymentMethod.COD } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an order using an addressId that does not belong to the user (IDOR)', async () => {
      repo.findCartWithItems.mockResolvedValue({
        id: 'cart-1',
        items: [{ quantity: 2, product }],
      });
      const tx = makeTx({ address: { findFirst: jest.fn().mockResolvedValue(null) } });
      repo.runInTransaction.mockImplementation(async (fn: any) => fn(tx));

      await expect(
        service.createOrder('user-1', {
          paymentMethod: PaymentMethod.COD,
          addressId: 'addr-of-someone-else',
        } as any),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: expect.stringContaining('Địa chỉ giao hàng không hợp lệ'),
        }),
      });
      expect(tx.order.create).not.toHaveBeenCalled();
    });

    it('retries on duplicate orderNumber (P2002) then succeeds (SEC-008)', async () => {
      repo.findCartWithItems.mockResolvedValue({
        id: 'cart-1',
        items: [{ quantity: 2, product }],
      });
      const p2002 = Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
        meta: { target: ['orderNumber'] },
      });
      const tx = makeTx();
      repo.runInTransaction
        .mockImplementationOnce(async () => {
          throw p2002;
        })
        .mockImplementationOnce(async (fn: any) => fn(tx));

      const result = await service.createOrder('user-1', {
        paymentMethod: PaymentMethod.COD,
      } as any);

      expect(result.id).toBe('order-1');
      expect(repo.runInTransaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateStatus (SEC-018 cancel restores state)', () => {
    it('restores stock, decrements soldCount, refunds coupon usage on cancel', async () => {
      repo.findUnique.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'SMM-2026-000001',
        status: 'CONFIRMED',
        promotionCode: 'WELCOME10',
        items: [{ productId: 'prod-1', quantity: 2 }],
      });
      const tx = makeTx();
      repo.runInTransaction.mockImplementation(async (fn: any) => fn(tx));

      await service.updateStatus(
        'order-1',
        { status: 'CANCELED', reason: 'hết hàng' } as any,
        'staff-1',
      );

      // Hoàn kho + trả soldCount trong 1 update nguyên tử
      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { increment: 2 }, soldCount: { decrement: 2 } },
        select: { stock: true },
      });
      // Hoàn lượt dùng coupon
      expect(tx.promotion.updateMany).toHaveBeenCalledWith({
        where: { code: 'WELCOME10', usageCount: { gt: 0 } },
        data: { usageCount: { decrement: 1 } },
      });
    });

    it('awards loyalty points and sets loyaltyEarned when order is COMPLETED (LOW-07)', async () => {
      repo.findUnique.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'SMM-2026-000001',
        status: 'DELIVERING',
        userId: 'user-1',
        totalAmount: 250000,
        items: [],
      });
      const tx = makeTx();
      repo.runInTransaction.mockImplementation(async (fn: any) => fn(tx));

      await service.updateStatus('order-1', { status: 'COMPLETED' } as any, 'staff-1');

      // 250000 / 10000 = 25 điểm
      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { loyaltyPoints: { increment: 25 } },
        select: { loyaltyPoints: true },
      });
      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { loyaltyEarned: 25 },
      });
    });

    it('rejects an invalid status transition', async () => {
      repo.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'COMPLETED',
        items: [],
      });

      await expect(
        service.updateStatus('order-1', { status: 'PENDING' } as any, 'staff-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
