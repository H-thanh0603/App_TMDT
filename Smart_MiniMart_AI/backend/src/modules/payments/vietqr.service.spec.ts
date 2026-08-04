import { VietQrService } from './vietqr.service';

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
