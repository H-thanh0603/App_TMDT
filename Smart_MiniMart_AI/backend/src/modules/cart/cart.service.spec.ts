import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';

const product = {
  id: 'prod-1',
  name: 'Mì Hảo Hảo',
  isActive: true,
  stock: 10,
  price: 5000,
  salePrice: 4500,
};

function cartWith(items: any[]) {
  return {
    id: 'cart-1',
    items: items.map((it, i) => ({
      id: `ci-${i}`,
      quantity: it.quantity,
      product: it.product,
      createdAt: new Date(),
    })),
  };
}

describe('CartService', () => {
  let service: CartService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      cart: {
        upsert: jest.fn().mockResolvedValue({ id: 'cart-1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'cart-1' }),
      },
      cartItem: {
        upsert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      product: { findUnique: jest.fn() },
    };
    service = new CartService(prisma);
  });

  it('computes subtotal with salePrice and item count', async () => {
    // 2 x salePrice 4500 + 1 x price 5000 = 14000
    prisma.cart.upsert.mockResolvedValue(
      cartWith([
        { quantity: 2, product },
        { quantity: 1, product: { ...product, salePrice: null } },
      ]),
    );

    const cart = await service.getCart('user-1');

    expect(cart.subtotal).toBe(14000);
    expect(cart.itemCount).toBe(3);
  });

  it('rejects adding an inactive product', async () => {
    prisma.product.findUnique.mockResolvedValue({ ...product, isActive: false });

    await expect(service.addItem('user-1', { productId: 'prod-1', quantity: 1 } as any)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects adding more than stock', async () => {
    prisma.product.findUnique.mockResolvedValue(product);

    await expect(
      service.addItem('user-1', { productId: 'prod-1', quantity: 99 } as any),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: expect.stringContaining('Chỉ còn 10') }),
    });
  });

  it('rejects updating beyond stock', async () => {
    prisma.product.findUnique.mockResolvedValue(product);

    await expect(
      service.updateItem('user-1', 'prod-1', { quantity: 99 } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when updating an item in a missing cart', async () => {
    prisma.cart.findUnique.mockResolvedValue(null);

    await expect(
      service.updateItem('user-1', 'prod-1', { quantity: 1 } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
