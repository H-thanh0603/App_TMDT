import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class RuleSearchEngine {
  constructor(private prisma: PrismaService) {}

  /**
   * Phân tích query tiếng Việt thành filter rồi search.
   * VD: "Đồ ăn sáng dưới 30k" -> { keywords:['ăn sáng'], maxPrice:30000 }
   */
  async parseAndSearch(query: string, limit = 20) {
    const lower = query.toLowerCase().trim();
    const filters = this.extractFilters(lower);

    const where: any = { isActive: true, stock: { gt: 0 } };

    if (filters.keywords.length) {
      where.OR = filters.keywords.flatMap((kw) => [
        { name: { contains: kw, mode: 'insensitive' } },
        { description: { contains: kw, mode: 'insensitive' } },
        { tags: { has: kw } },
      ]);
    }
    if (filters.maxPrice) where.price = { ...(where.price ?? {}), lte: filters.maxPrice };
    if (filters.minPrice) where.price = { ...(where.price ?? {}), gte: filters.minPrice };
    if (filters.tags.length) where.tags = { hasSome: filters.tags };

    const products = await this.prisma.product.findMany({
      where,
      take: limit,
      orderBy: [{ isFeatured: 'desc' }, { soldCount: 'desc' }],
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    return {
      query,
      filters,
      explanation: this.buildExplanation(filters, products.length),
      products,
    };
  }

  private extractFilters(text: string): {
    keywords: string[];
    minPrice?: number;
    maxPrice?: number;
    tags: string[];
  } {
    const keywords: string[] = [];
    const tags: string[] = [];

    // Giá: "dưới 30k", "<50000", "dưới 30 nghìn"
    let maxPrice: number | undefined;
    let minPrice: number | undefined;
    const maxMatch = text.match(/(?:dưới|<|tối đa|không quá|max)\s*(\d+)(?:\s*(k|nghìn|ngàn))?/);
    if (maxMatch) {
      maxPrice = parseInt(maxMatch[1], 10) * (maxMatch[2] ? 1000 : 1);
      if (maxPrice < 1000) maxPrice *= 1000;
    }
    const minMatch = text.match(/(?:trên|>|từ|min)\s*(\d+)(?:\s*(k|nghìn|ngàn))?/);
    if (minMatch) {
      minPrice = parseInt(minMatch[1], 10) * (minMatch[2] ? 1000 : 1);
      if (minPrice < 1000) minPrice *= 1000;
    }

    // Keyword phổ biến của siêu thị
    const dict: Array<[string, string[]]> = [
      ['nước uống', ['nước', 'uống', 'giải khát']],
      ['sữa', ['sữa']],
      ['mì gói', ['mì', 'mỳ', 'mì tôm', 'mì gói']],
      ['bánh', ['bánh']],
      ['kẹo', ['kẹo']],
      ['cà phê', ['cà phê', 'cafe']],
      ['ăn sáng', ['ăn sáng', 'sáng', 'breakfast']],
      ['ăn vặt', ['ăn vặt', 'snack', 'đồ chơi']],
      ['ăn tối', ['ăn tối', 'tối']],
      ['gạo', ['gạo']],
      ['gia vị', ['gia vị', 'nước mắm', 'tương', 'muối']],
    ];
    for (const [norm, syns] of dict) {
      if (syns.some((s) => text.includes(s))) keywords.push(norm);
    }

    // Tags đặc biệt
    if (text.includes('ít đường') || text.includes('không đường')) tags.push('low-sugar');
    if (text.includes('healthy') || text.includes('lành mạnh')) tags.push('healthy');
    if (text.includes('giảm giá') || text.includes('sale')) tags.push('sale');

    return { keywords, minPrice, maxPrice, tags };
  }

  private buildExplanation(filters: any, count: number): string {
    const parts: string[] = [];
    if (filters.keywords.length) parts.push(`từ khóa: ${filters.keywords.join(', ')}`);
    if (filters.maxPrice) parts.push(`giá ≤ ${filters.maxPrice.toLocaleString()}đ`);
    if (filters.minPrice) parts.push(`giá ≥ ${filters.minPrice.toLocaleString()}đ`);
    if (filters.tags.length) parts.push(`tag: ${filters.tags.join(', ')}`);
    return `Tìm theo ${parts.join('; ')}. Tìm được ${count} sản phẩm.`;
  }
}
