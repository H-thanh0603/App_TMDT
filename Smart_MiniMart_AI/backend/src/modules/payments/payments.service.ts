import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as querystring from 'querystring';
import { PrismaService } from '@/common/prisma/prisma.service';

const VNPAY_TMN_CODE = 'DEMO0001'; // Sandbox merchant
const VNPAY_HASH_SECRET = 'DEMOSECRETKEYDEMOSECRETKEYDEMOSECRETKEY'; // demo only
const VNPAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNPAY_RETURN = 'https://smart-minimart-api.onrender.com/api/v1/payments/vnpay/return';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private prisma: PrismaService, private cfg: ConfigService) {}

  /**
   * Tạo URL thanh toán VNPay sandbox cho order.
   * App mở URL này trên WebView/browser để khách thanh toán.
   */
  async createVnpayUrl(userId: string, dto: {
    orderId: string;
    bankCode?: string;
    locale?: string;
    returnUrl?: string;
  }, ipAddr: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('Đơn hàng đã được thanh toán');
    }

    const tmnCode = this.cfg.get('VNPAY_TMN_CODE', VNPAY_TMN_CODE);
    const secret = this.cfg.get('VNPAY_HASH_SECRET', VNPAY_HASH_SECRET);
    const vnpUrl = this.cfg.get('VNPAY_URL', VNPAY_URL);
    const returnUrl: string = dto.returnUrl
      ?? this.cfg.get<string>('VNPAY_RETURN_URL')
      ?? 'https://smart-minimart-api.onrender.com/api/v1/payments/vnpay/return';

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
      vnp_OrderInfo: `Thanh toan don hang ${order.orderNumber ?? order.id.slice(0,8)}`,
      vnp_OrderType: 'other',
      vnp_Locale: dto.locale || 'vn',
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr || '127.0.0.1',
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };
    if (dto.bankCode) params.vnp_BankCode = dto.bankCode;

    const sortedParams = sortObject(params);
    const signData = querystring.stringify(sortedParams, undefined, undefined, {
      encodeURIComponent: (s: string) => encodeURIComponent(s).replace(/%20/g, '+'),
    });
    const signature = crypto
      .createHmac('sha512', secret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');
    sortedParams.vnp_SecureHash = signature;

    const finalUrl = vnpUrl + '?' + querystring.stringify(sortedParams, undefined, undefined, {
      encodeURIComponent: (s: string) => encodeURIComponent(s).replace(/%20/g, '+'),
    });

    // Log payment attempt vào order
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
   * Verify return URL từ VNPay sandbox.
   * Chỉ là demo - production cần verify IPN URL nữa.
   */
  async handleVnpayReturn(query: Record<string, string>) {
    const secret = this.cfg.get('VNPAY_HASH_SECRET', VNPAY_HASH_SECRET);
    const { vnp_SecureHash, vnp_SecureHashType, ...rest } = query;
    const sorted = sortObject(rest);
    const signData = querystring.stringify(sorted, undefined, undefined, {
      encodeURIComponent: (s: string) => encodeURIComponent(s).replace(/%20/g, '+'),
    });
    const computed = crypto
      .createHmac('sha512', secret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    const valid = computed === vnp_SecureHash;
    const success = query.vnp_ResponseCode === '00';
    const orderRef = query.vnp_TxnRef;

    if (valid && success && orderRef) {
      const order = await this.prisma.order.findFirst({
        where: { paymentRef: orderRef },
      });
      if (order) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'PAID',
            status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
          },
        });
      }
    }

    return {
      valid,
      success,
      orderRef,
      responseCode: query.vnp_ResponseCode,
      message: success ? 'Thanh toán thành công' : 'Thanh toán thất bại hoặc bị hủy',
    };
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
  Object.keys(obj).sort().forEach((k) => {
    sorted[k] = String(obj[k]);
  });
  return sorted;
}
