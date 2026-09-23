import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { PrismaService } from '@/common/prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  /** Liveness: process còn sống (cho orchestrator restart khi chết). */
  @Public()
  @Get('live')
  live() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  /** Readiness: sẵn sàng nhận traffic (DB phải OK). Render healthCheck trỏ đây. */
  @Public()
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', db: 'ok', timestamp: new Date().toISOString() };
    } catch {
      // 503 để Render/K8s ngừng route traffic tới instance hỏng.
      throw new ServiceUnavailableException({ status: 'not-ready', db: 'error' });
    }
  }

  @Public()
  @Get()
  async check() {
    // Q58: tối giản — không lộ version/uptime/db-detail ra public.
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException({ status: 'degraded' });
    }
  }
}
