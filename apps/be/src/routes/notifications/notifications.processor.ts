import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Logger } from '@nestjs/common';

@Processor('notification')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    this.logger.log(`Processing notification job: ${job.name} (ID: ${job.id})`);

    if (job.name === 'send-single') {
      const { notificationId } = job.data;
      try {
        await this.prisma.notification.update({
          where: { id: notificationId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });
        this.logger.log(`Notification ${notificationId} marked as SENT`);
        return { success: true, notificationId };
      } catch (error) {
        this.logger.error(`Failed to send notification ${notificationId}`, error);
        try {
          await this.prisma.notification.update({
            where: { id: notificationId },
            data: {
              status: 'FAILED',
              errorMessage: error instanceof Error ? error.message : String(error),
            },
          });
        } catch (dbError) {
          this.logger.error(`Failed to update FAILED status for notification ${notificationId}`, dbError);
        }
        throw error;
      }
    } else if (job.name === 'send-bulk') {
      const { concertId } = job.data;
      try {
        // Look up tickets/users for the concert to send bulk reminders
        const tickets = await this.prisma.ticket.findMany({
          where: {
            concertId,
            status: 'ACTIVE',
          },
          select: {
            ownerUserId: true,
          },
        });

        // Unique user IDs
        const userIds = Array.from(new Set(tickets.map((t) => t.ownerUserId)));
        this.logger.log(`Sending bulk reminders for concert ${concertId} to ${userIds.length} users`);

        let sentCount = 0;
        for (const userId of userIds) {
          await this.prisma.notification.create({
            data: {
              userId,
              channel: 'EMAIL',
              template: 'CONCERT_REMINDER',
              payload: { concertId },
              status: 'SENT',
              sentAt: new Date(),
            },
          });
          sentCount++;
        }

        this.logger.log(`Bulk reminder for concert ${concertId} completed. Sent: ${sentCount}`);
        return { success: true, sentCount };
      } catch (error) {
        this.logger.error(`Failed to process bulk reminder for concert ${concertId}`, error);
        throw error;
      }
    }
  }
}
