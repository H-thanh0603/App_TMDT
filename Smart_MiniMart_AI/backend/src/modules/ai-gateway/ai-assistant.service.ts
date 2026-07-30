import { Injectable, Logger } from '@nestjs/common';
import { AITaskType } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { AIGatewayService } from './ai-gateway.service';

@Injectable()
export class AIAssistantService {
  private readonly logger = new Logger(AIAssistantService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: AIGatewayService,
  ) {}

  /**
   * Chat tư vấn mua hàng. Có context về top sản phẩm để LLM gợi ý chính xác.
   */
  async chat(message: string, userId?: string, history: any[] = []) {
    // Lấy context: top 30 sản phẩm còn hàng
    const products = await this.prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      take: 30,
      orderBy: [{ isFeatured: 'desc' }, { soldCount: 'desc' }],
      select: {
        id: true,
        name: true,
        price: true,
        salePrice: true,
        unit: true,
        tags: true,
        category: { select: { name: true } },
      },
    });

    const promotionList = await this.prisma.promotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      take: 10,
      select: { code: true, name: true, type: true, discountValue: true },
    });

    const productCtx = products
      .map((p) => {
        const price = Number(p.salePrice ?? p.price);
        return `- ${p.name} (${p.category.name}): ${price.toLocaleString()}đ/${p.unit}`;
      })
      .join('\n');

    const promoCtx = promotionList.length
      ? promotionList.map((p) => `- ${p.code}: ${p.name}`).join('\n')
      : '(không có khuyến mãi)';

    const systemPrompt = [
      'Bạn là trợ lý mua sắm AI của Smart MiniMart — siêu thị mini Việt Nam.',
      'Trả lời ngắn gọn (≤120 từ), thân thiện, gợi ý sản phẩm cụ thể từ danh sách dưới.',
      'Nếu khách hỏi giá tổng/combo, hãy tính rõ và đề xuất 2-3 phương án.',
      '',
      'DANH SÁCH SẢN PHẨM CÓ SẴN:',
      productCtx,
      '',
      'KHUYẾN MÃI ĐANG CHẠY:',
      promoCtx,
    ].join('\n');

    const result = await this.gateway.execute({
      taskType: AITaskType.AI_ASSISTANT,
      systemPrompt,
      userPrompt: message,
      userId,
      refType: 'CHAT',
    });

    return {
      message: result.text ?? result.data,
      latencyMs: result.latencyMs,
      provider: result.provider,
      mode: result.mode,
    };
  }
}
