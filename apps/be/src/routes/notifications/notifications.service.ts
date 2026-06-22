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
}

