import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OutboxService } from '../../common/outbox/outbox.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private readonly outboxService: OutboxService,
  ) {}

  async sendNotification(
    userId: string,
    type: string,
    channel: string,
    payload: Record<string, unknown>,
  ): Promise<{ notificationId: string; status: string }> {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        channel: channel === 'EMAIL' || channel === 'PUSH' || channel === 'SMS' || channel === 'ZALO' ? channel : 'EMAIL',
        template: type,
        payload: payload as any,
        status: 'PENDING',
      },
    });

    await this.outboxService.put('notification', 'send-single', {
      notificationId: notification.id,
    });

    return {
      notificationId: notification.id,
      status: 'SENT',
    };
  }

  async sendBulkReminder(
    concertId: string,
  ): Promise<{ totalSent: number; status: string }> {
    await this.outboxService.put('notification', 'send-bulk', {
      concertId,
    });

    return {
      totalSent: 0,
      status: 'QUEUED',
    };
  }

  // --- In-App Notifications API Methods ---

  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly CACHE_TTL = 15000; // 15 seconds in milliseconds

  private invalidateCache(userId: string) {
    this.cache.delete(userId);
  }

  async getInAppNotifications(userId: string) {
    const cached = this.cache.get(userId);
    const now = Date.now();
    if (cached && cached.expiry > now) {
      return cached.data;
    }

    const items = await this.prisma.inAppNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const unreadCount = items.filter((n: any) => !n.read).length;
    const result = { items, unreadCount };

    this.cache.set(userId, {
      data: result,
      expiry: now + this.CACHE_TTL,
    });

    return result;
  }

  async markInAppNotificationAsRead(id: string, userId: string) {
    this.invalidateCache(userId);
    await this.prisma.inAppNotification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    return { success: true };
  }

  async markAllInAppNotificationsAsRead(userId: string) {
    this.invalidateCache(userId);
    await this.prisma.inAppNotification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }

  async createInAppNotification(userId: string, title: string, message: string) {
    this.invalidateCache(userId);
    return this.prisma.inAppNotification.create({
      data: {
        userId,
        title,
        message,
        read: false,
      },
    });
  }
}

