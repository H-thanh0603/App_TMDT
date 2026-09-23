import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';

const VIETQR_API = 'https://api.vietqr.io/v2/generate';
const VIETQR_TIMEOUT_MS = 8_000;

/** Bank BIN (NAPAS) = 6-11 chữ số. */
const BANK_BIN_RE = /^\d{6,11}$/;
/** Số tài khoản: chữ/số, cho phép . _ - (một số ngân hàng dùng). */
const ACCOUNT_NO_RE = /^[0-9A-Za-z._-]{4,32}$/;
/** Tên chủ tài khoản: chữ (kể cả tiếng Việt), số, khoảng trắng và . , _ - */
const ACCOUNT_NAME_RE = /^[\p{L}\p{N} .,_'-]{2,60}$/u;

interface VietQrConfig {
  bankBin: string;
  accountNo: string;
  accountName: string;
  template: 'compact' | 'qr_only' | 'print';
}

@Injectable()
export class VietQrService {
  private readonly logger = new Logger(VietQrService.name);

  constructor(
    private prisma: PrismaService,
    private cfg: ConfigService,
  ) {}

  /**
   * Cấu hình VietQR (env) + ghi đè do client gửi.
   *
   * SEC-023: ghi đè STK/ngân hàng chỉ được phép khi `allowOverrides = true`
   * (STORE_ADMIN). Với khách hàng, mọi giá trị client gửi bị BỎ QUA — nếu không,
   * kẻ xấu có thể khiến QR của đơn hàng trỏ về tài khoản của mình (lừa đảo) hoặc
   * chèn tham số vào URL ảnh của img.vietqr.io.
   */
  private getConfig(
    dto: Partial<VietQrConfig> = {},
    allowOverrides = false,
  ): VietQrConfig {
    const envBankBin = this.cfg.get<string>('VIETQR_BANK_BIN', '970422'); // MB default
    const envAccountNo = this.cfg.get<string>('VIETQR_ACCOUNT_NO', '0123456789'); // demo, đổi trên Render
    const envAccountName = this.cfg.get<string>('VIETQR_ACCOUNT_NAME', 'SMART MINIMART');

    const pick = (candidate: string | undefined, fallback: string, re: RegExp): string => {
      if (allowOverrides && candidate && re.test(candidate.trim())) return candidate.trim();
      return fallback;
    };

    return {
      bankBin: pick(dto.bankBin, envBankBin, BANK_BIN_RE),
      accountNo: pick(dto.accountNo, envAccountNo, ACCOUNT_NO_RE),
      accountName: pick(dto.accountName, envAccountName, ACCOUNT_NAME_RE),
      template:
        dto.template ?? this.cfg.get<'compact' | 'qr_only' | 'print'>('VIETQR_TEMPLATE', 'compact'),
    };
  }

  /**
   * Sinh VietQR tĩnh (image URL hoặc data URL) cho 1 đơn hàng.
   * Ưu tiên dùng api.vietqr.io (public, không cần key cho tier cơ bản).
   * Nếu thất bại, fallback về URL img.vietqr.io (static).
   */
  async generate(
    userId: string,
    dto: {
      orderId: string;
      bankBin?: string;
      accountNo?: string;
      accountName?: string;
      template?: 'compact' | 'qr_only' | 'print';
    },
    opts: { allowOverrides?: boolean } = {},
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('Đơn hàng đã thanh toán');
    }

    const cfg = this.getConfig(dto, opts.allowOverrides === true);
    const amount = Math.round(Number(order.totalAmount));
    const addInfo = `TT ${order.orderNumber ?? order.id.slice(0, 8)}`;

    if (!cfg.accountNo) {
      throw new BadRequestException(
        'Chưa cấu hình STK VietQR (VIETQR_ACCOUNT_NO). Vào Settings hoặc .env.',
      );
    }

    // 1) Thử api.vietqr.io v2 (trả về data URL)
    try {
      const body = {
        accountNo: cfg.accountNo,
        accountName: cfg.accountName,
        acqId: cfg.bankBin,
        amount,
        addInfo,
        format: 'text',
        template: cfg.template,
      };
      const resp = await fetch(VIETQR_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        // Timeout bắt buộc: nếu VietQR treo, request của khách không được treo theo.
        signal: AbortSignal.timeout(VIETQR_TIMEOUT_MS),
      });
      if (resp.ok) {
        const data = (await resp.json()) as any;
        const qrDataURL: unknown = data?.data?.qrDataURL;
        // Chỉ nhận data URL ảnh — chống việc upstream trả về URL lạ bị nhúng vào app.
        if (typeof qrDataURL === 'string' && /^data:image\/[a-z+]+;base64,/i.test(qrDataURL)) {
          // lưu ref để đối soát thủ công
          await this.prisma.order.update({
            where: { id: order.id },
            data: { paymentMethod: 'BANK', paymentRef: `VIETQR:${cfg.accountNo}:${amount}` },
          });
          return {
            method: 'VIETQR',
            qrDataUrl: qrDataURL,
            bankBin: cfg.bankBin,
            accountNo: cfg.accountNo,
            accountName: cfg.accountName,
            amount,
            addInfo,
          };
        }
        this.logger.warn('VietQR api trả về payload không mong đợi — dùng ảnh tĩnh dự phòng');
      }
    } catch (e) {
      this.logger.warn(`VietQR api failed: ${(e as Error).message}`);
    }

    // 2) Fallback static image (img.vietqr.io)
    const staticUrl =
      `https://img.vietqr.io/image/${cfg.bankBin}-${cfg.accountNo}` +
      `-${cfg.template}.png?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}` +
      `&accountName=${encodeURIComponent(cfg.accountName)}`;
    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentMethod: 'BANK', paymentRef: `VIETQR:${cfg.accountNo}:${amount}` },
    });
    return {
      method: 'VIETQR',
      qrImageUrl: staticUrl,
      bankBin: cfg.bankBin,
      accountNo: cfg.accountNo,
      accountName: cfg.accountName,
      amount,
      addInfo,
    };
  }

  async confirm(
    orderId: string,
    confirmedById: string,
    dto: { bankTransactionRef: string; note?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
      if (order.paymentMethod !== PaymentMethod.BANK) {
        throw new BadRequestException('Đơn hàng không dùng VietQR/chuyển khoản');
      }
      if (order.paymentStatus === PaymentStatus.PAID) {
        throw new BadRequestException('Đơn hàng đã được thanh toán');
      }
      if (order.status === OrderStatus.CANCELED) {
        throw new BadRequestException('Không thể xác nhận đơn đã hủy');
      }

      const existing = await tx.paymentConfirmation.findUnique({ where: { orderId } });
      if (existing) throw new BadRequestException('Giao dịch đã được xác nhận');

      const paymentRef = `VIETQR:${dto.bankTransactionRef.trim()}`;
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          paymentRef,
          ...(order.status === OrderStatus.PENDING && {
            status: OrderStatus.CONFIRMED,
            confirmedAt: new Date(),
          }),
        },
      });
      await tx.paymentConfirmation.create({
        data: {
          orderId,
          bankTransactionRef: dto.bankTransactionRef.trim(),
          note: dto.note?.trim() || null,
          confirmedById,
        },
      });
      return updated;
    });
  }
}
