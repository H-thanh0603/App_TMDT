import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notif: NotificationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Danh sách thông báo của tôi' })
  myList(@CurrentUser('sub') userId: string, @Query() query: any) {
    return this.notif.listMine(userId, {
      isRead: query.isRead,
      limit: query.limit ? Number(query.limit) : 50,
    });
  }

  @Post('me/:id/read')
  markRead(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.notif.markRead(userId, id);
  }

  @Post('me/read-all')
  markAllRead(@CurrentUser('sub') userId: string) {
    return this.notif.markAllRead(userId);
  }

  @Delete('me/:id')
  deleteMine(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.notif.delete(userId, id);
  }

  @Post('broadcast')
  @UseGuards(RolesGuard)
  @Roles(Role.STORE_ADMIN, Role.AI_MANAGER)
  @ApiOperation({ summary: '[Admin] Gửi thông báo broadcast tới nhân viên/khách' })
  broadcast(@CurrentUser('sub') userId: string, @Body() dto: BroadcastNotificationDto) {
    return this.notif.broadcast(userId, dto);
  }
}
