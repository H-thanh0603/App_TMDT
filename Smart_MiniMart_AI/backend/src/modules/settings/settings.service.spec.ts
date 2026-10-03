import { NotFoundException } from '@nestjs/common';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      systemSetting: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve(data)),
        upsert: jest.fn().mockImplementation(({ create }: any) => Promise.resolve(create)),
      },
    };
    service = new SettingsService(prisma);
  });

  it('lazy-seeds a known default when missing', async () => {
    prisma.systemSetting.findUnique.mockResolvedValue(null);

    const s = await service.get('STORE_POLICIES');

    expect(prisma.systemSetting.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ key: 'STORE_POLICIES' }) }),
    );
    expect(s.value).toBeDefined();
  });

  it('throws NotFound for an unknown key', async () => {
    prisma.systemSetting.findUnique.mockResolvedValue(null);

    await expect(service.get('NO_SUCH_KEY')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.systemSetting.create).not.toHaveBeenCalled();
  });

  it('upserts settings for admin changes', async () => {
    await service.upsert('STORE_INFO', { name: 'Shop Mới' });

    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'STORE_INFO' },
        create: expect.objectContaining({ key: 'STORE_INFO' }),
      }),
    );
  });

  it('falls back to defaults when DB read fails on public config', async () => {
    prisma.systemSetting.findUnique.mockRejectedValue(new Error('DB chết'));

    const cfg = await service.getStorePublicConfig();

    expect(cfg.info).toBeDefined();
    expect(cfg.policies).toBeDefined();
    expect(cfg.payment).toBeDefined();
  });
});
