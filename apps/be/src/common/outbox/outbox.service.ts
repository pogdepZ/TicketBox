import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notification') private readonly notificationQueue: Queue,
    @InjectQueue('ai') private readonly aiQueue: Queue,
    @InjectQueue('csv') private readonly csvQueue: Queue,
  ) {}

  private getQueue(queueName: string): Queue {
    switch (queueName) {
      case 'notification':
        return this.notificationQueue;
      case 'ai':
        return this.aiQueue;
      case 'csv':
        return this.csvQueue;
      default:
        throw new Error(`Unknown queue name: ${queueName}`);
    }
  }

  /**
   * Puts a job into the outbox.
   * If tx is provided, it writes to the outbox inside the transaction and defers queueing to the cron job (to prevent phantom messages if the transaction rolls back).
   * If tx is NOT provided, it tries to queue immediately.
   */
  async put(
    queueName: string,
    jobName: string,
    payload: any,
    tx?: any,
  ): Promise<{ outboxMessage: any; job?: Job }> {
    const prisma = tx || this.prisma;

    // 1. Create outbox record in DB
    const outboxMessage = await prisma.outboxMessage.create({
      data: {
        queueName,
        jobName,
        payload: payload as any,
        status: 'PENDING',
      },
    });

    // 2. If tx is active, do NOT queue immediately. Let the cron job handle it after commit.
    if (tx) {
      this.logger.log(
        `Outbox message ${outboxMessage.id} written inside transaction. Queueing deferred to cron.`,
      );
      return { outboxMessage };
    }

    // 3. Otherwise, try to queue immediately
    try {
      const queue = this.getQueue(queueName);
      const job = await queue.add(jobName, payload);

      await this.prisma.outboxMessage.update({
        where: { id: outboxMessage.id },
        data: { status: 'COMPLETED' },
      });

      this.logger.log(
        `Successfully queued outbox message ${outboxMessage.id} to queue ${queueName} immediately.`,
      );
      return { outboxMessage, job };
    } catch (error) {
      this.logger.warn(
        `Failed to immediately queue outbox message ${outboxMessage.id} to queue ${queueName} (Redis might be down). Will retry via cron. Error: ${error instanceof Error ? error.message : String(error)}`,
      );

      await this.prisma.outboxMessage.update({
        where: { id: outboxMessage.id },
        data: {
          error: error instanceof Error ? error.message : String(error),
        },
      });

      return { outboxMessage };
    }
  }


  /**
   * Cron job that runs periodically to process pending outbox messages.
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async processPendingMessages() {
    // Find messages that are PENDING and retry count less than 5
    const pendingMessages = await this.prisma.outboxMessage.findMany({
      where: {
        status: 'PENDING',
        retryCount: { lt: 5 },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    if (pendingMessages.length === 0) {
      return;
    }

    this.logger.log(`Processing ${pendingMessages.length} pending outbox messages...`);

    for (const msg of pendingMessages) {
      try {
        const queue = this.getQueue(msg.queueName);
        await queue.add(msg.jobName, msg.payload as any);

        await this.prisma.outboxMessage.update({
          where: { id: msg.id },
          data: {
            status: 'COMPLETED',
            error: null,
          },
        });

        this.logger.log(`Successfully processed outbox message ${msg.id} to queue ${msg.queueName}`);
      } catch (error) {
        const nextRetryCount = msg.retryCount + 1;
        const status = nextRetryCount >= 5 ? 'FAILED' : 'PENDING';

        await this.prisma.outboxMessage.update({
          where: { id: msg.id },
          data: {
            retryCount: nextRetryCount,
            status,
            error: error instanceof Error ? error.message : String(error),
          },
        });

        this.logger.error(
          `Failed to process outbox message ${msg.id} to queue ${msg.queueName}. Retry count: ${nextRetryCount}. Error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
