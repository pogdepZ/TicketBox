import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async sendNotification(
    userId: string,
    type: string,
    channel: string,
    payload: Record<string, unknown>,
  ): Promise<{ notificationId: string; status: string }> {
    console.log(
      `[NotificationsService] sendNotification to ${userId} via ${channel}`,
      { type, payload },
    );

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        channel: channel === 'EMAIL' || channel === 'PUSH' || channel === 'SMS' || channel === 'ZALO' ? channel : 'EMAIL',
        template: type,
        payload: payload as any,
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    return {
      notificationId: notification.id,
      status: 'SENT',
    };
  }

  async sendBulkReminder(
    concertId: string,
  ): Promise<{ totalSent: number; status: string }> {
    console.log(`[NotificationsService] sendBulkReminder for concert ${concertId}`);

    return {
      totalSent: 0,
      status: 'QUEUED',
    };
  }
}
