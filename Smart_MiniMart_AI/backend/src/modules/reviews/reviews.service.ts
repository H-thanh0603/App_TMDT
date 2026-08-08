import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AITaskType, Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AIGatewayService } from '@/modules/ai-gateway/ai-gateway.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private prisma: PrismaService,
    private aiGateway: AIGatewayService,
  ) {}

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

    // 1 đánh giá / 1 sản phẩm / 1 user (kể cả mua ở nhiều đơn COMPLETED).
    // Dedup theo productId — không theo orderId để tránh review rác nhiều lần.
    const dup = await this.prisma.review.findFirst({
      where: { userId, productId: dto.productId },
    });
    if (dup) throw new ConflictException('Bạn đã đánh giá sản phẩm này rồi');

    const review = await this.prisma.review.create({
      data: {
        userId,
        productId: dto.productId,
        orderId,
        rating: Math.min(5, Math.max(1, dto.rating)), // clamp defense-in-depth
        comment: dto.comment,
        imageUrls: dto.imageUrls ?? [],
      },
      include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
    });

    // Tóm tắt AI bất đồng bộ (không chặn user) — fail mềm: provider lỗi không hỏng review.
    if (dto.comment?.trim()) {
      const reviewId = review.id;
      const comment = dto.comment.trim();
      void this.aiGateway
        .execute({
          taskType: AITaskType.REVIEW_SUMMARY,
          userPrompt: comment,
          userId,
          refType: 'REVIEW',
          refId: reviewId,
          maxTokens: 200,
          temperature: 0.4,
        })
        .then((resp) => {
          const summary = resp?.text?.trim();
          if (!summary) return;
          return this.prisma.review.update({
            where: { id: reviewId },
            data: { aiSummary: summary.slice(0, 500) },
          });
        })
        .catch((err) => {
          this.logger.warn(`AI summary for review ${reviewId} failed: ${err}`);
        });
    }

    return review;
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
