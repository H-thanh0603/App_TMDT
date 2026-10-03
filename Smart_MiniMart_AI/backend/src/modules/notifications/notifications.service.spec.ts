import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      notification: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({ id: 'n1', isRead: true }),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        delete: jest.fn(),
        createMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'u1' }]) },
    };
    service = new NotificationsService(prisma);
  });

  it('scopes list to the callers own userId', async () => {
    await service.listMine('user-1', {});

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
    );
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', isRead: false },
    });
  });

  it('refuses to mark another users notification as read (IDOR)', async () => {
    prisma.notification.findFirst.mockResolvedValue(null);

    await expect(service.markRead('user-1', 'notif-of-user-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('marks all of only the callers notifications', async () => {
    const r = await service.markAllRead('user-1');

    expect(r.updated).toBe(2);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', isRead: false },
      data: { isRead: true },
    });
  });

  it('broadcasts to a role without including other roles', async () => {
    const r = await service.broadcast('admin-1', {
      title: 'Sale',
      body: 'Giảm 10%',
      targetRoles: ['CUSTOMER'],
    } as any);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: { in: ['CUSTOMER'] } }),
      }),
    );
    expect(r.sent).toBe(3);
  });
});
