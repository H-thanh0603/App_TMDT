import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { AuditService } from '@/common/audit/audit.module';

/**
 * Q148: xem audit trail (admin). Tách controller riêng để tránh xung đột
 * với route GET /users/:id (Nest match theo thứ tự khai báo).
 */
@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STORE_ADMIN)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Nhật ký thao tác nhạy cảm' })
  list(@Query() query: any) {
    return this.audit.list({
      targetType: query.targetType,
      actorId: query.actorId,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 50,
    });
  }
}
