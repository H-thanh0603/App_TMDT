import { Injectable, NotFoundException } from '@nestjs/common';
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
}
