import { Injectable, Logger } from '@nestjs/common';
import { AITaskType } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { AIGatewayService } from './ai-gateway.service';
import { RuleSearchEngine } from './rule-engine/rule-search.engine';

@Injectable()
export class AISearchService {
  private readonly logger = new Logger(AISearchService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: AIGatewayService,
    private ruleEngine: RuleSearchEngine,
  ) {}

  /**
   * Tìm kiếm hybrid:
   * 1. Gọi LLM extract intent (keywords, price range, tags)
   * 2. Fallback rule engine nếu LLM lỗi
   * 3. Truy vấn DB
   * 4. LLM viết explanation tự nhiên
   */
  async search(query: string, userId?: string, limit = 20) {
    const start = Date.now();

    // 1. Extract intent
    let intent: any;
    let usedAI = false;
    try {
      const llmResp = await this.gateway.execute({
        taskType: AITaskType.AI_SEARCH,
        userPrompt: query,
        userId,
        refType: 'SEARCH',
      });
      if (typeof llmResp.data === 'object' && llmResp.data) {
        intent = llmResp.data;
        usedAI = true;
      }
    } catch (err) {
      this.logger.warn(`LLM intent extraction failed: ${err}`);
    }

    if (!intent) {
      const ruleResult = await this.ruleEngine.parseAndSearch(query, limit);
      return {
        ...ruleResult,
        usedAI: false,
        latencyMs: Date.now() - start,
      };
    }

    // 2. Build filter từ intent
    const where: any = { isActive: true, stock: { gt: 0 } };
    const keywords = (intent.keywords ?? []) as string[];
    if (keywords.length) {
      where.OR = keywords.flatMap((kw) => [
        { name: { contains: kw, mode: 'insensitive' } },
        { description: { contains: kw, mode: 'insensitive' } },
        { tags: { has: kw } },
      ]);
    }
    if (intent.maxPrice) where.price = { ...(where.price ?? {}), lte: intent.maxPrice };
    if (intent.minPrice) where.price = { ...(where.price ?? {}), gte: intent.minPrice };
    if (Array.isArray(intent.tags) && intent.tags.length) {
      where.tags = { hasSome: intent.tags };
    }

    const products = await this.prisma.product.findMany({
      where,
      take: limit,
      orderBy: [{ isFeatured: 'desc' }, { soldCount: 'desc' }],
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    return {
      query,
      intent,
      explanation: intent.explanation ?? `Tìm được ${products.length} sản phẩm phù hợp.`,
      products,
      usedAI,
      latencyMs: Date.now() - start,
    };
  }
}
