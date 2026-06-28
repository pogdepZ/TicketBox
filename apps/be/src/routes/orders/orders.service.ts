import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import { IdempotencyService } from "./idempotency.service";
import { TicketInventoryService } from "./ticket-inventory.service";
import { OrderTransactionHelper } from "./order-transaction.helper";
import { CreateOrderDto } from "./dto/create-order.dto";
import {
  OrderDetailResponseDto,
  OrderItemResponseDto,
  OrderResponseDto,
  decimalToString,
} from "./dto/order-response.dto";
import { AuthUser } from "../auth/dto/user-response.dto";
import { TicketsService } from "../tickets/tickets.service";
import {
  IdempotencyStatus,
  Order,
  OrderItem,
  OrderStatus,
  ReservationStatus,
  TicketType,
} from "../../generated/prisma";
import {
  getPaymentGraceUntil,
  RESERVATION_TTL_MINUTES,
} from "./order-expiration.constants";

/** Rate limit: tối đa 5 lần tạo order / 300 giây mỗi user */
const RATE_LIMIT_CAPACITY = 5;
const RATE_LIMIT_REFILL_PER_SECOND = RATE_LIMIT_CAPACITY / 300; // ~0.0167
const RATE_LIMIT_TTL_SECONDS = 300;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly idempotency: IdempotencyService,
    private readonly inventory: TicketInventoryService,
    private readonly txHelper: OrderTransactionHelper,
    private readonly ticketsService: TicketsService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // POST /orders
  // ─────────────────────────────────────────────────────────────────────────

  async createOrder(
    user: AuthUser,
    dto: CreateOrderDto,
    idempotencyKey: string | undefined,
  ): Promise<OrderResponseDto> {
    // Bước 1: bắt buộc Idempotency-Key
    if (!idempotencyKey || idempotencyKey.trim() === "") {
      throw new BadRequestException("Idempotency-Key is required");
    }

    const requestHash = this.idempotency.computeRequestHash(user.id, dto);

    // Bước 2: Kiểm tra idempotency (Redis → DB)
    const cached = await this.idempotency.check(idempotencyKey, requestHash);
    if (cached) {
      return cached.body as OrderResponseDto;
    }

    // Bước 3: Rate limit theo userId (bypass for admin)
    const isAdmin = user.roles.some((role) => role.name === 'admin');
    if (!isAdmin) {
      const rateLimitKey = `order-rate:${user.id}`;
      const rateResult = await this.redis.consumeTokenBucket(
        rateLimitKey,
        RATE_LIMIT_CAPACITY,
        RATE_LIMIT_REFILL_PER_SECOND,
        RATE_LIMIT_TTL_SECONDS,
      );
      if (!rateResult.allowed) {
        throw new HttpException(
          `Too many order requests. Retry after ${rateResult.retryAfterSeconds}s`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Bước 4: Đánh dấu PROCESSING (chặn concurrent duplicate với cùng key)
    try {
      await this.idempotency.markProcessing(
        idempotencyKey,
        requestHash,
        user.id,
      );
    } catch {
      // Unique constraint violation: request đang được xử lý
      throw new ConflictException({
        message: "Request is already being processed",
        key: idempotencyKey,
      });
    }

    try {
      const responseBody = await this.runCreateOrderTransaction(
        user,
        dto,
        idempotencyKey,
      );

      // Sau khi DB transaction thành công, set thêm Redis key cho từng ghế
      const redisTTL = RESERVATION_TTL_MINUTES * 60 + 10; // 10 * 60 + 10 = 610s
      const normalizedSeats = dto.items && dto.items.length > 0
        ? dto.items.flatMap(item => item.seatNumbers.map(s => s.trim().toUpperCase()))
        : dto.seatNumbers!.map(s => s.trim().toUpperCase());
      for (const seatNumber of normalizedSeats) {
        const key = `hold:seat:${dto.concertId}:${seatNumber}`;
        try {
          await this.redis.setJson(
            key,
            responseBody.reservationId || responseBody.orderId,
            redisTTL,
          );
        } catch (err) {
          this.logger.warn(
            `Failed to set Redis lock for seat ${seatNumber}: ${(err as any).message}`,
          );
        }
      }

      // Lưu vào idempotency store (COMPLETED)
      await this.idempotency.store(
        idempotencyKey,
        requestHash,
        201,
        responseBody,
        IdempotencyStatus.COMPLETED,
      );

      return responseBody;
    } catch (error) {
      await this.idempotency.markFailed(idempotencyKey);
      throw error;
    }
  }

  /**
   * Core transaction: lock → validate → create → update atomically.
   */
  private async runCreateOrderTransaction(
    user: AuthUser,
    dto: CreateOrderDto,
    idempotencyKey: string,
  ): Promise<OrderResponseDto> {
    const orderItemsInput = dto.items && dto.items.length > 0
      ? dto.items.map(item => ({
          ticketTypeId: item.ticketTypeId,
          seatNumbers: item.seatNumbers.map(s => s.trim().toUpperCase())
        }))
      : [{
          ticketTypeId: dto.ticketTypeId!,
          seatNumbers: dto.seatNumbers!.map(s => s.trim().toUpperCase())
        }];

    // Gom tất cả các ghế để check trùng và tính số lượng
    const allSeatNumbers: string[] = [];
    const seatToTicketTypeMap = new Map<string, string>();
    const ticketTypeIdToSeatsMap = new Map<string, string[]>();

    orderItemsInput.forEach(item => {
      item.seatNumbers.forEach(s => {
        allSeatNumbers.push(s);
        seatToTicketTypeMap.set(s, item.ticketTypeId);
      });
      ticketTypeIdToSeatsMap.set(item.ticketTypeId, item.seatNumbers);
    });

    const ticketTypeIds = Array.from(new Set(orderItemsInput.map(item => item.ticketTypeId)));

    return this.prisma.$transaction(async (tx) => {
      // ── Bước 5: Lock TicketType rows FOR UPDATE ──
      const ticketTypes = await this.inventory.lockTicketTypes(
        tx as any,
        ticketTypeIds,
      );

      // ── Bước 6: Validate concert PUBLISHED ──
      const concert = await tx.concert.findUnique({
        where: { id: dto.concertId },
        select: { id: true, status: true },
      });

      if (!concert || concert.status !== "PUBLISHED") {
        throw new ConflictException({
          message: "Trạng thái sự kiện không hợp lệ",
          concertId: dto.concertId,
          status: concert?.status ?? "NOT_FOUND",
        });
      }

      // ── Bước 7: Validate ticket types (status, concertId, sale window) ──
      const validateInputs = orderItemsInput.map(item => ({
        ticketTypeId: item.ticketTypeId,
        quantity: item.seatNumbers.length
      }));
      this.inventory.validateTicketTypes(ticketTypes, dto.concertId, validateInputs);

      // ── Bước 8+9+10: Check tồn kho và quota cho từng loại vé ──
      for (const item of orderItemsInput) {
        const tt = ticketTypes.find((t) => t.id === item.ticketTypeId);
        if (!tt) {
          throw new BadRequestException({
            message: "Invalid ticket type",
            ticketTypeId: item.ticketTypeId,
          });
        }
        const qty = item.seatNumbers.length;
        
        // Kiểm tra tồn kho
        this.inventory.checkInventory(tt, qty);

        // Lock/upsert quota và kiểm tra maxPerUser
        const quota = await this.inventory.lockOrUpsertQuota(
          tx as any,
          user.id,
          item.ticketTypeId,
        );
        this.inventory.checkQuota(quota, tt.maxPerUser, qty);
      }

      // ── Kiểm tra ghế đã bán hoặc đang giữ ──
      const now = new Date();

      // Check if seats are sold (using tickets table)
      const soldTickets = await tx.ticket.findMany({
        where: {
          concertId: dto.concertId,
          seatNumber: { in: allSeatNumbers },
          status: { in: ["ACTIVE", "USED"] },
        },
        select: { seatNumber: true },
      });
      const soldSeats = soldTickets
        .map((t) => t.seatNumber)
        .filter(Boolean) as string[];

      // Check if seats are held (using reservation_seats table)
      const heldSeats = await tx.reservationSeat.findMany({
        where: {
          concertId: dto.concertId,
          seatNumber: { in: allSeatNumbers },
          status: "HELD",
          expiresAt: { gt: now },
        },
        select: { seatNumber: true },
      });
      const heldSeatNumbers = heldSeats
        .map((s) => s.seatNumber)
        .filter(Boolean) as string[];

      const conflictSeats = Array.from(
        new Set([...soldSeats, ...heldSeatNumbers]),
      );
      if (conflictSeats.length > 0) {
        throw new ConflictException({
          message: "Some seats are already sold or held",
          conflictSeats,
        });
      }

      // ── Bước 11: Tạo Reservation ──
      const expiresAt = new Date(
        Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000 + 10 * 1000,
      );
      const paymentGraceUntil = getPaymentGraceUntil(expiresAt);

      const reservation = await tx.reservation.create({
        data: {
          userId: user.id,
          concertId: dto.concertId,
          status: ReservationStatus.HELD,
          expiresAt,
        },
      });

      // ── Bước 12: Tạo ReservationItem ──
      for (const item of orderItemsInput) {
        const tt = ticketTypes.find(t => t.id === item.ticketTypeId)!;
        await tx.reservationItem.create({
          data: {
            reservationId: reservation.id,
            ticketTypeId: item.ticketTypeId,
            quantity: item.seatNumbers.length,
            unitPrice: tt.price,
          },
        });
      }

      // ── Bước 12.5: Tạo ReservationSeat ──
      const reservationSeatsData = orderItemsInput.flatMap(item => 
        item.seatNumbers.map(seatNumber => ({
          reservationId: reservation.id,
          concertId: dto.concertId,
          ticketTypeId: item.ticketTypeId,
          seatNumber,
          status: "HELD" as const,
          expiresAt,
        }))
      );
      await tx.reservationSeat.createMany({
        data: reservationSeatsData,
      });

      // ── Bước 13: Tính totalAmount và tạo Order ──
      let totalAmount = 0;
      orderItemsInput.forEach(item => {
        const tt = ticketTypes.find(t => t.id === item.ticketTypeId)!;
        totalAmount += Number(tt.price) * item.seatNumbers.length;
      });

      const order = await tx.order.create({
        data: {
          userId: user.id,
          concertId: dto.concertId,
          reservationId: reservation.id,
          idempotencyKey,
          status: OrderStatus.PENDING_PAYMENT,
          totalAmount,
          expiresAt,
          paymentGraceUntil,
        },
      });

      // ── Bước 14: Tạo OrderItem ──
      for (const item of orderItemsInput) {
        const tt = ticketTypes.find(t => t.id === item.ticketTypeId)!;
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            ticketTypeId: item.ticketTypeId,
            quantity: item.seatNumbers.length,
            unitPrice: tt.price,
          },
        });
      }

      // ── Bước 15: Cập nhật tồn kho và quota atomically ──
      for (const item of orderItemsInput) {
        const qty = item.seatNumbers.length;
        // Giảm remaining
        await tx.$executeRaw`UPDATE ticket_types SET remaining = remaining - ${qty} WHERE id = ${item.ticketTypeId}::uuid`;

        // Tăng heldQuantity
        await tx.$executeRaw`UPDATE user_ticket_quotas
           SET held_quantity = held_quantity + ${qty}, updated_at = NOW()
           WHERE user_id = ${user.id}::uuid AND ticket_type_id = ${item.ticketTypeId}::uuid`;
      }

      // ── Bước 16: Build response ──
      const items: OrderItemResponseDto[] = orderItemsInput.map(item => {
        const tt = ticketTypes.find(t => t.id === item.ticketTypeId)!;
        const qty = item.seatNumbers.length;
        const lineTotal = Number(tt.price) * qty;
        return {
          ticketTypeId: item.ticketTypeId,
          name: tt.name,
          quantity: qty,
          unitPrice: decimalToString(tt.price),
          lineTotal: decimalToString(lineTotal),
        };
      });

      return {
        orderId: order.id,
        concertId: order.concertId,
        reservationId: reservation.id,
        status: order.status,
        totalAmount: decimalToString(totalAmount),
        currency: "VND",
        expiresAt: expiresAt.toISOString(),
        items,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /orders/:id
  // ─────────────────────────────────────────────────────────────────────────

  async getOrder(
    orderId: string,
    requestingUser: AuthUser,
  ): Promise<OrderDetailResponseDto> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        orderId,
      );
    const order = await this.prisma.order.findUnique({
      where: isUuid ? { id: orderId } : { paymentRef: orderId },
      include: {
        items: {
          include: { ticketType: { select: { name: true } } },
        },
        concert: {
          select: { name: true, eventDate: true },
        },
        reservation: {
          include: {
            reservationSeats: {
              select: { seatNumber: true },
            },
          },
        },
      },
    });

    const isAdmin = requestingUser.roles.some((r) => r.name === "admin");

    // Trả 404 để tránh leak existence (nếu không phải owner và không phải admin)
    if (!order || (!isAdmin && order.userId !== requestingUser.id)) {
      throw new NotFoundException("Order not found");
    }

    // Query tickets via ticketsService to ensure we use the tickets module
    const tickets = await this.ticketsService.getTicketsForOrder(order.id, requestingUser);

    return this.buildDetailResponse(order as any, tickets);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /orders
  // ─────────────────────────────────────────────────────────────────────────

  async getUserOrders(user: AuthUser): Promise<OrderDetailResponseDto[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId: user.id },
      include: {
        items: {
          include: { ticketType: { select: { name: true } } },
        },
        concert: {
          select: { name: true, eventDate: true },
        },
        reservation: {
          include: {
            reservationSeats: {
              select: { seatNumber: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result: OrderDetailResponseDto[] = [];
    for (const order of orders) {
      const tickets = await this.ticketsService.getTicketsForOrder(order.id, user);
      result.push(this.buildDetailResponse(order as any, tickets));
    }

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /orders/:id/cancel
  // ─────────────────────────────────────────────────────────────────────────

  async cancelOrder(
    orderId: string,
    userId: string,
  ): Promise<OrderDetailResponseDto> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        orderId,
      );
    const order = await this.prisma.order.findUnique({
      where: isUuid ? { id: orderId } : { paymentRef: orderId },
      include: { items: true },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException("Order not found");
    }

    const cancelableStatuses: OrderStatus[] = [
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.PAYMENT_PROCESSING,
    ];

    if (!cancelableStatuses.includes(order.status as OrderStatus)) {
      throw new ConflictException({
        message: `Cannot cancel order with status ${order.status}`,
        currentStatus: order.status,
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      return this.txHelper.releaseOrder(
        tx as any,
        orderId,
        OrderStatus.CANCELLED,
        ReservationStatus.CANCELLED,
      );
    });

    // Clean up Redis keys for released seats
    if (result && result.releasedSeats) {
      for (const seat of result.releasedSeats) {
        const key = `hold:seat:${seat.concertId}:${seat.seatNumber}`;
        try {
          await this.redis.del(key);
        } catch (err) {
          this.logger.warn(
            `Failed to delete Redis key on order cancellation: ${(err as any).message}`,
          );
        }
      }
    }

    const updated = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        items: { include: { ticketType: { select: { name: true } } } },
        concert: { select: { name: true, eventDate: true } },
        reservation: {
          include: {
            reservationSeats: { select: { seatNumber: true } },
          },
        },
      },
    });

    return this.buildDetailResponse(updated as any);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private buildDetailResponse(
    order: Order & {
      items: (OrderItem & { ticketType: { name: string } })[];
      concert: { name: string; eventDate: Date };
      reservation: { reservationSeats: { seatNumber: string }[] };
    },
    tickets: any[] = [],
  ): OrderDetailResponseDto {
    const items: OrderItemResponseDto[] = order.items.map((item) => ({
      ticketTypeId: item.ticketTypeId,
      name: item.ticketType.name,
      quantity: item.quantity,
      unitPrice: decimalToString(item.unitPrice),
      lineTotal: decimalToString(Number(item.unitPrice) * item.quantity),
    }));

    const selectedSeats =
      order.reservation?.reservationSeats?.map((s) => s.seatNumber) ?? [];

    const mappedTickets = tickets.map((t) => ({
      id: t.id,
      ticketCode: t.ticketCode,
      ticketTypeId: t.ticketTypeId,
      seatNumber: t.seatNumber,
      qrPayload: t.qrPayload,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      seatZone: t.ticketType?.name || 'Standard',
      price: t.ticketType?.price ? Number(t.ticketType.price) : 0,
    }));

    return {
      orderId: order.id,
      userId: order.userId,
      concertId: order.concertId,
      reservationId: order.reservationId,
      status: order.status,
      totalAmount: decimalToString(order.totalAmount),
      currency: "VND",
      expiresAt: order.expiresAt.toISOString(),
      createdAt: order.createdAt.toISOString(),
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt?.toISOString() ?? null,
      concertTitle: order.concert.name,
      concertDate: order.concert.eventDate.toISOString(),
      selectedSeats,
      items,
      tickets: mappedTickets,
    };
  }
}
