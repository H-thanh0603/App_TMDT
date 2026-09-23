import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PromotionType } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';

/** Các loại giảm theo phần trăm → discountValue phải nằm trong 0..100 */
const PERCENT_TYPES: PromotionType[] = [
  PromotionType.PERCENT,
  PromotionType.FLASH_SALE,
  PromotionType.EXPIRY_DISCOUNT,
];

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  /** SEC-028: chặn dữ liệu khuyến mãi vô lý (giảm > 100% hoặc khoảng thời gian ngược). */
  private assertValidPromotion(dto: CreatePromotionDto): void {
    if (PERCENT_TYPES.includes(dto.type) && Number(dto.discountValue) > 100) {
      throw new BadRequestException('Giảm giá theo phần trăm không được vượt quá 100%');
    }
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }
  }

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
    this.assertValidPromotion(dto);
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
    this.assertValidPromotion(dto);
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
