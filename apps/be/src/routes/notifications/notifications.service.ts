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

  async getInAppNotifications(userId: string) {
    const items = await this.prisma.inAppNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const unreadCount = items.filter((n: any) => !n.read).length;
    return { items, unreadCount };
  }

  async markInAppNotificationAsRead(id: string, userId: string) {
    await this.prisma.inAppNotification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    return { success: true };
  }

  async markAllInAppNotificationsAsRead(userId: string) {
    await this.prisma.inAppNotification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }

  async createInAppNotification(userId: string, title: string, message: string) {
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

