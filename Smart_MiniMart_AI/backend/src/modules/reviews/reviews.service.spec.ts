import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { AITaskType } from '@prisma/client';

describe('ReviewsService.create (SEC-007 verified purchase)', () => {
  let service: ReviewsService;
  let prisma: any;
  let gateway: any;

  beforeEach(() => {
    prisma = {
      product: { findUnique: jest.fn().mockResolvedValue({ id: 'prod-1' }) },
      order: { findFirst: jest.fn() },
      review: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }: any) => Promise.resolve({ id: 'rev-1', ...data })),
        update: jest.fn().mockResolvedValue({ id: 'rev-1' }),
      },
    };
    gateway = { execute: jest.fn().mockResolvedValue({ text: 'Tóm tắt hay.' }) };
    service = new ReviewsService(prisma, gateway);
  });

  it('rejects when product does not exist', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(
      service.create('user-1', { productId: 'nope', rating: 5 } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('forbids review when the user has no COMPLETED order containing the product', async () => {
    prisma.order.findFirst.mockResolvedValue(null);
    await expect(
      service.create('user-1', { productId: 'prod-1', rating: 5 } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  it('requires the (provided) orderId to belong to the user + be COMPLETED + contain product', async () => {
    prisma.order.findFirst.mockResolvedValue(null); // arbitrary/other-user orderId → not found
    await expect(
      service.create('user-1', {
        productId: 'prod-1',
        orderId: 'someone-elses-order',
        rating: 5,
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const whereArg = prisma.order.findFirst.mock.calls[0][0].where;
    expect(whereArg).toMatchObject({
      userId: 'user-1',
      status: 'COMPLETED',
      id: 'someone-elses-order',
      items: { some: { productId: 'prod-1' } },
    });
  });

  it('creates the review (binding it to the verified order) when purchase is verified', async () => {
    prisma.order.findFirst.mockResolvedValue({ id: 'order-9' });
    const res = await service.create('user-1', {
      productId: 'prod-1',
      rating: 4,
      comment: 'Ngon',
    } as any);

    expect(res.orderId).toBe('order-9');
    expect(prisma.review.create).toHaveBeenCalled();
  });

  it('blocks duplicate review for the same product (any order)', async () => {
    prisma.order.findFirst.mockResolvedValue({ id: 'order-9' });
    prisma.review.findFirst.mockResolvedValue({ id: 'existing' });
    // Bất kể orderId khác — vẫn chặn vì dedup theo productId
    await expect(
      service.create('user-1', { productId: 'prod-1', orderId: 'order-2', rating: 4 } as any),
    ).rejects.toBeInstanceOf(ConflictException);

    // Kiểm tra where của findFirst là theo (userId, productId), không có orderId
    const dupWhere = prisma.review.findFirst.mock.calls[0][0].where;
    expect(dupWhere).toEqual({ userId: 'user-1', productId: 'prod-1' });
  });

  it('clamps rating to 1..5 even if DTO is bypassed', async () => {
    prisma.order.findFirst.mockResolvedValue({ id: 'order-9' });
    const res = await service.create('user-1', {
      productId: 'prod-1',
      rating: 99,
      comment: 'ok',
    } as any);
    expect(res.rating).toBe(5);
  });

  it('fires an async AI summary (REVIEW_SUMMARY) when comment is present', async () => {
    prisma.order.findFirst.mockResolvedValue({ id: 'order-9' });
    await service.create('user-1', { productId: 'prod-1', rating: 5, comment: 'Ngon rẻ' } as any);

    expect(gateway.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        taskType: AITaskType.REVIEW_SUMMARY,
        refType: 'REVIEW',
        refId: 'rev-1',
        userPrompt: 'Ngon rẻ',
      }),
    );
  });

  it('skips AI summary when comment empty', async () => {
    prisma.order.findFirst.mockResolvedValue({ id: 'order-9' });
    await service.create('user-1', { productId: 'prod-1', rating: 5 } as any);
    expect(gateway.execute).not.toHaveBeenCalled();
  });
});

describe('ReviewsService.hide (LOW-09)', () => {
  let service: ReviewsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      review: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'rev-1', isHidden: true }),
      },
    };
    service = new ReviewsService(prisma, { execute: jest.fn() } as any);
  });

  it('throws NotFound when the review does not exist', async () => {
    prisma.review.findUnique.mockResolvedValue(null);
    await expect(service.hide('nope')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.review.update).not.toHaveBeenCalled();
  });

  it('hides an existing review', async () => {
    prisma.review.findUnique.mockResolvedValue({ id: 'rev-1' });
    const res = await service.hide('rev-1');
    expect(res.isHidden).toBe(true);
  });
});