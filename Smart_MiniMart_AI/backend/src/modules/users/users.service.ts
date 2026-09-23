import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddressDto } from './dto/address.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        loyaltyPoints: true,
        isVip: true,
      },
    });
  }

  listAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, dto: AddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.create({ data: { ...dto, userId } });
  }

  async updateAddress(userId: string, id: string, dto: AddressDto) {
    const exists = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!exists) throw new NotFoundException('Địa chỉ không tồn tại');
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.update({ where: { id }, data: dto });
  }

  async deleteAddress(userId: string, id: string) {
    const exists = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!exists) throw new NotFoundException('Địa chỉ không tồn tại');
    await this.prisma.address.delete({ where: { id } });
    return { message: 'Đã xóa địa chỉ' };
  }

  // ========== ADMIN: User management ==========

  async listUsers(query: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where: any = {};
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
          avatarUrl: true,
          role: true,
          status: true,
          loyaltyPoints: true,
          isVip: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        status: true,
        loyaltyPoints: true,
        isVip: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  async createStaff(dto: any) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email đã tồn tại');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const { password: _, ...rest } = dto;
    const user = await this.prisma.user.create({
      data: { ...rest, passwordHash },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        isVip: true,
        createdAt: true,
      },
    });
    // Khách hàng cần giỏ hàng ngay khi được tạo (trước đây chỉ có luồng register làm việc này).
    if (user.role === 'CUSTOMER') {
      await this.prisma.cart.create({ data: { userId: user.id } }).catch(() => undefined);
    }
    return user;
  }

  async updateStaff(id: string, dto: any, actorId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    // SEC-024: không cho admin tự hạ quyền/tự khoá chính mình (chống tự bắn vào chân),
    // và luôn phải giữ ít nhất 1 STORE_ADMIN hoạt động (chống "khoá cửa" hệ thống).
    if (actorId && actorId === id) {
      if (dto.role && dto.role !== user.role) {
        throw new ForbiddenException('Không thể tự thay đổi vai trò của chính mình');
      }
      if (dto.status && dto.status !== 'ACTIVE') {
        throw new ForbiddenException('Không thể tự vô hiệu hoá tài khoản của chính mình');
      }
    }

    const losingAdmin =
      user.role === 'STORE_ADMIN' &&
      ((dto.role && dto.role !== 'STORE_ADMIN') || (dto.status && dto.status !== 'ACTIVE'));
    if (losingAdmin) {
      await this.assertNotLastAdmin(id);
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        isVip: true,
        loyaltyPoints: true,
      },
    });
  }

  async deactivateUser(id: string, actorId?: string) {
    if (actorId && actorId === id) {
      throw new ForbiddenException('Không thể tự vô hiệu hoá tài khoản của chính mình');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    if (user.role === 'STORE_ADMIN') {
      await this.assertNotLastAdmin(id);
    }
    return this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
      select: { id: true, email: true, status: true },
    });
  }

  // Q69: xuất dữ liệu user — hồ sơ + địa chỉ + đơn (không kèm passwordHash/token).
  async exportUserData(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, phone: true, fullName: true, avatarUrl: true,
        role: true, status: true, loyaltyPoints: true, isVip: true,
        createdAt: true, addresses: true,
        orders: { select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true } },
        reviews: { select: { id: true, productId: true, rating: true, comment: true, createdAt: true } },
      },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return { exportedAt: new Date().toISOString(), user };
  }

  // Q62: anonymize — ẩn danh PII, thu hồi phiên, giữ đơn hàng dạng không định danh.
  async anonymizeUser(id: string, actorId?: string) {
    if (actorId && actorId === id)
      throw new ForbiddenException('Không thể anonymize chính tài khoản mình');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    if (user.role === 'STORE_ADMIN') await this.assertNotLastAdmin(id);
    const anon = `deleted_${id.slice(0, 8)}`;
    await this.prisma.refreshToken.updateMany({ where: { userId: id }, data: { revoked: true } });
    await this.prisma.address.deleteMany({ where: { userId: id } });
    return this.prisma.user.update({
      where: { id },
      data: {
        email: `${anon}@deleted.local`, phone: null, fullName: 'Đã xóa',
        avatarUrl: null, status: 'SUSPENDED', loyaltyPoints: 0, isVip: false,
      },
      select: { id: true, status: true },
    });
  }

  /** Đảm bảo sau thao tác vẫn còn ít nhất 1 STORE_ADMIN ACTIVE khác. */
  private async assertNotLastAdmin(excludeUserId: string): Promise<void> {
    const remaining = await this.prisma.user.count({
      where: { role: 'STORE_ADMIN', status: 'ACTIVE', id: { not: excludeUserId } },
    });
    if (remaining === 0) {
      throw new ForbiddenException('Hệ thống phải còn ít nhất một STORE_ADMIN đang hoạt động');
    }
  }

  async adjustLoyalty(id: string, delta: number, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    const newPoints = Math.max(0, user.loyaltyPoints + delta);
    const isVip = newPoints >= 1000;
    const updated = await this.prisma.user.update({
      where: { id },
      data: { loyaltyPoints: newPoints, isVip },
      select: { id: true, email: true, loyaltyPoints: true, isVip: true },
    });
    // Log notification cho user
    await this.prisma.notification
      .create({
        data: {
          userId: id,
          title: delta > 0 ? 'Bạn được cộng điểm thưởng' : 'Điểm tích lũy được điều chỉnh',
          body: `${delta > 0 ? '+' : ''}${delta} điểm. ${reason ?? ''}`.trim(),
          type: 'SYSTEM',
        },
      })
      .catch(() => null);
    return updated;
  }

  // ========== Customer-facing: orders + loyalty ==========

  async getMyStats(userId: string) {
    const [orderCount, totalSpent, user] = await Promise.all([
      this.prisma.order.count({ where: { userId, status: { not: 'CANCELED' } } }),
      this.prisma.order.aggregate({
        where: { userId, status: 'COMPLETED' },
        _sum: { totalAmount: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { loyaltyPoints: true, isVip: true },
      }),
    ]);
    return {
      orderCount,
      totalSpent: Number(totalSpent._sum.totalAmount ?? 0),
      loyaltyPoints: user?.loyaltyPoints ?? 0,
      isVip: user?.isVip ?? false,
      nextVipThreshold: 1000,
    };
  }
}
