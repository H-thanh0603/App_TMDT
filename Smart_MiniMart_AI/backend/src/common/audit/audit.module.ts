import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

/** Bản ghi audit — mọi field đều optional trừ action/targetType. */
export interface AuditRecordInput {
  actorId?: string;
  actorRole?: string;
  action: string;
  targetType: string;
  targetId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}

/** Field không bao giờ được lưu vào before/after (Q148 + Q64). */
const SENSITIVE_KEYS = /pass|token|secret|hash|api_?key|authorization|otp|mfa/i;

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function scrub(value: Json): Json {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(scrub);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([k]) => !SENSITIVE_KEYS.test(k))
      .map(([k, v]) => [k, scrub(v)]),
  );
}

/**
 * Q148: ghi audit trail cho thao tác nhạy cảm. Fire-and-forget — không bao giờ throw để
 * một lỗi audit không được phép làm hỏng hay rollback nghiệp vụ (đơn hàng, thanh toán).
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditRecordInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: input.actorId ?? null,
          actorRole: input.actorRole ?? null,
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId ?? null,
          before: input.before === undefined ? undefined : (scrub(input.before as Json) as never),
          after: input.after === undefined ? undefined : (scrub(input.after as Json) as never),
          ip: input.ip ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Ghi audit thất bại (${input.action} ${input.targetType}) — bỏ qua: ${String(err)}`,
      );
    }
  }

  list(query: { targetType?: string; actorId?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? 50), 100);
    const where: Record<string, unknown> = {};
    if (query.targetType) where.targetType = query.targetType;
    if (query.actorId) where.actorId = query.actorId;
    return this.prisma
      .$transaction([
        this.prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.auditLog.count({ where }),
      ])
      .then(([items, total]) => ({
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }));
  }
}

@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
