import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { AITaskType } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateProviderDto, UpdateProviderDto } from './dto/provider.dto';
import { UpdateTaskConfigDto } from './dto/task-config.dto';
import { UpdateOCRSettingsDto } from './dto/ocr-settings.dto';

@Injectable()
export class AIManagerService {
  constructor(
    private prisma: PrismaService,
    private cfg: ConfigService,
  ) {}

  // ========== Providers ==========

  listProviders() {
    return this.prisma.aIProvider.findMany({
      orderBy: [{ isSystemDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true, name: true, type: true, baseUrl: true,
        defaultModel: true, status: true, isSystemDefault: true,
        apiKeyMasked: true, lastTestedAt: true, lastTestResult: true,
        createdAt: true, updatedAt: true,
      },
    });
  }

  async createProvider(dto: CreateProviderDto) {
    const dup = await this.prisma.aIProvider.findUnique({ where: { name: dto.name } });
    if (dup) throw new ConflictException('Tên provider đã tồn tại');

    const { apiKey, ...rest } = dto;
    return this.prisma.aIProvider.create({
      data: {
        ...rest,
        apiKeyEncrypted: apiKey ? this.encrypt(apiKey) : null,
        apiKeyMasked: apiKey ? this.maskKey(apiKey) : null,
      },
      select: {
        id: true, name: true, type: true, baseUrl: true, defaultModel: true,
        status: true, isSystemDefault: true, apiKeyMasked: true,
      },
    });
  }

  async updateProvider(id: string, dto: UpdateProviderDto) {
    const exists = await this.prisma.aIProvider.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Provider không tồn tại');

    const { apiKey, ...rest } = dto;
    return this.prisma.aIProvider.update({
      where: { id },
      data: {
        ...rest,
        ...(apiKey
          ? { apiKeyEncrypted: this.encrypt(apiKey), apiKeyMasked: this.maskKey(apiKey) }
          : {}),
      },
      select: {
        id: true, name: true, type: true, baseUrl: true, defaultModel: true,
        status: true, isSystemDefault: true, apiKeyMasked: true,
      },
    });
  }

  async deleteProvider(id: string) {
    const exists = await this.prisma.aIProvider.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Provider không tồn tại');
    await this.prisma.aIProvider.delete({ where: { id } });
    return { message: 'Đã xóa provider' };
  }

  async testProvider(id: string) {
    const p = await this.prisma.aIProvider.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Provider không tồn tại');

    const start = Date.now();
    const model = p.defaultModel ?? this.cfg.get<string>('AI_DEFAULT_MODEL', 'deepseek-chat');
    let result: {
      success: boolean;
      latencyMs: number;
      model: string;
      message: string;
      sample?: string;
    };

    try {
      if (p.type === 'MOCK') {
        result = {
          success: true,
          latencyMs: Date.now() - start,
          model: model || 'mock-v1',
          message: 'Mock provider sẵn sàng (không gọi mạng)',
        };
      } else {
        // Resolve API key: DB encrypted → env fallback
        let apiKey: string | undefined;
        if (p.apiKeyEncrypted) {
          try {
            apiKey = this.decrypt(p.apiKeyEncrypted);
          } catch {
            apiKey = undefined;
          }
        }
        if (!apiKey) {
          if (p.type === 'DEEPSEEK' || p.isSystemDefault) {
            apiKey = this.cfg.get<string>('DEEPSEEK_API_KEY') || undefined;
          } else if (p.type === 'OPENAI_COMPATIBLE') {
            apiKey = this.cfg.get<string>('OPENAI_API_KEY') || undefined;
          }
        }
        if (!apiKey) {
          throw new Error('Chưa có API key (DB hoặc env)');
        }

        const baseURL =
          p.baseUrl ||
          (p.type === 'DEEPSEEK'
            ? this.cfg.get<string>('DEEPSEEK_BASE_URL', 'https://api.deepseek.com')
            : this.cfg.get<string>('OPENAI_BASE_URL', 'https://api.openai.com/v1'));

        const axios = (await import('axios')).default;
        const { data } = await axios.post(
          `${baseURL.replace(/\/$/, '')}/chat/completions`,
          {
            model,
            messages: [
              { role: 'system', content: 'Reply with exactly: OK' },
              { role: 'user', content: 'ping' },
            ],
            max_tokens: 8,
            temperature: 0,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 20_000,
          },
        );

        const sample = data?.choices?.[0]?.message?.content?.slice(0, 80) ?? '';
        result = {
          success: true,
          latencyMs: Date.now() - start,
          model: data?.model ?? model,
          message: 'Test connection thành công',
          sample,
        };
      }
    } catch (err: any) {
      result = {
        success: false,
        latencyMs: Date.now() - start,
        model,
        message: err?.response?.data?.error?.message
          || err?.message
          || 'Test connection thất bại',
      };
    }

    await this.prisma.aIProvider.update({
      where: { id },
      data: {
        lastTestedAt: new Date(),
        lastTestResult: result,
        status: result.success ? 'ACTIVE' : 'ERROR',
      },
    });
    return result;
  }

  // ========== Task configs ==========

  listTaskConfigs() {
    return this.prisma.aITaskConfig.findMany({
      include: {
        primaryProvider: { select: { id: true, name: true, type: true } },
        fallbackProvider: { select: { id: true, name: true, type: true } },
      },
    });
  }

  async upsertTaskConfig(dto: UpdateTaskConfigDto) {
    const { taskType, ...rest } = dto;
    return this.prisma.aITaskConfig.upsert({
      where: { taskType },
      create: { taskType, ...rest },
      update: rest,
    });
  }

  // ========== OCR settings ==========

  async getOCRSettings() {
    let settings = await this.prisma.oCRSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.oCRSettings.create({ data: {} });
    }
    return settings;
  }

  async updateOCRSettings(dto: UpdateOCRSettingsDto) {
    const settings = await this.getOCRSettings();
    return this.prisma.oCRSettings.update({
      where: { id: settings.id },
      data: dto,
    });
  }

  // ========== Logs & Stats ==========

  async listLogs(taskType?: AITaskType, limit = 50, page = 1) {
    const where = taskType ? { taskType } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.aILog.findMany({
        where,
        skip: (page - 1) * limit,
        take: Math.min(limit, 200),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aILog.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getOverview() {
    const [providers, taskConfigs, totalLogs, last24h, errors24h] = await Promise.all([
      this.prisma.aIProvider.count(),
      this.prisma.aITaskConfig.count(),
      this.prisma.aILog.count(),
      this.prisma.aILog.count({
        where: { createdAt: { gte: new Date(Date.now() - 86_400_000) } },
      }),
      this.prisma.aILog.count({
        where: {
          status: { in: ['error', 'fallback'] },
          createdAt: { gte: new Date(Date.now() - 86_400_000) },
        },
      }),
    ]);

    const taskBreakdown = await this.prisma.aILog.groupBy({
      by: ['taskType'],
      _count: { _all: true },
      where: { createdAt: { gte: new Date(Date.now() - 86_400_000) } },
    });

    return {
      providers,
      taskConfigs,
      totalLogs,
      last24h,
      errors24h,
      errorRate: last24h > 0 ? Number((errors24h / last24h * 100).toFixed(2)) : 0,
      taskBreakdown: taskBreakdown.map((t) => ({ taskType: t.taskType, count: t._count._all })),
    };
  }

  // ========== Helpers (encryption) ==========

  private encrypt(plaintext: string): string {
    const key = Buffer.from(this.cfg.get<string>('AI_ENCRYPTION_KEY', '0'.repeat(64)), 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  private decrypt(payload: string): string {
    const buf = Buffer.from(payload, 'base64');
    const iv = buf.subarray(0, 12);
    const authTag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const key = Buffer.from(this.cfg.get<string>('AI_ENCRYPTION_KEY', '0'.repeat(64)), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  private maskKey(key: string): string {
    if (key.length <= 8) return '***';
    return `${key.slice(0, 4)}***${key.slice(-4)}`;
  }
}
