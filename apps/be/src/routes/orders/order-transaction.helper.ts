import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { OrderStatus, PrismaClient, ReservationStatus } from '../../generated/prisma';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface ReleaseResult {
  orderId: string;
  releasedItems: { ticketTypeId: string; quantity: number }[];
  skipped: boolean;
  previousStatus?: OrderStatus;
  releasedSeats?: { concertId: string; seatNumber: string }[];
}

@Injectable()
export class OrderTransactionHelper {
  private readonly logger = new Logger(OrderTransactionHelper.name);
  async releaseOrder(
    tx: TransactionClient,
    orderId: string,
    orderStatus: OrderStatus,
    reservationStatus: ReservationStatus,
  ): Promise<ReleaseResult> {
    // Lock order first so cancel/expire/payment-fail cannot release the same
    // inventory concurrently.
    await tx.$executeRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;

    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });

    const releasableStatuses: OrderStatus[] = [
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.PAYMENT_PROCESSING,
    ];

    if (!releasableStatuses.includes(order.status)) {
      const alreadyReleasedStatuses: OrderStatus[] = [
        OrderStatus.PAYMENT_FAILED,
        OrderStatus.EXPIRED,
        OrderStatus.CANCELLED,
      ];

      if (alreadyReleasedStatuses.includes(order.status)) {
        this.logger.warn(
          `Skip releasing order ${orderId}; already ${order.status}`,
        );
        return {
          orderId,
          releasedItems: [],
          skipped: true,
          previousStatus: order.status,
        };
      }

      throw new ConflictException({
        message: `Cannot release order with status ${order.status}`,
        currentStatus: order.status,
      });
    }

    // Cập nhật Order status
    await tx.order.update({
      where: { id: orderId },
      data: { status: orderStatus },
    });

    // Cập nhật Reservation status
    await tx.reservation.update({
      where: { id: order.reservationId },
      data: { status: reservationStatus },
    });

    // Cập nhật ReservationSeat status
    const seats = await tx.reservationSeat.findMany({
      where: { reservationId: order.reservationId },
      select: { concertId: true, seatNumber: true },
    });

    await tx.reservationSeat.updateMany({
      where: { reservationId: order.reservationId },
      data: {
        status: reservationStatus === ReservationStatus.EXPIRED ? 'EXPIRED' : 'RELEASED',
      },
    });

    const releasedItems: { ticketTypeId: string; quantity: number }[] = [];

    for (const item of order.items) {
      // Trả lại tồn kho
      await tx.$executeRaw`UPDATE ticket_types SET remaining = remaining + ${item.quantity} WHERE id = ${item.ticketTypeId}::uuid`;

      // Giảm heldQuantity (không xuống dưới 0)
      await tx.$executeRaw`UPDATE user_ticket_quotas
         SET held_quantity = GREATEST(0, held_quantity - ${item.quantity}), updated_at = NOW()
         WHERE user_id = ${order.userId}::uuid AND ticket_type_id = ${item.ticketTypeId}::uuid`;

      releasedItems.push({
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
      });
    }

    this.logger.log(
      `Released order ${orderId} → status=${orderStatus}, items=${JSON.stringify(releasedItems)}, seats=${JSON.stringify(seats)}`,
    );

    return { orderId, releasedItems, skipped: false, releasedSeats: seats };
  }
}
