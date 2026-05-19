import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async listByProduct(productId: string, limit = 20) {
    return this.prisma.review.findMany({
      where: { productId, isHidden: false },
      take: Math.min(limit, 100),
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
  }

  async getStats(productId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { productId, isHidden: false },
      select: { rating: true },
    });
    if (reviews.length === 0) {
      return { count: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    }
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const r of reviews) {
      distribution[r.rating as 1 | 2 | 3 | 4 | 5]++;
      sum += r.rating;
    }
    return {
      count: reviews.length,
      average: Number((sum / reviews.length).toFixed(2)),
      distribution,
    };
  }

  async create(userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');

    const dup = await this.prisma.review.findFirst({
      where: { userId, productId: dto.productId, orderId: dto.orderId ?? null },
    });
    if (dup) throw new ConflictException('Bạn đã đánh giá sản phẩm này rồi');

    return this.prisma.review.create({
      data: {
        userId,
        productId: dto.productId,
        orderId: dto.orderId,
        rating: dto.rating,
        comment: dto.comment,
        imageUrls: dto.imageUrls ?? [],
      },
      include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
    });
  }

  async hide(id: string) {
    return this.prisma.review.update({
      where: { id },
      data: { isHidden: true },
    });
  }
}
