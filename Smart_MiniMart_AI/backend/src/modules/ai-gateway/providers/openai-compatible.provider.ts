import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { AIProviderType } from '@prisma/client';

import { ChatRequest, ChatResponse, IAIProvider } from '../interfaces/ai.interface';

@Injectable()
export class OpenAICompatibleProvider implements IAIProvider {
  readonly type = AIProviderType.OPENAI_COMPATIBLE;
  readonly name = 'OpenAI Compatible';
  private readonly logger = new Logger(OpenAICompatibleProvider.name);
  private client?: AxiosInstance;

  constructor(private cfg: ConfigService) {
    const apiKey = this.cfg.get<string>('OPENAI_API_KEY');
    const baseURL = this.cfg.get<string>('OPENAI_BASE_URL', 'https://api.openai.com/v1');
    if (apiKey) {
      this.client = axios.create({
        baseURL,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 60_000,
      });
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.client;
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    if (!this.client) throw new Error('OpenAI provider chưa được cấu hình API key');

    const model = req.model ?? 'gpt-4o-mini';
    const payload: any = {
      model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 1024,
    };
    if (req.jsonMode) payload.response_format = { type: 'json_object' };

    const { data } = await this.client.post('/chat/completions', payload, {
      timeout: req.timeoutMs ?? 60_000,
    });
    return {
      text: data.choices?.[0]?.message?.content ?? '',
      raw: data,
      model: data.model ?? model,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      },
    };
  }
}
