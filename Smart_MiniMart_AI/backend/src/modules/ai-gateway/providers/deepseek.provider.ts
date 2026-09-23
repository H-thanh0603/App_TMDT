import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { AIProviderType } from '@prisma/client';

import { ChatRequest, ChatResponse, IAIProvider } from '../interfaces/ai.interface';

@Injectable()
export class DeepSeekProvider implements IAIProvider {
  readonly type = AIProviderType.DEEPSEEK;
  readonly name = 'DeepSeek';
  private readonly logger = new Logger(DeepSeekProvider.name);
  private client: AxiosInstance;

  constructor(private cfg: ConfigService) {
    const apiKey = this.cfg.get<string>('DEEPSEEK_API_KEY');
    const baseURL = this.cfg.get<string>('DEEPSEEK_BASE_URL', 'https://api.deepseek.com');
    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // Q88: timeout AI 60s + retry 1 lần có jitter — chống request treo khi LLM chậm.
      timeout: 60_000,
    });
    this.client.interceptors.response.use(undefined, async (err) => {
      const cfgReq: any = err.config;
      if (!cfgReq || cfgReq.__retried || err.response?.status === 401) throw err;
      cfgReq.__retried = true;
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
      return this.client.request(cfgReq);
    });
  }

  async isAvailable(): Promise<boolean> {
    return !!this.cfg.get<string>('DEEPSEEK_API_KEY');
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const model = req.model ?? this.cfg.get<string>('AI_DEFAULT_MODEL', 'deepseek-chat');
    const payload: any = {
      model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 1024,
      stream: false,
    };
    if (req.jsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    const start = Date.now();
    try {
      const { data } = await this.client.post('/chat/completions', payload, {
        timeout: req.timeoutMs ?? 60_000,
      });
      const text = data.choices?.[0]?.message?.content ?? '';
      return {
        text,
        raw: data,
        model: data.model ?? model,
        usage: {
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens,
        },
        costUsd: this.estimateCost(data.usage, model),
      };
    } catch (err: any) {
      this.logger.error(`DeepSeek error after ${Date.now() - start}ms: ${err.message}`);
      throw err;
    }
  }

  private estimateCost(usage: any, model: string): number | undefined {
    if (!usage) return undefined;
    // DeepSeek-chat pricing (approx, USD per 1M tokens)
    // input: $0.14 (cache miss), output: $0.28
    const pIn = ((usage.prompt_tokens ?? 0) * 0.14) / 1_000_000;
    const pOut = ((usage.completion_tokens ?? 0) * 0.28) / 1_000_000;
    return Number((pIn + pOut).toFixed(6));
  }
}
