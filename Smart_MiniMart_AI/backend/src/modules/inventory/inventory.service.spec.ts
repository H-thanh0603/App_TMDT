import { InventoryService } from './inventory.service';

describe('InventoryService analytics (SEC-016 no N+1)', () => {
  let service: InventoryService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      product: { findMany: jest.fn() },
      orderItem: { groupBy: jest.fn() },
    };
    service = new InventoryService(prisma);
  });

  it('slowMovingProducts uses a single groupBy (not one aggregate per product)', async () => {
    prisma.product.findMany.mockResolvedValue([
      { id: 'p1', name: 'A', stock: 100 },
      { id: 'p2', name: 'B', stock: 50 },
      { id: 'p3', name: 'C', stock: 40 },
    ]);
    prisma.orderItem.groupBy.mockResolvedValue([
      { productId: 'p1', _sum: { quantity: 5 } }, // turnover 0.05 → slow
    ]);

    const res = await service.slowMovingProducts(30, 10);

    expect(prisma.orderItem.groupBy).toHaveBeenCalledTimes(1);
    // p1 (0.05), p2 (0), p3 (0) đều < 0.3 → tất cả slow-moving
    expect(res.map((r: any) => r.id).sort()).toEqual(['p1', 'p2', 'p3']);
    const p1 = res.find((r: any) => r.id === 'p1');
    expect(p1?.soldInPeriod).toBe(5);
  });

  it('restockSuggestions uses a single groupBy', async () => {
    prisma.product.findMany.mockResolvedValue([
      { id: 'p1', name: 'A', stock: 1, minStock: 10, maxStock: 100 },
    ]);
    prisma.orderItem.groupBy.mockResolvedValue([{ productId: 'p1', _sum: { quantity: 60 } }]);

    const res = await service.restockSuggestions(30);

    expect(prisma.orderItem.groupBy).toHaveBeenCalledTimes(1);
    expect(res[0].id).toBe('p1');
    expect(res[0].suggestedRestock).toBeGreaterThan(0);
  });
});
