import { AIGatewayService, AIQuotaExceededException } from './ai-gateway.service';

/**
 * SEC-030: hạn mức AI phải được thực thi theo cả 3 phạm vi (global / provider / user).
 * Trước đây chỉ có `provider:<id>` → một khách hàng có thể đốt hết credit của shop.
 */
describe('AIGatewayService usage limits (SEC-030)', () => {
  let service: AIGatewayService;
  let prisma: any;

  const limit = (over: Record<string, unknown> = {}) => ({
    id: 'lim-1',
    scope: 'global',
    monthlyRequestLimit: null,
    monthlyCostLimitUsd: null,
    currentMonthCount: 0,
    currentMonthCost: 0,
    resetMonthAt: new Date(),
    isEnforced: true,
    ...over,
  });

  beforeEach(() => {
    prisma = {
      aIUsageLimit: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const cfg = { get: jest.fn((_k: string, def?: string) => def) } as any;
    service = new AIGatewayService(
      prisma,
      cfg,
      {} as any, // deepseek
      {} as any, // openai
      {} as any, // mock
    );
  });

  const callAssert = (providerId: string | null = null, userId?: string) =>
    (service as any).assertUsageAllowed(providerId, userId);

  it('queries every applicable scope (global + provider + user)', async () => {
    await callAssert('prov-1', 'user-1');

    expect(prisma.aIUsageLimit.findMany).toHaveBeenCalledWith({
      where: { scope: { in: ['global', 'provider:prov-1', 'user:user-1'] }, isEnforced: true },
    });
  });

  it('throws 429 when the global limit is exhausted', async () => {
    prisma.aIUsageLimit.findMany.mockResolvedValue([
      limit({ scope: 'global', monthlyRequestLimit: 100, currentMonthCount: 100 }),
    ]);

    await expect(callAssert(null, 'user-1')).rejects.toBeInstanceOf(AIQuotaExceededException);
  });

  it('throws 429 when a per-user limit is exhausted', async () => {
    prisma.aIUsageLimit.findMany.mockResolvedValue([
      limit({ scope: 'user:user-1', monthlyRequestLimit: 5, currentMonthCount: 5 }),
    ]);

    await expect(callAssert('prov-1', 'user-1')).rejects.toBeInstanceOf(AIQuotaExceededException);
  });

  it('throws 429 when the monthly cost cap is reached', async () => {
    prisma.aIUsageLimit.findMany.mockResolvedValue([
      limit({ scope: 'provider:prov-1', monthlyCostLimitUsd: 10, currentMonthCost: 10.5 }),
    ]);

    await expect(callAssert('prov-1')).rejects.toBeInstanceOf(AIQuotaExceededException);
  });

  it('allows the call while still under the limits', async () => {
    prisma.aIUsageLimit.findMany.mockResolvedValue([
      limit({ scope: 'global', monthlyRequestLimit: 100, currentMonthCount: 12 }),
    ]);

    await expect(callAssert(null, 'user-1')).resolves.toBeUndefined();
  });

  it('resets counters when the stored period belongs to another month', async () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    prisma.aIUsageLimit.findMany.mockResolvedValue([
      limit({ monthlyRequestLimit: 1, currentMonthCount: 99, resetMonthAt: lastMonth }),
    ]);

    await expect(callAssert(null)).resolves.toBeUndefined();
    expect(prisma.aIUsageLimit.update).toHaveBeenCalledWith({
      where: { id: 'lim-1' },
      data: expect.objectContaining({ currentMonthCount: 0, currentMonthCost: 0 }),
    });
  });
});
