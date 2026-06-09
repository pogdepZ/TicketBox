import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStatus, ReservationStatus } from '../../generated/prisma';
import { OrderTransactionHelper } from './order-transaction.helper';

/** Số lượng order xử lý mỗi lần chạy cron */
const BATCH_SIZE = 100;

@Injectable()
export class OrderExpirationJob {
  private readonly logger = new Logger(OrderExpirationJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly txHelper: OrderTransactionHelper,
  ) {}

  /**
   * Quét và expire các order PENDING_PAYMENT đã quá expiresAt.
   * Chạy mỗi 1 phút.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireOrders(): Promise<void> {
    const now = new Date();

    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        expiresAt: { lt: now },
      },
      select: { id: true },
      take: BATCH_SIZE,
      orderBy: { expiresAt: 'asc' },
    });

    if (expiredOrders.length === 0) {
      return;
    }

    this.logger.log(`Expiring ${expiredOrders.length} orders...`);
    let successCount = 0;
    let errorCount = 0;

    for (const { id } of expiredOrders) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await this.txHelper.releaseOrder(
            tx as any,
            id,
            OrderStatus.EXPIRED,
            ReservationStatus.EXPIRED,
          );
        });
        successCount++;
      } catch (error) {
        // Log nhưng không dừng batch – order này sẽ được thử lại lần sau
        this.logger.error(`Failed to expire order ${id}`, error);
        errorCount++;
      }
    }

    this.logger.log(
      `Order expiration complete: ${successCount} expired, ${errorCount} errors`,
    );
  }
}
