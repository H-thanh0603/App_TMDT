import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService admin safety (SEC-024)', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'admin-1' }),
        count: jest.fn(),
      },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      address: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    service = new UsersService(prisma);
  });

  it('blocks an admin from changing their own role', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'STORE_ADMIN' });

    await expect(
      service.updateStaff('admin-1', { role: 'CUSTOMER' }, 'admin-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('blocks an admin from suspending their own account', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'STORE_ADMIN' });

    await expect(
      service.updateStaff('admin-1', { status: 'SUSPENDED' }, 'admin-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks demoting the last active STORE_ADMIN', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'admin-2', role: 'STORE_ADMIN' });
    prisma.user.count.mockResolvedValue(0); // không còn admin nào khác

    await expect(
      service.updateStaff('admin-2', { role: 'STAFF' }, 'admin-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows demoting an admin when another active admin remains', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'admin-2', role: 'STORE_ADMIN' });
    prisma.user.count.mockResolvedValue(1);

    await service.updateStaff('admin-2', { role: 'STAFF' }, 'admin-1');

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'admin-2' }, data: { role: 'STAFF' } }),
    );
  });

  it('never deactivates the acting admin themselves', async () => {
    await expect(service.deactivateUser('admin-1', 'admin-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('blocks deactivating the last active STORE_ADMIN', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'admin-2', role: 'STORE_ADMIN' });
    prisma.user.count.mockResolvedValue(0);

    await expect(service.deactivateUser('admin-2', 'admin-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('still throws NotFound for a missing user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.deactivateUser('ghost', 'admin-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('UsersService self-service anonymize/export (Q62/Q69)', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1', role: 'CUSTOMER' }),
        update: jest.fn().mockResolvedValue({ id: 'u1', status: 'SUSPENDED' }),
        count: jest.fn(),
      },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      address: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    service = new UsersService(prisma);
  });

  it('anonymizes PII, revokes sessions and deletes addresses on self-delete', async () => {
    await service.deleteMyAccount('u1');

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { revoked: true },
    });
    expect(prisma.address.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data.email).toMatch(/@deleted\.local$/);
    expect(data.phone).toBeNull();
    expect(data.status).toBe('SUSPENDED');
  });

  it('refuses self-delete for the last active STORE_ADMIN', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'STORE_ADMIN' });
    prisma.user.count.mockResolvedValue(0);

    await expect(service.deleteMyAccount('admin-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('throws NotFound when self-deleting a missing user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.deleteMyAccount('ghost')).rejects.toBeInstanceOf(NotFoundException);
  });
});
