import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProviderType } from '@prisma/client';

import { AIManagerService } from './ai-manager.service';

const VALID_KEY = 'a'.repeat(64); // 32-byte hex

function makeCfg(key?: string) {
  return {
    get: jest.fn((k: string, def?: string) => (k === 'AI_ENCRYPTION_KEY' ? key : def)),
  } as unknown as ConfigService;
}

describe('AIManagerService encryption key (SEC-006 fail-closed)', () => {
  let prisma: any;

  beforeEach(() => {
    prisma = {
      aIProvider: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }: any) =>
            Promise.resolve({ id: 'p1', name: data.name, apiKeyMasked: data.apiKeyMasked }),
          ),
      },
    };
  });

  it('rejects when AI_ENCRYPTION_KEY is missing (no zero-key fallback)', async () => {
    const service = new AIManagerService(prisma, makeCfg(undefined));
    await expect(
      service.createProvider({
        name: 'DeepSeek P',
        type: AIProviderType.DEEPSEEK,
        apiKey: 'sk-secret-123456',
      } as any),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.aIProvider.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid (non-64-hex) key', async () => {
    const service = new AIManagerService(prisma, makeCfg('not-a-valid-hex-key'));
    await expect(
      service.createProvider({
        name: 'DeepSeek P',
        type: AIProviderType.DEEPSEEK,
        apiKey: 'sk-secret-123456',
      } as any),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('encrypts and masks the API key when a valid key is configured', async () => {
    const service = new AIManagerService(prisma, makeCfg(VALID_KEY));
    const res = await service.createProvider({
      name: 'DeepSeek P',
      type: AIProviderType.DEEPSEEK,
      apiKey: 'sk-secret-123456',
    } as any);

    expect(res.apiKeyMasked).toBe('sk-s***3456');
    const createArg = prisma.aIProvider.create.mock.calls[0][0].data;
    expect(createArg.apiKeyEncrypted).toBeTruthy();
    expect(createArg.apiKeyEncrypted).not.toContain('sk-secret'); // đã mã hóa
  });
});
