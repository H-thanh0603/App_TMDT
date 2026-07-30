import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as querystring from 'querystring';
import { PrismaService } from '@/common/prisma/prisma.service';

const DEFAULT_VNPAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const DEFAULT_RETURN_URL = 'https://smart-minimart-api.onrender.com/api/v1/payments/vnpay/return';

interface VnpayConfig {
  tmnCode: string;
  secret: string;
  vnpUrl: string;
  returnUrl: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private cfg: ConfigService,
  ) {}

  /**
   * Đọc cấu hình VNPay từ env. KHÔNG có secret mặc định/hard-code.
   * Fail-closed: nếu thiếu TMN code hoặc hash secret → từ chối xử lý.
   */
  private getVnpayConfig(): VnpayConfig {
    const tmnCode = this.cfg.get<string>('VNPAY_TMN_CODE');
    const secret = this.cfg.get<string>('VNPAY_HASH_SECRET');
    if (!tmnCode || !secret) {
      throw new ServiceUnavailableException(
        'Cổng thanh toán VNPay chưa được cấu hình (VNPAY_TMN_CODE / VNPAY_HASH_SECRET)',
      );
    }
    return {
      tmnCode,
      secret,
      vnpUrl: this.cfg.get<string>('VNPAY_URL', DEFAULT_VNPAY_URL),
      returnUrl: this.cfg.get<string>('VNPAY_RETURN_URL', DEFAULT_RETURN_URL),
    };
  }

  private encodeVnp(s: string): string {
    return encodeURIComponent(s).replace(/%20/g, '+');
  }

  private signParams(params: Record<string, string>, secret: string): string {
    const signData = querystring.stringify(params, undefined, undefined, {
      encodeURIComponent: (s: string) => this.encodeVnp(s),
    });
    return crypto.createHmac('sha512', secret).update(Buffer.from(signData, 'utf-8')).digest('hex');
  }

  /** Verify chữ ký VNPay bằng so sánh timing-safe. */
  private verifySignature(query: Record<string, string>, secret: string): boolean {
    const { vnp_SecureHash, vnp_SecureHashType, ...rest } = query;
    if (!vnp_SecureHash) return false;
    const computed = this.signParams(sortObject(rest), secret);
    const a = Buffer.from(computed, 'utf-8');
    const b = Buffer.from(String(vnp_SecureHash).toLowerCase(), 'utf-8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  /**
   * Tạo URL thanh toán VNPay sandbox cho order.
   * App mở URL này trên WebView/browser để khách thanh toán.
   */
  async createVnpayUrl(
    userId: string,
    dto: {
      orderId: string;
      bankCode?: string;
      locale?: string;
      // returnUrl từ client bị bỏ qua có chủ đích để tránh open redirect
      returnUrl?: string;
    },
    ipAddr: string,
  ) {
    const { tmnCode, secret, vnpUrl, returnUrl } = this.getVnpayConfig();

    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('Đơn hàng đã được thanh toán');
    }

    const date = new Date();
    const createDate = formatVnpayDate(date);
    const expireDate = formatVnpayDate(new Date(date.getTime() + 15 * 60_000));
    const orderRef = `${order.id.slice(0, 8)}_${Date.now()}`;
    const amount = Math.round(Number(order.totalAmount)) * 100; // VNPay yêu cầu *100

    const params: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: amount,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderRef,
      vnp_OrderInfo: `Thanh toan don hang ${order.orderNumber ?? order.id.slice(0, 8)}`,
      vnp_OrderType: 'other',
      vnp_Locale: dto.locale || 'vn',
      // Luôn dùng returnUrl cấu hình phía server, không nhận từ client
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr || '127.0.0.1',
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };
    if (dto.bankCode) params.vnp_BankCode = dto.bankCode;

    const sortedParams = sortObject(params);
    sortedParams.vnp_SecureHash = this.signParams(sortedParams, secret);

    const finalUrl =
      vnpUrl +
      '?' +
      querystring.stringify(sortedParams, undefined, undefined, {
        encodeURIComponent: (s: string) => this.encodeVnp(s),
      });

    // Ghi nhận payment attempt vào order (chưa đổi paymentStatus)
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentMethod: 'VNPAY_SANDBOX',
        paymentRef: orderRef,
      },
    });

    return { url: finalUrl, orderRef, amount: order.totalAmount };
  }

  /**
   * Return URL — CHỈ hiển thị kết quả cho client sau khi verify chữ ký.
   * KHÔNG cập nhật trạng thái đơn (tránh giả mạo qua URL người dùng điều khiển).
   * Nguồn sự thật là IPN (handleVnpayIpn).
   */
  async handleVnpayReturn(query: Record<string, string>) {
    const { secret } = this.getVnpayConfig();
    const valid = this.verifySignature(query, secret);
    const success = valid && query.vnp_ResponseCode === '00';
    return {
      valid,
      success,
      orderRef: query.vnp_TxnRef,
      responseCode: query.vnp_ResponseCode,
      message: !valid
        ? 'Chữ ký không hợp lệ'
        : success
          ? 'Thanh toán thành công'
          : 'Thanh toán thất bại hoặc bị hủy',
    };
  }

  /**
   * IPN URL — nguồn xác nhận thanh toán DUY NHẤT (server-to-server từ VNPay).
   * Verify chữ ký + đối chiếu số tiền + cập nhật idempotent.
   * Trả về đúng format IPN của VNPay: { RspCode, Message }.
   */
  async handleVnpayIpn(query: Record<string, string>) {
    const { secret } = this.getVnpayConfig();

    if (!this.verifySignature(query, secret)) {
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    const orderRef = query.vnp_TxnRef;
    if (!orderRef) return { RspCode: '01', Message: 'Order not found' };

    const order = await this.prisma.order.findFirst({
      where: { paymentRef: orderRef },
    });
    if (!order) return { RspCode: '01', Message: 'Order not found' };

    // Đối chiếu số tiền (chống thanh toán thiếu)
    const expectedAmount = Math.round(Number(order.totalAmount)) * 100;
    if (Number(query.vnp_Amount) !== expectedAmount) {
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    // Idempotency: đã xử lý PAID rồi thì không xử lý lại
    if (order.paymentStatus === 'PAID') {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    const success = query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00';

    if (success) {
      const nextStatus = order.status === 'PENDING' ? 'CONFIRMED' : order.status;
      // Chỉ cập nhật khi vẫn UNPAID → chống race/replay
      const res = await this.prisma.order.updateMany({
        where: { id: order.id, paymentStatus: 'UNPAID' },
        data: { paymentStatus: 'PAID', status: nextStatus },
      });
      if (res.count === 0) {
        return { RspCode: '02', Message: 'Order already confirmed' };
      }
      this.logger.log(`VNPay IPN: order ${order.orderNumber} → PAID`);
    } else {
      await this.prisma.order.updateMany({
        where: { id: order.id, paymentStatus: 'UNPAID' },
        data: { paymentStatus: 'FAILED' },
      });
      this.logger.warn(
        `VNPay IPN: order ${order.orderNumber} thất bại (code=${query.vnp_ResponseCode})`,
      );
    }

    return { RspCode: '00', Message: 'Confirm Success' };
  }
}

function formatVnpayDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

function sortObject(obj: Record<string, any>): Record<string, string> {
  const sorted: Record<string, string> = {};
  Object.keys(obj)
    .sort()
    .forEach((k) => {
      sorted[k] = String(obj[k]);
    });
  return sorted;
}
