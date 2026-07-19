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
        service.createOrder('user-1', {
          paymentMethod: PaymentMethod.COD,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when product stock is insufficient', async () => {
      repo.findCartWithItems.mockResolvedValue({
        id: 'cart-1',
        items: [{ quantity: 99, product: { ...product, stock: 2 } }],
      });

      await expect(
        service.createOrder('user-1', {
          paymentMethod: PaymentMethod.COD,
        } as any),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: expect.stringContaining('chỉ còn'),
        }),
      });
    });

    it('creates order and clears cart on success', async () => {
      repo.findCartWithItems.mockResolvedValue({
        id: 'cart-1',
        items: [{ quantity: 2, product }],
      });

      const createdOrder = {
        id: 'order-1',
        orderNumber: 'SMM-2026-000001',
        items: [],
      };

      repo.runInTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          order: { create: jest.fn().mockResolvedValue(createdOrder) },
          product: { update: jest.fn().mockResolvedValue({}) },
          inventoryTransaction: { create: jest.fn().mockResolvedValue({}) },
          cartItem: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
          promotion: { update: jest.fn() },
        };
        return fn(tx);
      });

      const result = await service.createOrder('user-1', {
        paymentMethod: PaymentMethod.COD,
        addressId: 'addr-1',
      } as any);

      expect(result.id).toBe('order-1');
      expect(repo.runInTransaction).toHaveBeenCalled();
    });
  });
});
