import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

const STORE_DEFAULTS = {
  STORE_INFO: {
    name: 'Smart MiniMart AI',
    address: '123 Nguyễn Trãi, Quận 1, TP.HCM',
    phone: '0901234567',
    email: 'support@minimart.vn',
    openHours: '07:00 - 22:00',
  },
  STORE_POLICIES: {
    minOrderValue: 30000,
    shippingFee: 15000,
    freeShipThreshold: 200000,
    loyaltyPerVnd: 10000, // 10k vnd = 1 point
    vipThreshold: 1000,
  },
  PAYMENT_METHODS: {
    cod: { enabled: true, label: 'Thanh toán khi nhận hàng' },
    vnpay: { enabled: true, label: 'VNPay (ATM/Visa/QR)' },
    bank: { enabled: true, label: 'Chuyển khoản ngân hàng' },
  },
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const items = await this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
    return items;
  }

  async get(key: string) {
    let s = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!s && key in STORE_DEFAULTS) {
      // Lazy seed default
      s = await this.prisma.systemSetting.create({
        data: {
          key,
          value: (STORE_DEFAULTS as any)[key] as Prisma.InputJsonValue,
        },
      });
    }
    if (!s) throw new NotFoundException(`Setting ${key} not found`);
    return s;
  }

  async upsert(key: string, value: any) {
    const v = value === undefined || value === null
      ? Prisma.JsonNull
      : (value as Prisma.InputJsonValue);
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value: v },
      create: { key, value: v },
    });
  }

  async getStorePublicConfig() {
    // Public endpoint cho mobile app load
    const [info, policies, payment] = await Promise.all([
      this.get('STORE_INFO').catch(() => ({ value: STORE_DEFAULTS.STORE_INFO })),
      this.get('STORE_POLICIES').catch(() => ({ value: STORE_DEFAULTS.STORE_POLICIES })),
      this.get('PAYMENT_METHODS').catch(() => ({ value: STORE_DEFAULTS.PAYMENT_METHODS })),
    ]);
    return {
      info: info.value,
      policies: policies.value,
      payment: payment.value,
    };
  }
}
