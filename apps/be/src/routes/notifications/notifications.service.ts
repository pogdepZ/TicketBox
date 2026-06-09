import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
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

    return {
      notificationId: `notif-${Date.now()}`,
      status: 'QUEUED',
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
