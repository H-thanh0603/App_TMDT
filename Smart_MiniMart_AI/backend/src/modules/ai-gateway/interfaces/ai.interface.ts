import { AITaskType, AIProviderType, AIMode, OCREngine } from '@prisma/client';

export interface AIRequest {
  taskType: AITaskType;
  providerId?: string;
  systemPrompt?: string;
  userPrompt: string;
  context?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  userId?: string;
  refType?: string;
  refId?: string;
}

export interface AIResponse {
  success: boolean;
  data: any;
  text?: string;
  raw?: any;
  provider?: string;
  model?: string;
  mode: AIMode;
  latencyMs: number;
  tokensUsed?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  costUsd?: number;
  confidence?: number;
  error?: string;
}

export interface IAIProvider {
  readonly type: AIProviderType;
  readonly name: string;

  isAvailable(): Promise<boolean>;
  chat(req: ChatRequest): Promise<ChatResponse>;
  parseImage?(imageUrl: string, prompt: string): Promise<ChatResponse>;
}

export interface ChatRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
}

export interface ChatResponse {
  text: string;
  raw: any;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  costUsd?: number;
}

// ========== OCR types ==========

export interface OCRItem {
  rawProductName?: string;
  productName: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  expiryDate?: string;
  confidence?: number;
}

export interface OCRParseResult {
  supplierName?: string;
  importDate?: string;
  rawText: string;
  parsed: Record<string, unknown>;
  items: OCRItem[];
  confidence: number;
  engine: OCREngine;
  latencyMs: number;
}
