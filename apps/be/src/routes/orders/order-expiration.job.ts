import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { OrderStatus, ReservationStatus } from '../../generated/prisma';
import { OrderTransactionHelper, ReleaseResult } from './order-transaction.helper';
import { PAYMENT_PROCESSING_GRACE_SECONDS } from './order-expiration.constants';

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
    const paymentProcessingCutoff = new Date(
      now.getTime() - PAYMENT_PROCESSING_GRACE_SECONDS * 1000,
    );

    const expiredPendingOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        expiresAt: { lt: now },
      },
      select: { id: true },
      take: BATCH_SIZE,
      orderBy: { expiresAt: 'asc' },
    });
    const remainingBatchSize = BATCH_SIZE - expiredPendingOrders.length;

    const expiredProcessingOrders =
      remainingBatchSize > 0
        ? await this.prisma.order.findMany({
            where: {
              status: OrderStatus.PAYMENT_PROCESSING,
              OR: [
                { paymentGraceUntil: { lt: now } },
                {
                  paymentGraceUntil: null,
                  expiresAt: { lt: paymentProcessingCutoff },
                },
              ],
            },
            select: { id: true },
            take: remainingBatchSize,
            orderBy: { expiresAt: 'asc' },
          })
        : [];

    const expiredOrders = [...expiredPendingOrders, ...expiredProcessingOrders];

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
   * Cleanup reservation_seats HELD đã quá expiresAt sau khi order đã release.
   * Order release là nơi hoàn inventory/quota; cron này không được mở ghế
   * trước khi order tương ứng được release.
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
        reservation: {
          select: {
            order: {
              select: {
                id: true,
                status: true,
                releasedAt: true,
              },
            },
          },
        },
      },
      take: BATCH_SIZE,
    });

    const seatsToExpire = expiredSeats.filter((seat) => {
      const order = seat.reservation.order;
      if (!order) {
        return true;
      }

      if (order.releasedAt) {
        return true;
      }

      const releasedStatuses: OrderStatus[] = [
        OrderStatus.PAYMENT_FAILED,
        OrderStatus.EXPIRED,
        OrderStatus.CANCELLED,
        OrderStatus.REFUND_REQUIRED,
      ];

      return releasedStatuses.includes(order.status);
    });

    if (seatsToExpire.length === 0) {
      return;
    }

    this.logger.log(`Expiring ${seatsToExpire.length} reservation seats...`);

    const expiredSeatIds = seatsToExpire
      .filter((seat) => seat.reservation.order?.status === OrderStatus.EXPIRED)
      .map((s) => s.id);
    const releasedSeatIds = seatsToExpire
      .filter((seat) => seat.reservation.order?.status !== OrderStatus.EXPIRED)
      .map((s) => s.id);

    if (expiredSeatIds.length > 0) {
      await this.prisma.reservationSeat.updateMany({
        where: {
          id: { in: expiredSeatIds },
        },
        data: {
          status: 'EXPIRED',
        },
      });
    }

    if (releasedSeatIds.length > 0) {
      await this.prisma.reservationSeat.updateMany({
        where: {
          id: { in: releasedSeatIds },
        },
        data: {
          status: 'RELEASED',
        },
      });
    }

    // Clean up Redis keys
    for (const seat of seatsToExpire) {
      const key = `hold:seat:${seat.concertId}:${seat.seatNumber}`;
      try {
        await this.redis.del(key);
      } catch (err) {
        this.logger.warn(`Failed to delete Redis key on seat expiration: ${(err as any).message}`);
      }
    }
  }
}
