import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
        id: true, email: true, phone: true, fullName: true,
        avatarUrl: true, role: true, loyaltyPoints: true, isVip: true,
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
          id: true, email: true, phone: true, fullName: true, avatarUrl: true,
          role: true, status: true, loyaltyPoints: true, isVip: true,
          lastLoginAt: true, createdAt: true,
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
        id: true, email: true, phone: true, fullName: true, avatarUrl: true,
        role: true, status: true, loyaltyPoints: true, isVip: true,
        lastLoginAt: true, createdAt: true, updatedAt: true,
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
        id: true, email: true, fullName: true, role: true,
        status: true, isVip: true, createdAt: true,
      },
    });
    return user;
  }

  async updateStaff(id: string, dto: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true, email: true, fullName: true, role: true,
        status: true, isVip: true, loyaltyPoints: true,
      },
    });
  }

  async deactivateUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
      select: { id: true, email: true, status: true },
    });
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
    await this.prisma.notification.create({
      data: {
        userId: id,
        title: delta > 0 ? 'Bạn được cộng điểm thưởng' : 'Điểm tích lũy được điều chỉnh',
        body: `${delta > 0 ? '+' : ''}${delta} điểm. ${reason ?? ''}`.trim(),
        type: 'SYSTEM',
      },
    }).catch(() => null);
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
