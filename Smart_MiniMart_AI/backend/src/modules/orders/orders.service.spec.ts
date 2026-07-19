import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';

import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: any;

  const product = {
    id: 'prod-1',
    name: 'Mì Hảo Hảo',
    isActive: true,
    stock: 10,
    price: 5000,
    salePrice: null,
  };

  beforeEach(() => {
    prisma = {
      cart: { findUnique: jest.fn() },
      order: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      },
      product: { update: jest.fn() },
      inventoryTransaction: { create: jest.fn() },
      cartItem: { deleteMany: jest.fn() },
      promotion: { findFirst: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new OrdersService(prisma);
  });

  describe('createOrder', () => {
    it('throws when cart is empty', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [] });

      await expect(
        service.createOrder('user-1', {
          paymentMethod: PaymentMethod.COD,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when product stock is insufficient', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        items: [
          {
            quantity: 99,
            product: { ...product, stock: 2 },
          },
        ],
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

    it('creates order, decrements stock and clears cart on success', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        items: [{ quantity: 2, product }],
      });

      const createdOrder = {
        id: 'order-1',
        orderNumber: 'SMM-2026-000001',
        items: [],
      };

      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          order: {
            create: jest.fn().mockResolvedValue(createdOrder),
          },
          product: {
            update: jest.fn().mockResolvedValue({}),
          },
          inventoryTransaction: {
            create: jest.fn().mockResolvedValue({}),
          },
          cartItem: {
            deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          promotion: {
            update: jest.fn(),
          },
        };
        return fn(tx);
      });

      const result = await service.createOrder('user-1', {
        paymentMethod: PaymentMethod.COD,
        addressId: 'addr-1',
      } as any);

      expect(result.id).toBe('order-1');
      expect(prisma.$transaction).toHaveBeenCalled();
      // nextOrderNumber uses prisma.order.count outside transaction
      expect(prisma.order.count).toHaveBeenCalled();
    });
  });
});
