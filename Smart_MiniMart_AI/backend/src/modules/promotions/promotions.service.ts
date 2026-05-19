import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async listActive() {
    const now = new Date();
    return this.prisma.promotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: { products: { include: { product: true } } },
      orderBy: { endDate: 'asc' },
    });
  }

  async listAll() {
    return this.prisma.promotion.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async findByCode(code: string) {
    const promo = await this.prisma.promotion.findUnique({
      where: { code },
      include: { products: { include: { product: true } } },
    });
    if (!promo) throw new NotFoundException('Mã khuyến mãi không tồn tại');
    return promo;
  }

  async findOne(id: string) {
    const promo = await this.prisma.promotion.findUnique({
      where: { id },
      include: { products: { include: { product: true } } },
    });
    if (!promo) throw new NotFoundException('Khuyến mãi không tồn tại');
    return promo;
  }

  async create(dto: CreatePromotionDto) {
    const dup = await this.prisma.promotion.findUnique({ where: { code: dto.code } });
    if (dup) throw new ConflictException('Mã khuyến mãi đã tồn tại');

    const { productIds, ...rest } = dto;
    return this.prisma.promotion.create({
      data: {
        ...rest,
        startDate: new Date(rest.startDate),
        endDate: new Date(rest.endDate),
        products: productIds?.length
          ? { create: productIds.map((productId) => ({ productId })) }
          : undefined,
      },
      include: { products: true },
    });
  }

  async update(id: string, dto: UpdatePromotionDto) {
    await this.findOne(id);
    const { productIds, ...rest } = dto;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.promotion.update({
        where: { id },
        data: {
          ...rest,
          startDate: new Date(rest.startDate),
          endDate: new Date(rest.endDate),
        },
      });
      if (productIds !== undefined) {
        await tx.promotionProduct.deleteMany({ where: { promotionId: id } });
        if (productIds.length) {
          await tx.promotionProduct.createMany({
            data: productIds.map((productId) => ({ promotionId: id, productId })),
          });
        }
      }
      return updated;
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.promotion.delete({ where: { id } });
    return { message: 'Đã xóa khuyến mãi' };
  }
}
