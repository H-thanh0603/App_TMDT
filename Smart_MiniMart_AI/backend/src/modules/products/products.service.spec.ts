import { ProductsService } from './products.service';
import { IProductRepository } from './repositories/product.repository';

describe('ProductsService', () => {
  let service: ProductsService;
  let repo: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    repo = {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      categoryFindUnique: jest.fn(),
      transactionList: jest.fn(),
    };
    service = new ProductsService(repo);
  });

  describe('list', () => {
    it('returns paginated items with totalPages', async () => {
      const items = [{ id: 'p1', name: 'Mì Hảo Hảo' }];
      repo.transactionList.mockResolvedValue([items, 45]);

      const result = await service.list({ page: 2, limit: 20 } as any);

      expect(result).toEqual({
        items,
        total: 45,
        page: 2,
        limit: 20,
        totalPages: 3,
      });
      expect(repo.transactionList).toHaveBeenCalled();
      const findManyArg = (repo.transactionList.mock.calls[0] as any)[0];
      expect(findManyArg.skip).toBe(20);
      expect(findManyArg.take).toBe(20);
      expect(findManyArg.where).toEqual({ isActive: true });
    });

    it('applies search filter and caps limit at 100', async () => {
      repo.transactionList.mockResolvedValue([[], 0]);

      await service.list({ page: 1, limit: 500, search: 'iphone' } as any);

      const findManyArg = (repo.transactionList.mock.calls[0] as any)[0];
      expect(findManyArg.take).toBe(100);
      expect(findManyArg.where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: expect.objectContaining({ contains: 'iphone' }) }),
        ]),
      );
    });

    it('sorts by price ascending when sortBy=price_asc', async () => {
      repo.transactionList.mockResolvedValue([[], 0]);

      await service.list({ sortBy: 'price_asc' } as any);

      const findManyArg = (repo.transactionList.mock.calls[0] as any)[0];
      expect(findManyArg.orderBy).toEqual({ price: 'asc' });
    });

    it('filters by category and in-stock flag', async () => {
      repo.transactionList.mockResolvedValue([[], 0]);

      await service.list({
        categoryId: 'cat-1',
        inStock: 'true',
      } as any);

      const findManyArg = (repo.transactionList.mock.calls[0] as any)[0];
      expect(findManyArg.where.categoryId).toBe('cat-1');
      expect(findManyArg.where.stock).toEqual({ gt: 0 });
    });
  });
});
