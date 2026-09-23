import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { level: 'warn', emit: 'stdout' },
        { level: 'error', emit: 'stdout' },
      ],
    });
  }

  async onModuleInit() {
    // Q144: readiness tách khỏi boot — /health/ready trả 503 khi DB chết,
    // app vẫn boot để orchestrator + health check hoạt động (không crash boot vì DB sleep).
    try {
      await this.$connect();
      this.logger.log('Prisma connected to database');
    } catch (err) {
      this.logger.error(
        `Prisma connect lúc boot thất bại — /health/ready sẽ 503 tới khi DB sống: ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase() chỉ dùng trong dev/test');
    }
    const tables = await this.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
      AND tablename NOT LIKE '_prisma%'
    `;
    for (const { tablename } of tables) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }
  }
}
