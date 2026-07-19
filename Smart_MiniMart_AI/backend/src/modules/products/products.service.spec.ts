import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      product: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    service = new ProductsService(prisma);
  });

  describe('list', () => {
    it('returns paginated items with totalPages', async () => {
      const items = [{ id: 'p1', name: 'Mì Hảo Hảo' }];
      prisma.$transaction.mockResolvedValue([items, 45]);

      const result = await service.list({ page: 2, limit: 20 } as any);

      expect(result).toEqual({
        items,
        total: 45,
        page: 2,
        limit: 20,
        totalPages: 3,
      });
      expect(prisma.$transaction).toHaveBeenCalled();
      const findManyArg = prisma.product.findMany.mock.calls[0][0];
      expect(findManyArg.skip).toBe(20);
      expect(findManyArg.take).toBe(20);
      expect(findManyArg.where).toEqual({ isActive: true });
    });

    it('applies search filter and caps limit at 100', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.list({ page: 1, limit: 500, search: 'iphone' } as any);

      const findManyArg = prisma.product.findMany.mock.calls[0][0];
      expect(findManyArg.take).toBe(100);
      expect(findManyArg.where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: expect.objectContaining({ contains: 'iphone' }) }),
        ]),
      );
    });

    it('sorts by price ascending when sortBy=price_asc', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.list({ sortBy: 'price_asc' } as any);

      const findManyArg = prisma.product.findMany.mock.calls[0][0];
      expect(findManyArg.orderBy).toEqual({ price: 'asc' });
    });

    it('filters by category and in-stock flag', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.list({
        categoryId: 'cat-1',
        inStock: 'true',
      } as any);

      const findManyArg = prisma.product.findMany.mock.calls[0][0];
      expect(findManyArg.where.categoryId).toBe('cat-1');
      expect(findManyArg.where.stock).toEqual({ gt: 0 });
    });
  });
});
