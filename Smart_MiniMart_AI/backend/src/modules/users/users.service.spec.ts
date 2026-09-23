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
