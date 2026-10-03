import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PromotionType } from '@prisma/client';
import { PromotionsService } from './promotions.service';

const baseDto = {
  code: 'SALE10',
  type: PromotionType.PERCENT,
  discountValue: 10,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
};

describe('PromotionsService', () => {
  let service: PromotionsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      promotion: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'p1' }),
        update: jest.fn(),
        delete: jest.fn(),
      },
      promotionProduct: { deleteMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };
    service = new PromotionsService(prisma);
  });

  it('rejects percent discount above 100%', async () => {
    await expect(
      service.create({ ...baseDto, discountValue: 150 } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an inverted date range', async () => {
    await expect(
      service.create({ ...baseDto, startDate: '2026-12-31', endDate: '2026-01-01' } as any),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: expect.stringContaining('sau ngày bắt đầu') }),
    });
  });

  it('rejects a duplicate promo code', async () => {
    prisma.promotion.findUnique.mockResolvedValue({ id: 'p0', code: 'SALE10' });

    await expect(service.create(baseDto as any)).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates with product links when productIds are given', async () => {
    prisma.promotion.findUnique.mockResolvedValue(null);

    await service.create({ ...baseDto, productIds: ['prod-1', 'prod-2'] } as any);

    expect(prisma.promotion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          products: { create: [{ productId: 'prod-1' }, { productId: 'prod-2' }] },
        }),
      }),
    );
  });

  it('throws NotFound when removing a missing promo', async () => {
    prisma.promotion.findUnique.mockResolvedValue(null);

    await expect(service.remove('ghost')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('also validates on update (not only create)', async () => {
    prisma.promotion.findUnique.mockResolvedValue({ id: 'p1', type: PromotionType.PERCENT });

    await expect(
      service.update('p1', { discountValue: 999 } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
