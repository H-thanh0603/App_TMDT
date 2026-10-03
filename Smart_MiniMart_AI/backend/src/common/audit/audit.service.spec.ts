import { AuditService } from './audit.module';

describe('AuditService (Q148)', () => {
  let prisma: any;

  beforeEach(() => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'a1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn((arr: Promise<unknown>[]) => Promise.all(arr)),
    };
  });

  it('records a sensitive action without throwing', async () => {
    const service = new AuditService(prisma);

    await service.record({
      actorId: 'admin-1',
      actorRole: 'STORE_ADMIN',
      action: 'user.update',
      targetType: 'User',
      targetId: 'u1',
      after: { role: 'STAFF' },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'user.update', targetType: 'User', targetId: 'u1' }),
      }),
    );
  });

  it('scrubs secret fields out of before/after', async () => {
    const service = new AuditService(prisma);

    await service.record({
      actorId: 'admin-1',
      action: 'user.update',
      targetType: 'User',
      after: { email: 'a@b.c', passwordHash: 'hunter2', apiKey: 'sk-x', role: 'STAFF' },
    });

    const data = prisma.auditLog.create.mock.calls[0][0].data;
    expect(data.after).toEqual({ email: 'a@b.c', role: 'STAFF' });
    expect(JSON.stringify(data.after)).not.toMatch(/hunter2|sk-x/);
  });

  it('swallows DB errors instead of breaking the business op', async () => {
    prisma.auditLog.create.mockRejectedValue(new Error('DB chết'));
    const service = new AuditService(prisma);

    await expect(
      service.record({ action: 'user.deactivate', targetType: 'User', targetId: 'u1' }),
    ).resolves.toBeUndefined();
  });

  it('lists with clamped pagination', async () => {
    const service = new AuditService(prisma);

    await service.list({ targetType: 'User', page: 0, limit: 500 });

    const args = prisma.auditLog.findMany.mock.calls[0][0];
    expect(args.take).toBe(100); // clamp max
    expect(args.skip).toBe(0); // clamp page min 1
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
  });
});
