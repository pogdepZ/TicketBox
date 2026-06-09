import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus, PrismaClient, ReservationStatus } from '../../generated/prisma';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface ReleaseResult {
  orderId: string;
  releasedItems: { ticketTypeId: string; quantity: number }[];
}

@Injectable()
export class OrderTransactionHelper {
  private readonly logger = new Logger(OrderTransactionHelper.name);

  /**
   * Trả vé và hoàn quota khi order bị cancel, expire, hoặc payment fail.
   * Phải được gọi trong một Prisma $transaction.
   *
   * Thực hiện atomically:
   * 1. Cập nhật Order.status
   * 2. Cập nhật Reservation.status
   * 3. Tăng TicketType.remaining theo từng item
   * 4. Giảm UserTicketQuota.heldQuantity theo từng item
   */
  async releaseOrder(
    tx: TransactionClient,
    orderId: string,
    orderStatus: OrderStatus,
    reservationStatus: ReservationStatus,
  ): Promise<ReleaseResult> {
    // Lấy order và items
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });

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

    const releasedItems: { ticketTypeId: string; quantity: number }[] = [];

    for (const item of order.items) {
      // Trả lại tồn kho
      await tx.$executeRawUnsafe(
        `UPDATE ticket_types SET remaining = remaining + $1 WHERE id = $2::uuid`,
        item.quantity,
        item.ticketTypeId,
      );

      // Giảm heldQuantity (không xuống dưới 0)
      await tx.$executeRawUnsafe(
        `UPDATE user_ticket_quotas
         SET held_quantity = GREATEST(0, held_quantity - $1), updated_at = NOW()
         WHERE user_id = $2::uuid AND ticket_type_id = $3::uuid`,
        item.quantity,
        order.userId,
        item.ticketTypeId,
      );

      releasedItems.push({
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
      });
    }

    this.logger.log(
      `Released order ${orderId} → status=${orderStatus}, items=${JSON.stringify(releasedItems)}`,
    );

    return { orderId, releasedItems };
  }
}
