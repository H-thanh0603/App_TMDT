import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as querystring from 'querystring';

import { PaymentsService } from './payments.service';

const SECRET = 'TEST_HASH_SECRET_1234567890';
const TMN = 'TESTTMN1';

/** Ký query giống hệt service (dùng để giả lập callback hợp lệ từ VNPay). */
function signQuery(params: Record<string, string | number>, secret: string): string {
  const sorted: Record<string, string> = {};
  Object.keys(params)
    .sort()
    .forEach((k) => (sorted[k] = String(params[k])));
  const signData = querystring.stringify(sorted, undefined, undefined, {
    encodeURIComponent: (s: string) => encodeURIComponent(s).replace(/%20/g, '+'),
  });
  return crypto.createHmac('sha512', secret).update(Buffer.from(signData, 'utf-8')).digest('hex');
}

function buildSignedQuery(base: Record<string, string>, secret: string): Record<string, string> {
  const vnp_SecureHash = signQuery(base, secret);
  return { ...base, vnp_SecureHash };
}

describe('PaymentsService (VNPay security)', () => {
  let service: PaymentsService;
  let prisma: any;

  const configured = {
    get: jest.fn((key: string, def?: string) => {
      const map: Record<string, string> = {
        VNPAY_TMN_CODE: TMN,
        VNPAY_HASH_SECRET: SECRET,
      };
      return map[key] ?? def;
    }),
  };

  beforeEach(() => {
    prisma = {
      order: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    service = new PaymentsService(prisma, configured as unknown as ConfigService);
  });

  describe('getVnpayConfig (fail-closed)', () => {
    it('throws ServiceUnavailable when secret/tmn not configured', async () => {
      const emptyCfg = { get: jest.fn((_k: string, def?: string) => def) };
      const svc = new PaymentsService(prisma, emptyCfg as unknown as ConfigService);

      await expect(
        svc.createVnpayUrl('user-1', { orderId: 'o1' }, '127.0.0.1'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('createVnpayUrl', () => {
    it('rejects when order already PAID', async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: 'o1',
        userId: 'user-1',
        paymentStatus: 'PAID',
        totalAmount: 50000,
      });
      await expect(
        service.createVnpayUrl('user-1', { orderId: 'o1' }, '127.0.0.1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ignores client-supplied returnUrl (open-redirect fix)', async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: 'order123',
        userId: 'user-1',
        paymentStatus: 'UNPAID',
        totalAmount: 50000,
        orderNumber: 'SMM-2026-000001',
      });
      const res = await service.createVnpayUrl(
        'user-1',
        { orderId: 'order123', returnUrl: 'https://evil.example/steal' },
        '1.2.3.4',
      );
      expect(res.url).not.toContain('evil.example');
    });
  });

  describe('handleVnpayReturn (display only)', () => {
    it('returns invalid for a forged signature and does NOT mutate the order', async () => {
      const forged = buildSignedQuery(
        { vnp_TxnRef: 'order123_1', vnp_ResponseCode: '00', vnp_Amount: '5000000' },
        'attacker-guessed-secret',
      );
      const res = await service.handleVnpayReturn(forged);
      expect(res.valid).toBe(false);
      expect(res.success).toBe(false);
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('validates a correctly-signed success but still does NOT mutate the order', async () => {
      const signed = buildSignedQuery(
        { vnp_TxnRef: 'order123_1', vnp_ResponseCode: '00', vnp_Amount: '5000000' },
        SECRET,
      );
      const res = await service.handleVnpayReturn(signed);
      expect(res.valid).toBe(true);
      expect(res.success).toBe(true);
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('handleVnpayIpn (authoritative)', () => {
    const baseOrder = {
      id: 'order123',
      orderNumber: 'SMM-2026-000001',
      paymentRef: 'order123_1',
      paymentStatus: 'UNPAID',
      status: 'PENDING',
      totalAmount: 50000,
    };

    it('rejects forged signature with RspCode 97 (payment bypass blocked)', async () => {
      const forged = buildSignedQuery(
        {
          vnp_TxnRef: 'order123_1',
          vnp_ResponseCode: '00',
          vnp_TransactionStatus: '00',
          vnp_Amount: '5000000',
        },
        'attacker-guessed-secret',
      );
      const res = await service.handleVnpayIpn(forged);
      expect(res).toEqual({ RspCode: '97', Message: 'Invalid signature' });
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('rejects amount mismatch with RspCode 04', async () => {
      prisma.order.findFirst.mockResolvedValue(baseOrder);
      const signed = buildSignedQuery(
        {
          vnp_TxnRef: 'order123_1',
          vnp_ResponseCode: '00',
          vnp_TransactionStatus: '00',
          vnp_Amount: '100', // sai (đúng phải là 5000000)
        },
        SECRET,
      );
      const res = await service.handleVnpayIpn(signed);
      expect(res.RspCode).toBe('04');
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('is idempotent: already-PAID order returns RspCode 02, no update', async () => {
      prisma.order.findFirst.mockResolvedValue({ ...baseOrder, paymentStatus: 'PAID' });
      const signed = buildSignedQuery(
        {
          vnp_TxnRef: 'order123_1',
          vnp_ResponseCode: '00',
          vnp_TransactionStatus: '00',
          vnp_Amount: '5000000',
        },
        SECRET,
      );
      const res = await service.handleVnpayIpn(signed);
      expect(res.RspCode).toBe('02');
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('marks order PAID (guarded by paymentStatus UNPAID) on valid success IPN', async () => {
      prisma.order.findFirst.mockResolvedValue(baseOrder);
      const signed = buildSignedQuery(
        {
          vnp_TxnRef: 'order123_1',
          vnp_ResponseCode: '00',
          vnp_TransactionStatus: '00',
          vnp_Amount: '5000000',
        },
        SECRET,
      );
      const res = await service.handleVnpayIpn(signed);
      expect(res).toEqual({ RspCode: '00', Message: 'Confirm Success' });
      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'order123', paymentStatus: 'UNPAID' },
        data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
      });
    });

    it('marks order FAILED on unsuccessful response code', async () => {
      prisma.order.findFirst.mockResolvedValue(baseOrder);
      const signed = buildSignedQuery(
        {
          vnp_TxnRef: 'order123_1',
          vnp_ResponseCode: '24',
          vnp_TransactionStatus: '02',
          vnp_Amount: '5000000',
        },
        SECRET,
      );
      const res = await service.handleVnpayIpn(signed);
      expect(res.RspCode).toBe('00');
      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'order123', paymentStatus: 'UNPAID' },
        data: { paymentStatus: 'FAILED' },
      });
    });
  });
});
