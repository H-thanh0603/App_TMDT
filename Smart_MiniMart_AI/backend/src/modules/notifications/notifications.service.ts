import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async listMine(userId: string, query: { isRead?: string; limit?: number }) {
    const where: any = { userId };
    if (query.isRead === 'true') where.isRead = true;
    if (query.isRead === 'false') where.isRead = false;
    const items = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(query.limit ?? 50, 200),
    });
    const unread = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { items, unread };
  }

  async markRead(userId: string, id: string) {
    const notif = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notif) throw new NotFoundException('Không tìm thấy thông báo');
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    const r = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { updated: r.count };
  }

  async delete(userId: string, id: string) {
    const notif = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notif) throw new NotFoundException();
    await this.prisma.notification.delete({ where: { id } });
    return { ok: true };
  }

  // ========== Admin broadcast ==========

  async broadcast(senderId: string, dto: BroadcastNotificationDto) {
    let userIds: string[] = [];

    if (dto.targetUserIds?.length) {
      userIds = dto.targetUserIds;
    } else if (dto.targetRoles?.length) {
      const users = await this.prisma.user.findMany({
        where: { role: { in: dto.targetRoles }, status: 'ACTIVE' },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    } else {
      const users = await this.prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    }

    if (!userIds.length) return { sent: 0 };

    const data = userIds.map((uid) => ({
      userId: uid,
      title: dto.title,
      body: dto.body,
      type: dto.type ?? 'SYSTEM',
      data: { senderId },
    }));

    const r = await this.prisma.notification.createMany({ data });
    return { sent: r.count };
  }

  // Helper: gọi từ services khác (ví dụ orders, promotions) để push notif
  async push(userId: string, title: string, body: string, type = 'SYSTEM', data?: any) {
    return this.prisma.notification.create({
      data: { userId, title, body, type, data },
    });
  }
}
