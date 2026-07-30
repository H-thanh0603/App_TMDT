import { Injectable } from '@nestjs/common';
import { AIProviderType } from '@prisma/client';
import { ChatRequest, ChatResponse, IAIProvider } from '../interfaces/ai.interface';

@Injectable()
export class MockProvider implements IAIProvider {
  readonly type = AIProviderType.MOCK;
  readonly name = 'Mock AI';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const userMsg = req.messages.filter((m) => m.role === 'user').pop()?.content ?? '';
    const lower = userMsg.toLowerCase();

    let text: string;
    if (req.jsonMode) {
      // Trả JSON mẫu cho parser
      text = JSON.stringify({
        intent: 'product_search',
        keywords: this.extractKeywords(lower),
        priceRange: this.extractPriceRange(lower),
        explanation: 'Đây là phản hồi mẫu từ Mock AI để demo khi chưa có API key thật.',
      });
    } else {
      text =
        `[Mock AI] Đây là câu trả lời mẫu cho: "${userMsg.slice(0, 80)}". ` +
        `Để dùng AI thật, AI Manager hãy cấu hình DeepSeek hoặc OpenAI provider.`;
    }

    return {
      text,
      raw: { mock: true },
      model: 'mock-v1',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      costUsd: 0,
    };
  }

  private extractKeywords(text: string): string[] {
    const tokens = [
      'nước',
      'sữa',
      'mì',
      'bánh',
      'kẹo',
      'gia vị',
      'snack',
      'đồ ăn sáng',
      'cà phê',
      'trà',
      'gạo',
      'dầu ăn',
      'nước rửa chén',
    ];
    return tokens.filter((t) => text.includes(t));
  }

  private extractPriceRange(text: string): { min?: number; max?: number } {
    const match = text.match(/(?:dưới|<|khoảng|tầm)\s*(\d+)\s*k/i);
    if (match) return { max: parseInt(match[1], 10) * 1000 };
    return {};
  }
}
