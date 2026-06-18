import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrismaClient, TicketStatus } from '../../generated/prisma';
import { randomBytes } from 'crypto';
import { sign } from 'jsonwebtoken';
import { AuthUser } from '../auth/dto/user-response.dto';

export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface OrderItemWithType {
  ticketTypeId: string;
  quantity: number;
  ticketType: { name: string };
}

export interface IssuedTicket {
  ticketId: string;
  ticketCode: string;
  ticketTypeName: string;
  qrPayload: string;
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Sinh ticket cho từng item trong order sau khi payment SUCCESS.
   * Phải được gọi trong Prisma $transaction.
   *
   * Mỗi item có quantity N → sinh N ticket riêng biệt.
   * ticketCode: TB-{6 chữ hoa ngẫu nhiên}-{6 hex ngẫu nhiên}
   * qrPayload:  JWT signed với JWT_TICKET_SECRET, exp 7 ngày
   */
  async issueTickets(
    tx: TransactionClient,
    order: {
      id: string;
      userId: string;
      concertId: string;
    },
    items: OrderItemWithType[],
  ): Promise<IssuedTicket[]> {
    // Check if tickets already exist for this order to ensure idempotency
    const existingTickets = await tx.ticket.findMany({
      where: { orderId: order.id },
      include: { ticketType: { select: { name: true } } },
    });

    if (existingTickets.length > 0) {
      this.logger.warn(`Tickets already issued for order ${order.id}. Returning existing tickets.`);
      return existingTickets.map((t) => ({
        ticketId: t.id,
        ticketCode: t.ticketCode,
        ticketTypeName: t.ticketType.name,
        qrPayload: t.qrPayload,
      }));
    }

    // Read the reservationId from Order
    const orderRecord = await tx.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { reservationId: true },
    });

    // Query reservation seats
    const reservationSeats = await tx.reservationSeat.findMany({
      where: { reservationId: orderRecord.reservationId },
      include: { ticketType: { select: { name: true } } },
    });

    const issued: IssuedTicket[] = [];
    const ticketSecret = this.config.get<string>(
      'JWT_TICKET_SECRET',
      'ticket-secret',
    );

    // If reservationSeats exists, use seat-based flow
    if (reservationSeats.length > 0) {
      for (const seat of reservationSeats) {
        const ticketCode = this.generateTicketCode();

        let ticket;
        try {
          ticket = await tx.ticket.create({
            data: {
              orderId: order.id,
              ticketTypeId: seat.ticketTypeId,
              ownerUserId: order.userId,
              concertId: order.concertId,
              ticketCode,
              qrPayload: '', // placeholder, will update
              status: TicketStatus.ACTIVE,
              seatNumber: seat.seatNumber,
            },
          });
        } catch (err) {
          // Check for Prisma unique constraint violation (P2002)
          if ((err as any).code === 'P2002') {
            throw new ConflictException({
              message: `Seat ${seat.seatNumber} has already been sold for this concert`,
              seatNumber: seat.seatNumber,
            });
          }
          throw err;
        }

        const qrPayload = sign(
          {
            ticket_id: ticket.id,
            ticket_code: ticketCode,
            concert_id: order.concertId,
            ticket_type_id: seat.ticketTypeId,
          },
          ticketSecret,
          { expiresIn: '7d' },
        );

        await tx.ticket.update({
          where: { id: ticket.id },
          data: { qrPayload },
        });

        issued.push({
          ticketId: ticket.id,
          ticketCode,
          ticketTypeName: seat.ticketType.name,
          qrPayload,
        });
      }

      // Update reservation seats to CONFIRMED
      await tx.reservationSeat.updateMany({
        where: { reservationId: orderRecord.reservationId },
        data: { status: 'CONFIRMED' },
      });
    } else {
      // Fallback old flow (no seat selection)
      this.logger.log(`No reservation seats found for order ${order.id}. Falling back to default ticket issuance.`);
      for (const item of items) {
        for (let i = 0; i < item.quantity; i++) {
          const ticketCode = this.generateTicketCode();

          const ticket = await tx.ticket.create({
            data: {
              orderId: order.id,
              ticketTypeId: item.ticketTypeId,
              ownerUserId: order.userId,
              concertId: order.concertId,
              ticketCode,
              qrPayload: '',
              status: TicketStatus.ACTIVE,
              seatNumber: null,
            },
          });

          const qrPayload = sign(
            {
              ticket_id: ticket.id,
              ticket_code: ticketCode,
              concert_id: order.concertId,
              ticket_type_id: item.ticketTypeId,
            },
            ticketSecret,
            { expiresIn: '7d' },
          );

          await tx.ticket.update({
            where: { id: ticket.id },
            data: { qrPayload },
          });

          issued.push({
            ticketId: ticket.id,
            ticketCode,
            ticketTypeName: item.ticketType.name,
            qrPayload,
          });
        }
      }
    }

    this.logger.log(
      `Issued ${issued.length} tickets for order ${order.id}`,
    );

    return issued;
  }

  /**
   * Format: TB-AAAAAA-XXXXXX
   * Phần đầu: 6 chữ cái in hoa ngẫu nhiên
   * Phần sau: 6 ký tự hex ngẫu nhiên
   */
  private generateTicketCode(): string {
    const alpha = Array.from({ length: 6 }, () =>
      String.fromCharCode(65 + Math.floor(Math.random() * 26)),
    ).join('');
    const hex = randomBytes(3).toString('hex').toUpperCase();
    return `TB-${alpha}-${hex}`;
  }

  /**
   * Lấy danh sách ticket của một order (dành cho payment status hoặc detail).
   */
  async getTicketsByOrderId(orderId: string) {
    return this.prisma.ticket.findMany({
      where: { orderId },
      include: {
        ticketType: { select: { name: true } },
      },
    });
  }

  /**
   * Lấy danh sách ticket cho một order dựa theo phân quyền người yêu cầu.
   * Customer chỉ xem được ticket của chính mình.
   * Admin xem được tất cả ticket.
   */
  async getTicketsForOrder(orderId: string, requestingUser: AuthUser) {
    const isAdmin = requestingUser.roles.some((r) => r.name === 'admin');
    return this.prisma.ticket.findMany({
      where: {
        orderId,
        ...(!isAdmin ? { ownerUserId: requestingUser.id } : {}),
      },
      include: {
        ticketType: { select: { name: true } },
      },
    });
  }

  buildMockTicketPreview(orderId: string) {
    return {
      success: true,
      data: {
        orderId,
        status: 'MOCK_ONLY',
        note: 'Tickets will be generated after payment success in week 2.',
      },
      message: 'Mock ticket preview created',
    };
  }
}
