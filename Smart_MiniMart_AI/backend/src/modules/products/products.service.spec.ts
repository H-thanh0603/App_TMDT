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

    it('filters active products with a sale price when onSale=true', async () => {
      repo.transactionList.mockResolvedValue([[], 0]);

      await service.list({ onSale: 'true' } as any);

      const findManyArg = (repo.transactionList.mock.calls[0] as any)[0];
      expect(findManyArg.where).toEqual({ isActive: true, salePrice: { not: null } });
    });

    it('ignores includeInactive for anonymous/customer requests (SEC-022)', async () => {
      repo.transactionList.mockResolvedValue([[], 0]);

      await service.list({ includeInactive: 'true' } as any); // không truyền allowInactive

      const findManyArg = (repo.transactionList.mock.calls[0] as any)[0];
      expect(findManyArg.where).toEqual({ isActive: true });
    });

    it('honours includeInactive only when allowInactive=true (admin/staff)', async () => {
      repo.transactionList.mockResolvedValue([[], 0]);

      await service.list({ includeInactive: 'true' } as any, { allowInactive: true });

      const findManyArg = (repo.transactionList.mock.calls[0] as any)[0];
      expect(findManyArg.where).toEqual({});
    });
  });

  describe('findOne (SEC-022)', () => {
    it('hides inactive products from anonymous lookups', async () => {
      repo.findFirst.mockResolvedValue(null);

      await expect(service.findOne('milk-220ml')).rejects.toThrow('Sản phẩm không tồn tại');
      expect((repo.findFirst.mock.calls[0] as any)[0].where).toEqual({
        OR: [{ id: 'milk-220ml' }, { slug: 'milk-220ml' }],
        isActive: true,
      });
    });

    it('lets admin/staff fetch an inactive product and bumps view count', async () => {
      repo.findFirst.mockResolvedValue({ id: 'p1', name: 'SP ẩn' });
      repo.update.mockResolvedValue({ id: 'p1' });

      await service.findOne('p1', { allowInactive: true });

      expect((repo.findFirst.mock.calls[0] as any)[0].where).toEqual({
        OR: [{ id: 'p1' }, { slug: 'p1' }],
      });
      expect(repo.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { viewCount: { increment: 1 } },
      });
    });
  });
});
