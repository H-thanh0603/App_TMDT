import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';

const VIETQR_API = 'https://api.vietqr.io/v2/generate';

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

  private getConfig(dto: Partial<VietQrConfig>): VietQrConfig {
    return {
      bankBin: dto.bankBin || this.cfg.get<string>('VIETQR_BANK_BIN', '970422'), // MB default
      accountNo: dto.accountNo || this.cfg.get<string>('VIETQR_ACCOUNT_NO', '0123456789'), // demo STK, đổi trên Render
      accountName: dto.accountName || this.cfg.get<string>('VIETQR_ACCOUNT_NAME', 'SMART MINIMART'),
      template: dto.template || this.cfg.get<'compact' | 'qr_only' | 'print'>('VIETQR_TEMPLATE', 'compact'),
    };
  }

  /**
   * Sinh VietQR tĩnh (image URL hoặc data URL) cho 1 đơn hàng.
   * Ưu tiên dùng api.vietqr.io (public, không cần key cho tier cơ bản).
   * Nếu thất bại, fallback về URL img.vietqr.io (static).
   */
  async generate(userId: string, dto: {
    orderId: string;
    bankBin?: string;
    accountNo?: string;
    accountName?: string;
    template?: 'compact' | 'qr_only' | 'print';
  }) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('Đơn hàng đã thanh toán');
    }

    const cfg = this.getConfig(dto);
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
      });
      if (resp.ok) {
        const data = (await resp.json()) as any;
        if (data?.data?.qrDataURL) {
          // lưu ref để đối soát thủ công
          await this.prisma.order.update({
            where: { id: order.id },
            data: { paymentMethod: 'BANK', paymentRef: `VIETQR:${cfg.accountNo}:${amount}` },
          });
          return {
            method: 'VIETQR',
            qrDataUrl: data.data.qrDataURL,
            bankBin: cfg.bankBin,
            accountNo: cfg.accountNo,
            accountName: cfg.accountName,
            amount,
            addInfo,
          };
        }
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
}
