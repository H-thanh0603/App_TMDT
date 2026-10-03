import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'c1' }),
        update: jest.fn().mockResolvedValue({ id: 'c1' }),
        delete: jest.fn(),
      },
      product: { count: jest.fn() },
    };
    service = new CategoriesService(prisma);
  });

  it('hides inactive categories from customers by default', async () => {
    await service.list(false);

    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
  });

  it('shows inactive categories for admin/staff listing', async () => {
    await service.list(true);

    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('rejects duplicate name or slug', async () => {
    prisma.category.findFirst.mockResolvedValue({ id: 'c0' });

    await expect(
      service.create({ name: 'Đồ uống', slug: 'do-uong' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses to delete a category that still has products', async () => {
    prisma.category.findUnique.mockResolvedValue({ id: 'c1', name: 'Đồ uống', isActive: true });
    prisma.product.count.mockResolvedValue(5);

    await expect(service.remove('c1')).rejects.toMatchObject({
      response: expect.objectContaining({ message: expect.stringContaining('5 sản phẩm') }),
    });
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });

  it('throws NotFound when deleting a missing category', async () => {
    prisma.category.findUnique.mockResolvedValue(null);

    await expect(service.remove('ghost')).rejects.toBeInstanceOf(NotFoundException);
  });
});
