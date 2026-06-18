import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { OrderStatus, ReservationStatus } from '../../generated/prisma';
import { OrderTransactionHelper, ReleaseResult } from './order-transaction.helper';

/** Số lượng order xử lý mỗi lần chạy cron */
const BATCH_SIZE = 100;

@Injectable()
export class OrderExpirationJob {
  private readonly logger = new Logger(OrderExpirationJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly txHelper: OrderTransactionHelper,
    private readonly redis: RedisService,
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
        status: { in: [OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_PROCESSING] },
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
        let result: ReleaseResult | undefined;
        await this.prisma.$transaction(async (tx) => {
          result = await this.txHelper.releaseOrder(
            tx as any,
            id,
            OrderStatus.EXPIRED,
            ReservationStatus.EXPIRED,
          );
        });

        // Clean up Redis keys for released seats
        if (result && result.releasedSeats) {
          for (const seat of result.releasedSeats) {
            const key = `hold:seat:${seat.concertId}:${seat.seatNumber}`;
            try {
              await this.redis.del(key);
            } catch (err) {
              this.logger.warn(`Failed to delete Redis key on order expiration: ${(err as any).message}`);
            }
          }
        }

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

  /**
   * Quét và expire các reservation_seats HELD đã quá expiresAt.
   * Chạy mỗi 1 phút.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireReservationSeats(): Promise<void> {
    const now = new Date();

    const expiredSeats = await this.prisma.reservationSeat.findMany({
      where: {
        status: 'HELD',
        expiresAt: { lte: now },
      },
      select: {
        id: true,
        concertId: true,
        seatNumber: true,
      },
      take: BATCH_SIZE,
    });

    if (expiredSeats.length === 0) {
      return;
    }

    this.logger.log(`Expiring ${expiredSeats.length} reservation seats...`);

    await this.prisma.reservationSeat.updateMany({
      where: {
        id: { in: expiredSeats.map((s) => s.id) },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    // Clean up Redis keys
    for (const seat of expiredSeats) {
      const key = `hold:seat:${seat.concertId}:${seat.seatNumber}`;
      try {
        await this.redis.del(key);
      } catch (err) {
        this.logger.warn(`Failed to delete Redis key on seat expiration: ${(err as any).message}`);
      }
    }
  }
}
