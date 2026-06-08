export declare class NotificationsService {
    sendNotification(userId: string, type: string, channel: string, payload: Record<string, unknown>): Promise<{
        notificationId: string;
        status: string;
    }>;
    sendBulkReminder(concertId: string): Promise<{
        totalSent: number;
        status: string;
    }>;
}
