import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

    // Xác minh đã mua: phải có đơn COMPLETED của chính user chứa sản phẩm này (SEC-007).
    // Nếu client truyền orderId, đơn đó cũng phải thuộc user + đúng trạng thái + chứa sản phẩm.
    const orderWhere: Prisma.OrderWhereInput = {
      userId,
      status: 'COMPLETED',
      items: { some: { productId: dto.productId } },
    };
    if (dto.orderId) orderWhere.id = dto.orderId;

    const purchased = await this.prisma.order.findFirst({
      where: orderWhere,
      select: { id: true },
    });
    if (!purchased) {
      throw new ForbiddenException('Bạn chỉ có thể đánh giá sản phẩm đã mua và đơn đã hoàn tất');
    }
    const orderId = dto.orderId ?? purchased.id;

    const dup = await this.prisma.review.findFirst({
      where: { userId, productId: dto.productId, orderId },
    });
    if (dup) throw new ConflictException('Bạn đã đánh giá sản phẩm này rồi');

    return this.prisma.review.create({
      data: {
        userId,
        productId: dto.productId,
        orderId,
        rating: dto.rating,
        comment: dto.comment,
        imageUrls: dto.imageUrls ?? [],
      },
      include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
    });
  }

  async hide(id: string) {
    const existing = await this.prisma.review.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Đánh giá không tồn tại');
    return this.prisma.review.update({
      where: { id },
      data: { isHidden: true },
    });
  }
}
