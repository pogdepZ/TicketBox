import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { IdempotencyService } from './idempotency.service';
import { TicketInventoryService } from './ticket-inventory.service';
import { OrderTransactionHelper } from './order-transaction.helper';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrderDetailResponseDto,
  OrderItemResponseDto,
  OrderResponseDto,
  decimalToString,
} from './dto/order-response.dto';
import { AuthUser } from '../auth/dto/user-response.dto';
import {
  IdempotencyStatus,
  Order,
  OrderItem,
  OrderStatus,
  ReservationStatus,
  TicketType,
} from '../../generated/prisma';

/** Thời gian giữ vé tạm: 10 phút */
const RESERVATION_TTL_MINUTES = 10;

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
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // POST /orders
  // ─────────────────────────────────────────────────────────────────────────

  async createOrder(
    user: AuthUser,
    dto: CreateOrderDto,
    idempotencyKey: string | undefined,
  ): Promise<{ status: number; body: OrderResponseDto }> {
    // Bước 1: bắt buộc Idempotency-Key
    if (!idempotencyKey || idempotencyKey.trim() === '') {
      throw new BadRequestException('Idempotency-Key is required');
    }

    const requestHash = this.idempotency.computeRequestHash(user.id, dto);

    // Bước 2: Kiểm tra idempotency (Redis → DB)
    const cached = await this.idempotency.check(idempotencyKey, requestHash);
    if (cached) {
      return { status: cached.status, body: cached.body as OrderResponseDto };
    }

    // Bước 3: Rate limit theo userId
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

    // Bước 4: Đánh dấu PROCESSING (chặn concurrent duplicate với cùng key)
    try {
      await this.idempotency.markProcessing(idempotencyKey, requestHash, user.id);
    } catch {
      // Unique constraint violation: request đang được xử lý
      throw new ConflictException({
        message: 'Request is already being processed',
        key: idempotencyKey,
      });
    }

    try {
      const responseBody = await this.runCreateOrderTransaction(user, dto, idempotencyKey);

      // Lưu vào idempotency store (COMPLETED)
      await this.idempotency.store(
        idempotencyKey,
        requestHash,
        201,
        responseBody,
        IdempotencyStatus.COMPLETED,
      );

      return { status: 201, body: responseBody };
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
    const ticketTypeIds = dto.items.map((i) => i.ticketTypeId);

    return this.prisma.$transaction(async (tx) => {
      // ── Bước 5: Lock TicketType rows FOR UPDATE ──
      const ticketTypes = await this.inventory.lockTicketTypes(tx as any, ticketTypeIds);

      // ── Bước 6: Validate concert PUBLISHED ──
      const concert = await tx.concert.findUnique({
        where: { id: dto.concertId },
        select: { id: true, status: true },
      });

      if (!concert || concert.status !== 'PUBLISHED') {
        throw new ConflictException({
          message: 'Concert is not available',
          concertId: dto.concertId,
          status: concert?.status ?? 'NOT_FOUND',
        });
      }

      // ── Bước 7: Validate ticket types (status, concertId, sale window) ──
      this.inventory.validateTicketTypes(ticketTypes, dto.concertId, dto.items);

      // ── Bước 8+9+10: Check tồn kho và quota per item ──
      const enrichedItems: Array<{
        ticketType: TicketType;
        quantity: number;
      }> = [];

      for (const item of dto.items) {
        const tt = ticketTypes.find((t) => t.id === item.ticketTypeId)!;

        this.inventory.checkInventory(tt, item.quantity);

        // Lock/upsert quota và check
        const quota = await this.inventory.lockOrUpsertQuota(
          tx as any,
          user.id,
          item.ticketTypeId,
        );
        this.inventory.checkQuota(quota, tt.maxPerUser, item.quantity);

        enrichedItems.push({ ticketType: tt, quantity: item.quantity });
      }

      // ── Bước 11: Tạo Reservation ──
      const expiresAt = new Date(
        Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000,
      );

      const reservation = await tx.reservation.create({
        data: {
          userId: user.id,
          concertId: dto.concertId,
          status: ReservationStatus.HELD,
          expiresAt,
        },
      });

      // ── Bước 12: Tạo ReservationItem ──
      await tx.reservationItem.createMany({
        data: enrichedItems.map((e) => ({
          reservationId: reservation.id,
          ticketTypeId: e.ticketType.id,
          quantity: e.quantity,
          unitPrice: e.ticketType.price,
        })),
      });

      // ── Bước 13: Tính totalAmount và tạo Order ──
      const totalAmount = enrichedItems.reduce(
        (sum, e) => sum + Number(e.ticketType.price) * e.quantity,
        0,
      );

      const order = await tx.order.create({
        data: {
          userId: user.id,
          concertId: dto.concertId,
          reservationId: reservation.id,
          idempotencyKey,
          status: OrderStatus.PENDING_PAYMENT,
          totalAmount,
          expiresAt,
        },
      });

      // ── Bước 14: Tạo OrderItem ──
      await tx.orderItem.createMany({
        data: enrichedItems.map((e) => ({
          orderId: order.id,
          ticketTypeId: e.ticketType.id,
          quantity: e.quantity,
          unitPrice: e.ticketType.price,
        })),
      });

      // ── Bước 15: Cập nhật tồn kho và quota atomically ──
      for (const e of enrichedItems) {
        // Giảm remaining
        await tx.$executeRawUnsafe(
          `UPDATE ticket_types SET remaining = remaining - $1 WHERE id = $2::uuid`,
          e.quantity,
          e.ticketType.id,
        );

        // Tăng heldQuantity
        await tx.$executeRawUnsafe(
          `UPDATE user_ticket_quotas
           SET held_quantity = held_quantity + $1, updated_at = NOW()
           WHERE user_id = $2::uuid AND ticket_type_id = $3::uuid`,
          e.quantity,
          user.id,
          e.ticketType.id,
        );
      }

      // ── Bước 16: Build response ──
      const items: OrderItemResponseDto[] = enrichedItems.map((e) => ({
        ticketTypeId: e.ticketType.id,
        name: e.ticketType.name,
        quantity: e.quantity,
        unitPrice: decimalToString(e.ticketType.price),
        lineTotal: decimalToString(
          Number(e.ticketType.price) * e.quantity,
        ),
      }));

      return {
        orderId: order.id,
        concertId: order.concertId,
        status: order.status,
        totalAmount: decimalToString(totalAmount),
        currency: 'VND',
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
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { ticketType: { select: { name: true } } },
        },
        tickets: requestingUser.roles.some((r) => r.name === 'customer')
          ? { where: { ownerUserId: requestingUser.id } }
          : true,
      },
    });

    const isAdmin = requestingUser.roles.some((r) => r.name === 'admin');

    // Trả 404 để tránh leak existence (nếu không phải owner và không phải admin)
    if (!order || (!isAdmin && order.userId !== requestingUser.id)) {
      throw new NotFoundException('Order not found');
    }

    return this.buildDetailResponse(order as any);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /orders/:id/cancel
  // ─────────────────────────────────────────────────────────────────────────

  async cancelOrder(
    orderId: string,
    userId: string,
  ): Promise<OrderDetailResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new ConflictException({
        message: `Cannot cancel order with status ${order.status}`,
        currentStatus: order.status,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await this.txHelper.releaseOrder(
        tx as any,
        orderId,
        OrderStatus.CANCELLED,
        ReservationStatus.CANCELLED,
      );
    });

    const updated = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { include: { ticketType: { select: { name: true } } } } },
    });

    return this.buildDetailResponse(updated as any);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private buildDetailResponse(
    order: Order & {
      items: (OrderItem & { ticketType: { name: string } })[];
    },
  ): OrderDetailResponseDto {
    const items: OrderItemResponseDto[] = order.items.map((item) => ({
      ticketTypeId: item.ticketTypeId,
      name: item.ticketType.name,
      quantity: item.quantity,
      unitPrice: decimalToString(item.unitPrice),
      lineTotal: decimalToString(
        Number(item.unitPrice) * item.quantity,
      ),
    }));

    return {
      orderId: order.id,
      userId: order.userId,
      concertId: order.concertId,
      reservationId: order.reservationId,
      status: order.status,
      totalAmount: decimalToString(order.totalAmount),
      currency: 'VND',
      expiresAt: order.expiresAt.toISOString(),
      createdAt: order.createdAt.toISOString(),
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt?.toISOString() ?? null,
      items,
    };
  }
}
