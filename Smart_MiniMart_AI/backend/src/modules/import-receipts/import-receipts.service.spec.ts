import { BadRequestException } from '@nestjs/common';
import { ImportReceiptStatus } from '@prisma/client';
import { ImportReceiptsService } from './import-receipts.service';

describe('ImportReceiptsService.confirm (SEC-019 double-confirm guard)', () => {
  let service: ImportReceiptsService;
  let prisma: any;

  const receipt = {
    id: 'ir-1',
    receiptNumber: 'IR-2026-000001',
    status: ImportReceiptStatus.REVIEWED,
    items: [
      { productId: 'prod-1', productName: 'Sữa', quantity: 10, unitPrice: 8000, expiryDate: null },
    ],
  };

  function makeTx(claimCount: number) {
    return {
      importReceipt: {
        updateMany: jest.fn().mockResolvedValue({ count: claimCount }),
        findUnique: jest
          .fn()
          .mockResolvedValue({ ...receipt, status: ImportReceiptStatus.CONFIRMED }),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue({ id: 'prod-1', stock: 5, expiryDate: null }),
        update: jest.fn().mockResolvedValue({}),
      },
      inventoryTransaction: { create: jest.fn().mockResolvedValue({}) },
    };
  }

  beforeEach(() => {
    prisma = {
      importReceipt: {
        findUnique: jest.fn().mockResolvedValue(receipt),
      },
      $transaction: jest.fn(),
    };
    service = new ImportReceiptsService(prisma, {} as any);
  });

  it('applies stock once when the atomic claim succeeds', async () => {
    const tx = makeTx(1);
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await service.confirm('ir-1', 'staff-1');

    expect(tx.importReceipt.updateMany).toHaveBeenCalledWith({
      where: { id: 'ir-1', status: { not: ImportReceiptStatus.CONFIRMED } },
      data: expect.objectContaining({
        status: ImportReceiptStatus.CONFIRMED,
        reviewedById: 'staff-1',
      }),
    });
    expect(tx.product.update).toHaveBeenCalledTimes(1);
  });

  it('throws and does NOT re-apply stock when claim finds it already confirmed (concurrent)', async () => {
    const tx = makeTx(0); // another request already confirmed → count 0
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await expect(service.confirm('ir-1', 'staff-2')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.product.update).not.toHaveBeenCalled();
  });

  it('rejects early when receipt already CONFIRMED (fast path)', async () => {
    prisma.importReceipt.findUnique.mockResolvedValue({
      ...receipt,
      status: ImportReceiptStatus.CONFIRMED,
    });
    await expect(service.confirm('ir-1', 'staff-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
