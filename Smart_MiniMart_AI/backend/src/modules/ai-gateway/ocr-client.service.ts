import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { OCREngine, AITaskType } from '@prisma/client';

import { OCRParseResult, OCRItem } from './interfaces/ai.interface';
import { AIGatewayService } from './ai-gateway.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { assertSafeHttpUrl } from '@/common/utils/url-safety';

@Injectable()
export class OCRClientService {
  private readonly logger = new Logger(OCRClientService.name);
  private client: AxiosInstance;

  constructor(
    private cfg: ConfigService,
    private aiGateway: AIGatewayService,
    private prisma: PrismaService,
  ) {
    const baseURL = this.cfg.get<string>('OCR_SERVICE_URL', 'http://localhost:5001');
    this.client = axios.create({ baseURL, timeout: 60_000 });
  }

  async parseReceipt(imageUrl: string, engine: OCREngine): Promise<OCRParseResult> {
    const start = Date.now();
    if (engine === OCREngine.MOCK) {
      return this.mockParse(imageUrl, start);
    }

    // Chống SSRF: nếu imageUrl là http(s) thì phải là URL công khai (không trỏ nội bộ)
    if (/^https?:/i.test(imageUrl)) {
      assertSafeHttpUrl(imageUrl);
    }

    try {
      // Step 1: OCR raw text
      const { data } = await this.client.post('/ocr/parse', {
        image_url: imageUrl,
        engine: engine.toLowerCase(),
      });
      const rawText: string = data.raw_text ?? '';
      const baseConfidence: number = data.confidence ?? 0.5;

      // Step 2: Pre-clean text
      const cleanedText = this.cleanRawText(rawText);

      // Step 3: LLM parse with VN-aware prompt + product hints
      const productHints = await this.getProductHints();
      const llmResp = await this.aiGateway.execute({
        taskType: AITaskType.OCR_PARSE,
        userPrompt: this.buildOcrPrompt(cleanedText, productHints),
        refType: 'IMPORT_RECEIPT',
      });

      const parsed = (llmResp.data ?? {}) as any;
      const rawItems: any[] = parsed.items ?? [];

      // Step 4: Post-process + match against DB
      const items = await this.matchProducts(rawItems);

      // Step 5: Compute confidence
      const matchedRatio =
        items.length > 0 ? items.filter((i) => (i.confidence ?? 0) > 0.7).length / items.length : 0;
      const finalConfidence = Math.min(baseConfidence * 0.5 + matchedRatio * 0.5, 1.0);

      return {
        supplierName: parsed.supplierName,
        importDate: parsed.importDate,
        rawText,
        parsed,
        items,
        confidence: finalConfidence,
        engine,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      this.logger.warn(`OCR engine ${engine} failed, fallback mock: ${err.message}`);
      return this.mockParse(imageUrl, start);
    }
  }

  /**
   * Pre-clean OCR raw text:
   * - Strip OCR artifacts
   * - Normalize VN diacritics
   * - Fix common confusions (0/O, 1/l, ...)
   */
  private cleanRawText(text: string): string {
    return text
      .replace(/[│┃|]/g, '|') // unify pipe chars
      .replace(/[─━]/g, '-') // unify dashes
      .replace(/[ \t]+/g, ' ') // collapse spaces
      .replace(/\n{3,}/g, '\n\n') // collapse blank lines
      .replace(/(\d)O/g, '$10') // O -> 0 in numbers
      .replace(/O(\d)/g, '0$1')
      .replace(/(\d) (\d{3})/g, '$1$2') // join split thousands "12 000" -> "12000"
      .trim();
  }

  /**
   * Lấy danh sách product gợi ý (top 50 SP có sẵn) để LLM map đúng.
   */
  private async getProductHints(): Promise<string[]> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: { sku: true, name: true, unit: true },
      take: 50,
      orderBy: { soldCount: 'desc' },
    });
    return products.map((p) => `${p.sku} - ${p.name} (${p.unit})`);
  }

  /**
   * Match từng item OCR với product trong DB qua tên + SKU.
   */
  private async matchProducts(rawItems: any[]): Promise<OCRItem[]> {
    if (!rawItems.length) return [];

    // Load all active products once
    const allProducts = await this.prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, sku: true, name: true, unit: true },
    });

    return rawItems.map((it: any) => {
      const productName = String(it.productName ?? '').trim();
      const matched = this.fuzzyMatch(productName, allProducts);

      return {
        rawProductName: productName,
        productName: matched?.name ?? productName,
        productId: matched?.id,
        sku: matched?.sku,
        quantity: Number(it.quantity) || 0,
        unit: it.unit ?? matched?.unit ?? 'cái',
        unitPrice: Number(it.unitPrice) || 0,
        expiryDate: it.expiryDate ?? null,
        confidence: matched
          ? Math.max(Number(it.confidence ?? 0.7), 0.85)
          : Number(it.confidence ?? 0.5),
      };
    });
  }

  /**
   * Fuzzy match: ưu tiên exact -> startsWith -> contains -> token overlap.
   */
  private fuzzyMatch(
    query: string,
    products: Array<{ id: string; sku: string; name: string; unit: string }>,
  ): { id: string; sku: string; name: string; unit: string } | null {
    if (!query || query.length < 3) return null;

    const norm = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9 ]/g, '')
        .trim();

    const q = norm(query);
    if (!q) return null;

    // 1. Exact match by SKU or name
    const exact = products.find((p) => norm(p.sku) === q || norm(p.name) === q);
    if (exact) return exact;

    // 2. SKU contains query OR query contains SKU
    const skuMatch = products.find((p) => {
      const ns = norm(p.sku);
      return ns && (q.includes(ns) || ns.includes(q));
    });
    if (skuMatch) return skuMatch;

    // 3. Token overlap (Jaccard-ish)
    const qTokens = new Set(q.split(' ').filter((t) => t.length >= 3));
    if (qTokens.size === 0) return null;

    let bestScore = 0;
    let best: any = null;
    for (const p of products) {
      const pTokens = new Set(
        norm(p.name)
          .split(' ')
          .filter((t) => t.length >= 3),
      );
      const overlap = [...qTokens].filter((t) => pTokens.has(t)).length;
      const score = overlap / Math.max(qTokens.size, pTokens.size);
      if (score > bestScore && score >= 0.4) {
        bestScore = score;
        best = p;
      }
    }
    return best;
  }

  private buildOcrPrompt(rawText: string, productHints: string[]): string {
    const today = new Date().toISOString().slice(0, 10);
    return [
      'Bạn là chuyên gia trích xuất thông tin phiếu nhập hàng cửa hàng tiện lợi Việt Nam.',
      '',
      'TEXT OCR (có thể có lỗi chính tả, ký tự nhiễu):',
      '---',
      rawText,
      '---',
      '',
      `Hôm nay là ${today}. Tham khảo các sản phẩm phổ biến trong cửa hàng:`,
      productHints.slice(0, 30).join('\n'),
      '',
      'YÊU CẦU:',
      '1. Trích xuất thông tin phiếu nhập thành JSON đúng schema bên dưới.',
      '2. Tên sản phẩm (productName): map về tên SP gần đúng nhất trong danh sách trên (nếu có), giữ nguyên nếu không match.',
      '3. Đơn vị (unit): hộp, gói, chai, lon, túi, kg, cái...',
      '4. Giá (unitPrice): số nguyên VND, không kèm chữ "đ" hay dấu chấm.',
      '5. Số lượng (quantity): số nguyên.',
      '6. Hạn sử dụng (expiryDate): "YYYY-MM-DD" hoặc null nếu không có.',
      '7. Confidence: 0.0-1.0 thể hiện độ tin cậy bạn đọc được item đó.',
      '8. Bỏ qua các dòng tổng tiền, VAT, chữ ký...',
      '',
      'JSON OUTPUT:',
      '{',
      '  "supplierName": "Tên nhà cung cấp",',
      '  "importDate": "YYYY-MM-DD",',
      '  "items": [',
      '    {"productName": "...", "quantity": 0, "unit": "...", "unitPrice": 0,',
      '     "expiryDate": null, "confidence": 0.0}',
      '  ]',
      '}',
      'CHỈ TRẢ JSON, KHÔNG GIẢI THÍCH.',
    ].join('\n');
  }

  private mockParse(_imageUrl: string, start: number): OCRParseResult {
    const sample = {
      supplierName: 'Nhà phân phối ABC',
      importDate: new Date().toISOString().slice(0, 10),
      items: [
        {
          productName: 'Sữa TH True Milk 220ml',
          quantity: 50,
          unit: 'hộp',
          unitPrice: 8000,
          expiryDate: '2026-08-20',
          confidence: 0.92,
        },
        {
          productName: 'Mì Hảo Hảo tôm chua cay',
          quantity: 100,
          unit: 'gói',
          unitPrice: 3200,
          expiryDate: '2026-12-10',
          confidence: 0.88,
        },
        {
          productName: 'Cà phê G7 hộp 18 gói',
          quantity: 20,
          unit: 'hộp',
          unitPrice: 35_000,
          expiryDate: '2027-03-15',
          confidence: 0.94,
        },
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
