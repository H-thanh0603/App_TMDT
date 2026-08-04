import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIMode, AITaskType, AIProviderType } from '@prisma/client';
import { ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '@/common/prisma/prisma.service';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { OpenAICompatibleProvider } from './providers/openai-compatible.provider';
import { MockProvider } from './providers/mock.provider';
import { AIRequest, AIResponse, ChatRequest, IAIProvider } from './interfaces/ai.interface';

@Injectable()
export class AIGatewayService {
  private readonly logger = new Logger(AIGatewayService.name);

  constructor(
    private prisma: PrismaService,
    private cfg: ConfigService,
    private deepseek: DeepSeekProvider,
    private openai: OpenAICompatibleProvider,
    private mock: MockProvider,
  ) {}

  /**
   * Điểm vào duy nhất cho mọi tác vụ AI.
   * Tự động: load task config -> chọn provider -> fallback nếu lỗi -> ghi log.
   */
  async execute(req: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    const taskConfig = await this.prisma.aITaskConfig.findUnique({
      where: { taskType: req.taskType },
    });

    const mode = taskConfig?.mode ?? AIMode.HYBRID;
    const isJsonMode = this.shouldUseJsonMode(req.taskType);

    // RULE_BASED hoặc MOCK -> không gọi LLM
    if (mode === AIMode.RULE_BASED || mode === AIMode.MOCK) {
      return this.executeMock(req, start, mode);
    }

    // ONLINE / HYBRID -> thử primary provider
    const providerId = req.providerId ?? taskConfig?.primaryProviderId;
    const primaryType = await this.resolveProviderType(providerId);
    try {
      if (providerId) await this.assertUsageAllowed(providerId);
      const provider = this.getProvider(primaryType);
      const chatReq: ChatRequest = {
        messages: this.buildMessages(req, taskConfig?.systemPrompt),
        model: taskConfig?.primaryModel ?? this.cfg.get('AI_DEFAULT_MODEL', 'deepseek-chat'),
        temperature: req.temperature ?? Number(taskConfig?.temperature ?? 0.7),
        maxTokens: req.maxTokens ?? taskConfig?.maxTokens ?? 1024,
        timeoutMs: req.timeoutMs ?? taskConfig?.timeoutMs ?? 30_000,
        jsonMode: isJsonMode,
      };
      const result = await provider.chat(chatReq);
      const response = this.toAIResponse(req, result, provider, mode, start);
      await this.logAI(req, response, providerId);
      return response;
    } catch (err: any) {
      this.logger.warn(`Primary provider failed, fallback to mock: ${err.message}`);
      const fallback = await this.executeMock(req, start, AIMode.MOCK, err.message);
      await this.logAI(req, fallback, providerId);
      return fallback;
    }
  }

  // ========== Private helpers ==========

  private async executeMock(
    req: AIRequest,
    start: number,
    mode: AIMode,
    errorMsg?: string,
  ): Promise<AIResponse> {
    const result = await this.mock.chat({
      messages: this.buildMessages(req),
      jsonMode: this.shouldUseJsonMode(req.taskType),
    });
    return {
      success: true,
      data: this.tryParseJson(result.text),
      text: result.text,
      raw: result.raw,
      provider: this.mock.name,
      model: result.model,
      mode,
      latencyMs: Date.now() - start,
      tokensUsed: result.usage
        ? {
            prompt: result.usage.promptTokens,
            completion: result.usage.completionTokens,
            total: result.usage.totalTokens,
          }
        : undefined,
      costUsd: 0,
      error: errorMsg,
    };
  }

  private toAIResponse(
    req: AIRequest,
    result: any,
    provider: IAIProvider,
    mode: AIMode,
    start: number,
  ): AIResponse {
    return {
      success: true,
      data: this.tryParseJson(result.text),
      text: result.text,
      raw: result.raw,
      provider: provider.name,
      model: result.model,
      mode,
      latencyMs: Date.now() - start,
      tokensUsed: result.usage
        ? {
            prompt: result.usage.promptTokens,
            completion: result.usage.completionTokens,
            total: result.usage.totalTokens,
          }
        : undefined,
      costUsd: result.costUsd,
    };
  }

  private buildMessages(
    req: AIRequest,
    systemOverride?: string | null,
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const sys = systemOverride ?? req.systemPrompt ?? this.defaultSystemPrompt(req.taskType);
    return [
      { role: 'system', content: sys },
      { role: 'user', content: req.userPrompt },
    ];
  }

  private getProvider(type: AIProviderType): IAIProvider {
    switch (type) {
      case AIProviderType.DEEPSEEK:
        return this.deepseek;
      case AIProviderType.OPENAI_COMPATIBLE:
        return this.openai;
      case AIProviderType.MOCK:
        return this.mock;
      case AIProviderType.SYSTEM_DEFAULT:
      default: {
        const def = this.cfg.get<string>('AI_DEFAULT_PROVIDER', 'deepseek');
        if (def === 'openai') return this.openai;
        if (def === 'mock') return this.mock;
        return this.deepseek;
      }
    }
  }

  private async resolveProviderType(providerId?: string | null): Promise<AIProviderType> {
    if (!providerId) return AIProviderType.SYSTEM_DEFAULT;
    const provider = await this.prisma.aIProvider.findUnique({
      where: { id: providerId },
      select: { type: true, status: true },
    });
    return provider?.status === 'ACTIVE' ? provider.type : AIProviderType.SYSTEM_DEFAULT;
  }

  private shouldUseJsonMode(taskType: AITaskType): boolean {
    const jsonTasks: AITaskType[] = [
      AITaskType.AI_SEARCH,
      AITaskType.OCR_PARSE,
      AITaskType.ANALYTICS_SLOWMOVING,
      AITaskType.PROMOTION_SUGGEST,
      AITaskType.RESTOCK_SUGGEST,
    ];
    return jsonTasks.includes(taskType);
  }

  private tryParseJson(text: string): any {
    if (!text) return null;
    const trimmed = text.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return text;
    try {
      return JSON.parse(trimmed);
    } catch {
      // Try to extract JSON block từ markdown
      const match = text.match(/```(?:json)?\s*([\s\S]+?)```/);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch {
          /* ignore */
        }
      }
      return text;
    }
  }

  private defaultSystemPrompt(taskType: AITaskType): string {
    const prompts: Record<AITaskType, string> = {
      AI_SEARCH:
        'Bạn là trợ lý tìm kiếm sản phẩm cho siêu thị mini Việt Nam. ' +
        'Hãy trích xuất từ câu hỏi của khách hàng các thông tin: từ khóa, giá, danh mục, tags. ' +
        'Trả về JSON: {keywords: string[], maxPrice: number?, minPrice: number?, tags: string[], explanation: string}',
      AI_ASSISTANT:
        'Bạn là trợ lý mua sắm thân thiện cho siêu thị mini. Trả lời ngắn gọn, hữu ích, tiếng Việt.',
      OCR_PARSE:
        'Bạn là chuyên gia trích xuất dữ liệu từ phiếu nhập hàng. ' +
        'Trả về JSON: {supplierName, importDate, items: [{productName, quantity, unitPrice, expiryDate, confidence}]}',
      ANALYTICS_SLOWMOVING:
        'Bạn là chuyên gia phân tích bán lẻ. Phân tích danh sách sản phẩm và đề xuất hàng bán chậm.',
      PROMOTION_SUGGEST:
        'Bạn là chuyên gia marketing. Đề xuất chương trình khuyến mãi phù hợp với danh sách sản phẩm.',
      REVIEW_SUMMARY:
        'Tóm tắt đánh giá sản phẩm thành 2-3 câu súc tích, nêu điểm tốt và điểm chưa tốt.',
      CONTENT_GENERATION:
        'Sinh nội dung mô tả sản phẩm hấp dẫn, ngắn gọn, phù hợp khách hàng Việt Nam.',
      RESTOCK_SUGGEST:
        'Phân tích và đề xuất số lượng nhập hàng tối ưu dựa trên dữ liệu bán + tồn kho.',
    };
    return prompts[taskType] ?? 'Bạn là trợ lý AI thông minh, trả lời ngắn gọn và hữu ích.';
  }

  private async logAI(req: AIRequest, res: AIResponse, providerId?: string | null): Promise<void> {
    try {
      await this.prisma.aILog.create({
        data: {
          taskType: req.taskType,
          providerId: providerId ?? undefined,
          providerName: res.provider,
          model: res.model,
          mode: res.mode,
          status: res.error ? 'fallback' : 'success',
          inputSummary: req.userPrompt.slice(0, 500),
          outputSummary: res.text?.slice(0, 500),
          errorMessage: res.error,
          latencyMs: res.latencyMs,
          promptTokens: res.tokensUsed?.prompt,
          completionTokens: res.tokensUsed?.completion,
          totalTokens: res.tokensUsed?.total,
          costUsd: res.costUsd,
          confidence: res.confidence,
          userId: req.userId,
          refType: req.refType,
          refId: req.refId,
        },
      });
      if (providerId) {
        await this.prisma.aIUsageLimit.updateMany({
          where: { scope: `provider:${providerId}` },
          data: {
            currentMonthCount: { increment: 1 },
            currentMonthCost: { increment: res.costUsd ?? 0 },
          },
        });
      }
    } catch (err) {
      this.logger.error('Failed to log AI request', err);
    }
  }

  private async assertUsageAllowed(providerId: string): Promise<void> {
    const limit = await this.prisma.aIUsageLimit.findUnique({ where: { scope: `provider:${providerId}` } });
    if (!limit?.isEnforced) return;
    const now = new Date();
    const reset = limit.resetMonthAt;
    if (!reset || reset.getUTCFullYear() !== now.getUTCFullYear() || reset.getUTCMonth() !== now.getUTCMonth()) {
      await this.prisma.aIUsageLimit.update({ where: { id: limit.id }, data: { currentMonthCount: 0, currentMonthCost: 0, resetMonthAt: now } });
      return;
    }
    if ((limit.monthlyRequestLimit != null && limit.monthlyRequestLimit > 0 && limit.currentMonthCount >= limit.monthlyRequestLimit)
      || (Number(limit.monthlyCostLimitUsd ?? 0) > 0 && Number(limit.currentMonthCost) >= Number(limit.monthlyCostLimitUsd))) {
      throw new ServiceUnavailableException('Provider đã đạt hạn mức tháng');
    }
  }
}
