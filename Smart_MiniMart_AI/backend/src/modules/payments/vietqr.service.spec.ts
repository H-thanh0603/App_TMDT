import { VietQrService } from './vietqr.service';

function makeService(overrides: any = {}) {
  const prisma = {
    order: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'order-1',
        orderNumber: 'SMM-2026-000001',
        totalAmount: 50000,
        paymentStatus: 'UNPAID',
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
  const cfg = {
    get: jest.fn((key: string, def?: string) => {
      const map: Record<string, string> = {
        VIETQR_BANK_BIN: '970422',
        VIETQR_ACCOUNT_NO: '0368600557',
        VIETQR_ACCOUNT_NAME: 'NGUYEN HUU THANH',
        VIETQR_TEMPLATE: 'compact',
      };
      return map[key] ?? def;
    }),
  };
  return { service: new VietQrService(prisma as any, cfg as any), prisma, cfg };
}

describe('VietQrService.generate (SEC-023 payment redirection)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('IGNORES client-supplied bank account for non-admin callers', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as any;
    const { service } = makeService();

    const res = await service.generate(
      'user-1',
      {
        orderId: 'order-1',
        bankBin: '970436',
        accountNo: '9999999999',
        accountName: 'KE GIAN',
      },
      { allowOverrides: false },
    );

    expect(res.bankBin).toBe('970422');
    expect(res.accountNo).toBe('0368600557');
    expect(res.accountName).toBe('NGUYEN HUU THANH');
  });

  it('allows a validated override for STORE_ADMIN', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as any;
    const { service } = makeService();

    const res = await service.generate(
      'admin-1',
      { orderId: 'order-1', bankBin: '970436', accountNo: '123456789' },
      { allowOverrides: true },
    );

    expect(res.bankBin).toBe('970436');
    expect(res.accountNo).toBe('123456789');
  });

  it('rejects malformed overrides and never injects them into the static QR URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as any;
    const { service } = makeService();

    const res: any = await service.generate(
      'admin-1',
      { orderId: 'order-1', accountNo: '0368600557&x=<script>' },
      { allowOverrides: true },
    );

    expect(res.accountNo).toBe('0368600557');
    expect(res.qrImageUrl).not.toContain('<script>');
  });

  it('falls back to the static image when the API returns an unexpected payload', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { qrDataURL: 'javascript:alert(1)' } }),
    }) as any;
    const { service } = makeService();

    const res: any = await service.generate('user-1', { orderId: 'order-1' });

    expect(res.qrDataUrl).toBeUndefined();
    expect(res.qrImageUrl).toContain('https://img.vietqr.io/image/');
  });

  it('accepts a genuine data URL from the API', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { qrDataURL: 'data:image/png;base64,AAAA' } }),
    }) as any;
    const { service } = makeService();

    const res: any = await service.generate('user-1', { orderId: 'order-1' });

    expect(res.qrDataUrl).toBe('data:image/png;base64,AAAA');
  });
});

describe('VietQrService.confirm', () => {
  it('marks a bank order paid and records the manual transaction reference', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'order-1', paymentStatus: 'PAID', status: 'CONFIRMED' });
    const create = jest.fn().mockResolvedValue({ id: 'confirmation-1' });
    const tx = {
      order: { findUnique: jest.fn().mockResolvedValue({ id: 'order-1', paymentMethod: 'BANK', paymentStatus: 'PENDING', status: 'PENDING' }), update },
      paymentConfirmation: { findUnique: jest.fn().mockResolvedValue(null), create },
    };
    const prisma = { $transaction: (fn: any) => fn(tx) } as any;
    const service = new VietQrService(prisma, { get: jest.fn() } as any);

    await expect(service.confirm('order-1', 'staff-1', { bankTransactionRef: 'MB123', note: 'matched' })).resolves.toMatchObject({ paymentStatus: 'PAID' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ paymentRef: 'VIETQR:MB123', paymentStatus: 'PAID', status: 'CONFIRMED' }) }));
    expect(create).toHaveBeenCalledWith({ data: { orderId: 'order-1', confirmedById: 'staff-1', bankTransactionRef: 'MB123', note: 'matched' } });
  });
});
