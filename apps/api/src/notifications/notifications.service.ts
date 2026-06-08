import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  /**
   * Send a single notification
   * @param userId Target user ID
   * @param type Notification type (e.g., 'ticket_confirmation', 'reminder')
   * @param channel Notification channel (e.g., 'email', 'push', 'sms')
   * @param payload Notification data payload
   */
  async sendNotification(
    userId: string,
    type: string,
    channel: string,
    payload: Record<string, unknown>,
  ): Promise<{ notificationId: string; status: string }> {
    // TODO: Week 2+ — Implement real notification via BullMQ job
    console.log(`[NotificationsService] sendNotification to ${userId} via ${channel}`);
    return {
      notificationId: `notif-${Date.now()}`,
      status: 'QUEUED',
    };
  }

  /**
   * Send bulk reminder notifications (e.g., 24h before concert)
   * @param concertId Concert ID to send reminders for
   */
  async sendBulkReminder(
    concertId: string,
  ): Promise<{ totalSent: number; status: string }> {
    // TODO: Week 2+ — Implement real bulk reminder via BullMQ
    console.log(`[NotificationsService] sendBulkReminder for concert ${concertId}`);
    return {
      totalSent: 0,
      status: 'QUEUED',
    };
  }
}
