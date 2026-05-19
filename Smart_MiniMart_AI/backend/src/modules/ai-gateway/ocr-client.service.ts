import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { OCREngine, AITaskType } from '@prisma/client';

import { OCRParseResult } from './interfaces/ai.interface';
import { AIGatewayService } from './ai-gateway.service';

@Injectable()
export class OCRClientService {
  private readonly logger = new Logger(OCRClientService.name);
  private client: AxiosInstance;

  constructor(
    private cfg: ConfigService,
    private aiGateway: AIGatewayService,
  ) {
    const baseURL = this.cfg.get<string>('OCR_SERVICE_URL', 'http://localhost:5001');
    this.client = axios.create({ baseURL, timeout: 60_000 });
  }

  async parseReceipt(imageUrl: string, engine: OCREngine): Promise<OCRParseResult> {
    const start = Date.now();
    if (engine === OCREngine.MOCK) {
      return this.mockParse(imageUrl, start);
    }

    try {
      // Bước 1: Gọi OCR service lấy raw text
      const { data } = await this.client.post('/ocr/parse', {
        image_url: imageUrl,
        engine: engine.toLowerCase(),
      });
      const rawText: string = data.raw_text ?? '';
      const baseConfidence: number = data.confidence ?? 0.5;

      // Bước 2: Dùng AI Gateway parse text -> JSON
      const llmResp = await this.aiGateway.execute({
        taskType: AITaskType.OCR_PARSE,
        userPrompt: this.buildOcrPrompt(rawText),
        refType: 'IMPORT_RECEIPT',
      });

      const parsed = (llmResp.data ?? {}) as any;
      return {
        supplierName: parsed.supplierName,
        importDate: parsed.importDate,
        rawText,
        parsed,
        items: parsed.items ?? [],
        confidence: Math.min(baseConfidence, 1.0),
        engine,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      this.logger.warn(`OCR engine ${engine} failed, fallback mock: ${err.message}`);
      return this.mockParse(imageUrl, start);
    }
  }

  private buildOcrPrompt(rawText: string): string {
    return [
      'Đây là text OCR đọc được từ phiếu nhập hàng:',
      '---',
      rawText,
      '---',
      'Trích xuất thành JSON đúng schema:',
      '{',
      '  "supplierName": string,',
      '  "importDate": "YYYY-MM-DD",',
      '  "items": [',
      '    {"productName": string, "quantity": number, "unit": string, "unitPrice": number,',
      '     "expiryDate": "YYYY-MM-DD"|null, "confidence": 0..1}',
      '  ]',
      '}',
      'Chỉ trả JSON, không giải thích thêm.',
    ].join('\n');
  }

  private mockParse(_imageUrl: string, start: number): OCRParseResult {
    const sample = {
      supplierName: 'Nhà phân phối ABC',
      importDate: new Date().toISOString().slice(0, 10),
      items: [
        { productName: 'Sữa TH True Milk 220ml', quantity: 50, unit: 'hộp', unitPrice: 8000,
          expiryDate: '2026-08-20', confidence: 0.92 },
        { productName: 'Mì Hảo Hảo tôm chua cay', quantity: 100, unit: 'gói', unitPrice: 3200,
          expiryDate: '2026-12-10', confidence: 0.88 },
        { productName: 'Cà phê G7 hộp 18 gói', quantity: 20, unit: 'hộp', unitPrice: 35_000,
          expiryDate: '2027-03-15', confidence: 0.94 },
      ],
    };
    return {
      ...sample,
      rawText: '[Mock OCR] Phiếu nhập mẫu cho demo.',
      parsed: sample,
      items: sample.items.map((it) => ({ ...it, rawProductName: it.productName })),
      confidence: 0.9,
      engine: OCREngine.MOCK,
      latencyMs: Date.now() - start,
    };
  }
}
