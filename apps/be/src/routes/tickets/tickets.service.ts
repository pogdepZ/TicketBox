import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/prisma/prisma.service";
import { PrismaClient, Prisma, TicketStatus } from "../../generated/prisma";
import { randomBytes, randomUUID } from "crypto";
import { sign, verify } from "jsonwebtoken";
import { AuthUser } from "../auth/dto/user-response.dto";

export type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
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

const TICKET_CODE_RETRY_LIMIT = 5;

export interface TicketViewDto {
  ticketId: string;
  ticketCode: string;
  qrPayload: string;
  ticketTypeId: string;
  ticketTypeName: string;
  ownerUserId: string;
  orderId: string;
  concertId: string;
  status: TicketStatus;
  seatNumber: string | null;
  scannedAt: string | null;
}

export interface TicketVerificationResultDto {
  valid: boolean;
  ticket: TicketViewDto | null;
  reason?: string;
}

type TicketRow = {
  id: string;
  orderId: string;
  ticketTypeId: string;
  ownerUserId: string;
  ticketCode: string;
  qrPayload: string;
  seatNumber: string | null;
  status: TicketStatus;
  scannedAt: Date | null;
  ticketType: { name: string };
  order?: { id: string; userId: string; concertId: string };
};

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
    const issued: IssuedTicket[] = [];
    const ticketSecret = this.config.get<string>(
      "JWT_TICKET_SECRET",
      "ticket-secret",
    );

    const concert = await this.prisma.concert.findUnique({
      where: { id: order.concertId },
      select: { id: true, eventDate: true },
    });

    if (!concert) {
      throw new NotFoundException("Concert not found");
    }

    const qrExpiresAt = this.getTicketQrExpiresAt(concert.eventDate);

    // Mỗi item phải sinh đúng số ticket thực tế theo quantity.
    for (const item of items) {
      const createdTickets = await Promise.all(
        Array.from({ length: item.quantity }, () =>
          this.createIssuedTicket(tx, order, item, ticketSecret, qrExpiresAt),
        ),
      );

      issued.push(...createdTickets);
    }

    this.logger.log(`Issued ${issued.length} tickets for order ${order.id}`);

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
    ).join("");
    const hex = randomBytes(3).toString("hex").toUpperCase();
    return `TB-${alpha}-${hex}`;
  }

  private async createIssuedTicket(
    tx: TransactionClient,
    order: {
      id: string;
      userId: string;
      concertId: string;
    },
    item: OrderItemWithType,
    ticketSecret: string,
    qrExpiresAt: Date,
  ): Promise<IssuedTicket> {
    for (let attempt = 1; attempt <= TICKET_CODE_RETRY_LIMIT; attempt++) {
      const ticketId = randomUUID();
      const ticketCode = this.generateTicketCode();

      const qrPayload = sign(
        {
          ticket_id: ticketId,
          ticket_code: ticketCode,
          concert_id: order.concertId,
          ticket_type_id: item.ticketTypeId,
        },
        ticketSecret,
        {
          expiresIn: Math.max(
            1,
            Math.floor((qrExpiresAt.getTime() - Date.now()) / 1000),
          ),
        },
      );

      try {
        await tx.ticket.create({
          data: {
            id: ticketId,
            orderId: order.id,
            ticketTypeId: item.ticketTypeId,
            ownerUserId: order.userId,
            ticketCode,
            qrPayload,
            status: TicketStatus.ACTIVE,
          },
        });

        return {
          ticketId,
          ticketCode,
          ticketTypeName: item.ticketType.name,
          qrPayload,
        };
      } catch (error) {
        if (
          !this.isUniqueViolation(error) ||
          attempt === TICKET_CODE_RETRY_LIMIT
        ) {
          throw error;
        }
      }
    }

    throw new Error("Unable to generate unique ticket code");
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

  async getTicketsByOrderIdForUser(orderId: string, requestingUser: AuthUser) {
    // Ownership check diễn ra theo order để tránh lộ vé của người khác.
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    this.assertCanAccessOwnedResource(order.userId, requestingUser);

    return this.getTicketsByOrderId(orderId);
  }

  async getTicketsForOrder(orderId: string, requestingUser: AuthUser) {
    const isAdmin = this.isAdmin(requestingUser);

    return this.prisma.ticket.findMany({
      where: {
        orderId,
        ...(!isAdmin ? { ownerUserId: requestingUser.id } : {}),
      },
      include: {
        ticketType: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  async getTicketsForUser(requestingUser: AuthUser) {
    // Admin xem được toàn bộ ticket, customer chỉ thấy ticket của chính mình.
    return this.prisma.ticket.findMany({
      where: this.buildOwnershipFilter(requestingUser),
      include: {
        ticketType: { select: { name: true } },
        order: {
          select: {
            id: true,
            userId: true,
            concertId: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  async getTicketById(ticketId: string, requestingUser: AuthUser) {
    // Trả 404 nếu ticket không tồn tại, và chặn nếu không phải chủ vé.
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        ticketType: { select: { name: true } },
        order: {
          select: {
            id: true,
            userId: true,
            concertId: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    this.assertCanAccessOwnedResource(ticket.ownerUserId, requestingUser);

    return this.toTicketView(ticket as TicketRow);
  }

  async verifyTicketQr(
    qrPayload: string,
  ): Promise<TicketVerificationResultDto> {
    if (!qrPayload?.trim()) {
      throw new BadRequestException("qrPayload is required");
    }

    // Checker chỉ cần chuỗi QR, service tự verify chữ ký và đối chiếu DB.
    const ticketSecret = this.config.get<string>(
      "JWT_TICKET_SECRET",
      "ticket-secret",
    );

    let payload: Record<string, unknown>;

    try {
      payload = verify(qrPayload, ticketSecret) as Record<string, unknown>;
    } catch {
      return { valid: false, ticket: null, reason: "Invalid signature" };
    }

    const ticketId =
      typeof payload.ticket_id === "string" ? payload.ticket_id : null;
    const ticketCode =
      typeof payload.ticket_code === "string" ? payload.ticket_code : null;
    const concertId =
      typeof payload.concert_id === "string" ? payload.concert_id : null;
    const ticketTypeId =
      typeof payload.ticket_type_id === "string"
        ? payload.ticket_type_id
        : null;

    if (!ticketId || !ticketCode || !concertId || !ticketTypeId) {
      return { valid: false, ticket: null, reason: "Malformed QR payload" };
    }

    // Đối chiếu lại ticket thật trong DB để tránh QR giả hoặc QR đã bị sửa.
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        ticketType: { select: { name: true } },
        order: {
          select: {
            id: true,
            userId: true,
            concertId: true,
          },
        },
      },
    });

    if (
      !ticket ||
      ticket.ticketCode !== ticketCode ||
      ticket.ticketTypeId !== ticketTypeId ||
      ticket.order?.concertId !== concertId
    ) {
      return { valid: false, ticket: null, reason: "Ticket not found" };
    }

    const view = this.toTicketView(ticket as TicketRow);

    if (ticket.status !== TicketStatus.ACTIVE) {
      return {
        valid: false,
        ticket: view,
        reason: `Ticket is ${ticket.status}`,
      };
    }

    return {
      valid: true,
      ticket: view,
    };
  }

  private toTicketView(ticket: TicketRow): TicketViewDto {
    return {
      ticketId: ticket.id,
      ticketCode: ticket.ticketCode,
      qrPayload: ticket.qrPayload,
      ticketTypeId: ticket.ticketTypeId,
      ticketTypeName: ticket.ticketType.name,
      ownerUserId: ticket.ownerUserId,
      orderId: ticket.orderId,
      concertId: ticket.order?.concertId ?? "",
      status: ticket.status,
      seatNumber: ticket.seatNumber,
      scannedAt: ticket.scannedAt?.toISOString() ?? null,
    };
  }

  private buildOwnershipFilter(requestingUser: AuthUser) {
    return this.isAdmin(requestingUser)
      ? {}
      : { ownerUserId: requestingUser.id };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    );
  }

  private getTicketQrExpiresAt(eventDate: Date): Date {
    const graceMinutes = 60;
    const expiresAt = new Date(eventDate.getTime() + graceMinutes * 60 * 1000);

    // Đảm bảo QR không hết hạn trước giờ check-in, nhưng vẫn có đệm ngắn sau sự kiện.
    return expiresAt;
  }

  private assertCanAccessOwnedResource(
    ownerUserId: string,
    requestingUser: AuthUser,
  ) {
    // Không cho customer truy cập ticket/order của người khác.
    if (ownerUserId !== requestingUser.id && !this.isAdmin(requestingUser)) {
      throw new ForbiddenException("You do not have permission");
    }
  }

  private isAdmin(requestingUser: AuthUser): boolean {
    return requestingUser.roles.some((role) => role.name === "admin");
  }
}
