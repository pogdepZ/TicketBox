import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IdempotencyService } from '../orders/idempotency.service';
import { OrderTransactionHelper } from '../orders/order-transaction.helper';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentEventService } from './payment-event.service';
import { TicketsService } from '../tickets/tickets.service';
import { PaymentCircuitBreakerService } from './payment-circuit-breaker.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import {
  PaymentStatusResponseDto,
  TicketResponseDto,
} from './dto/payment-status-response.dto';
import { AuthUser } from '../auth/dto/user-response.dto';
import {
  IdempotencyStatus,
  NotificationChannel,
  NotificationStatus,
  OrderStatus,
  PaymentGateway,
  ReservationStatus,
} from '../../generated/prisma';

type Provider = 'VNPAY' | 'MOMO';
type WebhookSignatureMode = 'MOCK' | 'GATEWAY_VERIFIED';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: IdempotencyService,
    private readonly txHelper: OrderTransactionHelper,
    private readonly gateway: PaymentGatewayService,
    private readonly eventService: PaymentEventService,
    private readonly ticketsService: TicketsService,
    private readonly circuitBreaker: PaymentCircuitBreakerService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // POST /payments/create
  // ─────────────────────────────────────────────────────────────────────────

  async createPayment(
    user: AuthUser,
    dto: CreatePaymentDto,
    idempotencyKey: string | undefined,
  ): Promise<{ status: number; body: unknown }> {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key is required');
    }

    const scopedKey = this.buildPaymentIdempotencyKey(user.id, idempotencyKey);
    const requestHash = this.idempotency.computeRequestHash(user.id, dto);

    // Idempotency check
    const cached = await this.idempotency.check(scopedKey, requestHash);
    if (cached) {
      return { status: cached.status, body: cached.body };
    }

    // Mark processing (chặn concurrent duplicate)
    try {
      await this.idempotency.markProcessing(scopedKey, requestHash, user.id);
    } catch {
      throw new ConflictException({
        message: 'Request is already being processed',
        key: idempotencyKey,
      });
    }

    try {
      const body = await this.doCreatePayment(user, dto);

      await this.idempotency.store(
        scopedKey,
        requestHash,
        200,
        body,
        IdempotencyStatus.COMPLETED,
      );

      return { status: 200, body };
    } catch (error) {
      await this.idempotency.markFailed(scopedKey);
      throw error;
    }
  }

  private async doCreatePayment(user: AuthUser, dto: CreatePaymentDto) {
    // Circuit breaker check
    await this.circuitBreaker.assertAvailable(dto.provider as Provider);

    const paymentRequest = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM orders WHERE id = ${dto.orderId}::uuid FOR UPDATE`;

      const order = await tx.order.findUnique({
        where: { id: dto.orderId },
      });

      if (!order || order.userId !== user.id) {
        throw new NotFoundException('Order not found');
      }

      const now = new Date();

      if (order.expiresAt <= now) {
        throw new ConflictException({
          message: 'Order has expired',
          orderId: order.id,
          expiresAt: order.expiresAt,
        });
      }

      const payableStatuses: OrderStatus[] = [
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PAYMENT_PROCESSING,
      ];

      if (!payableStatuses.includes(order.status)) {
        throw new ConflictException({
          message: `Order is not payable`,
          orderId: order.id,
          currentStatus: order.status,
        });
      }

      if (order.paymentRef) {
        const provider = (order.paymentMethod ?? dto.provider) as Provider;
        return {
          orderId: order.id,
          paymentRef: order.paymentRef,
          provider,
          orderStatus: order.status,
          paymentStatus: this.toPaymentStatus(order.status),
          expiresAt: order.expiresAt.toISOString(),
          amount: order.totalAmount.toString(),
          currency: 'VND',
        };
      }

      const paymentRef = this.gateway.generatePaymentRef(dto.provider as Provider);

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAYMENT_PROCESSING,
          paymentMethod: dto.provider as any,
          paymentRef,
        },
      });

      return {
        orderId: updated.id,
        paymentRef,
        provider: dto.provider,
        orderStatus: updated.status,
        paymentStatus: this.toPaymentStatus(updated.status),
        expiresAt: updated.expiresAt.toISOString(),
        amount: updated.totalAmount.toString(),
        currency: 'VND',
      };
    });

    try {
      const paymentUrl = await this.gateway.buildPaymentUrl(
        paymentRequest.provider as Provider,
        paymentRequest.paymentRef,
        paymentRequest.amount,
        new Date(paymentRequest.expiresAt),
        dto.returnUrl,
      );

      await this.circuitBreaker.recordSuccess(paymentRequest.provider as Provider);

      return {
        ...paymentRequest,
        paymentUrl,
      };
    } catch (error) {
      await this.circuitBreaker.recordFailure(paymentRequest.provider as Provider);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /payments/webhooks/:provider
  // ─────────────────────────────────────────────────────────────────────────

  async handleWebhook(
    provider: Provider,
    dto: PaymentWebhookDto,
    signatureMode: WebhookSignatureMode = 'MOCK',
  ): Promise<{ processed: boolean; orderStatus: string; paymentStatus: string; retryAction?: string }> {
    // Verify signature
    if (signatureMode === 'MOCK') {
      this.gateway.assertValidSignature(provider, dto, dto.signature);
    }

    // Lấy order theo paymentRef
    const order = await this.prisma.order.findFirst({
      where: { paymentRef: dto.paymentRef },
      include: {
        items: {
          include: { ticketType: { select: { name: true } } },
        },
      },
    });

    if (!order) {
      this.logger.warn(`Webhook received for unknown paymentRef: ${dto.paymentRef}`);
      return { processed: false, orderStatus: 'UNKNOWN', paymentStatus: 'UNKNOWN' };
    }

    // Insert PaymentEvent idempotently
    const { isNew, eventId, processedAt, status } = await this.eventService.insertEvent({
      orderId: order.id,
      gateway: provider as unknown as PaymentGateway,
      gatewayTransactionId: dto.gatewayTransactionId,
      eventType: dto.eventType,
      rawPayload: dto as unknown as Record<string, unknown>,
      signatureValid: true,
    });

    if (!isNew && (processedAt || status === 'PROCESSED')) {
      // Đã xử lý xong trước đó → idempotent return
      return {
        processed: true,
        orderStatus: order.status,
        paymentStatus: this.toPaymentStatus(order.status as OrderStatus),
        retryAction: this.toRetryAction(order.status as OrderStatus),
      };
    }

    if (!isNew && status === 'PROCESSING') {
      // Đang có tiến trình khác xử lý → không xử lý song song
      return {
        processed: false,
        orderStatus: order.status,
        paymentStatus: this.toPaymentStatus(order.status as OrderStatus),
        retryAction: 'WAIT_AND_RETRY',
      };
    }

    await this.eventService.markProcessing(eventId);
    let finalStatus: OrderStatus = order.status as OrderStatus;

    try {
      if (dto.eventType === 'SUCCESS') {
        finalStatus = (await this.handleSuccess(order.id, dto)) as OrderStatus;
        await this.circuitBreaker.recordSuccess(provider);
      } else {
        // FAILED hoặc TIMEOUT
        finalStatus = (await this.handleFailed(order.id)) as OrderStatus;
        if (dto.eventType === 'TIMEOUT') {
          await this.circuitBreaker.recordFailure(provider);
        }
      }

      await this.eventService.markProcessed(eventId);
    } catch (error) {
      await this.eventService.markFailed(eventId);
      throw error;
    }

    return {
      processed: true,
      orderStatus: finalStatus,
      paymentStatus: this.toPaymentStatus(finalStatus),
      retryAction: this.toRetryAction(finalStatus),
    };
  }

  async handleIncomingWebhook(
    provider: Provider,
    payload: Record<string, unknown>,
  ): Promise<{ processed: boolean; orderStatus: string; paymentStatus: string; retryAction?: string }> {
    if (provider === 'MOMO' && this.gateway.isMomoIpnPayload(payload)) {
      if (!this.gateway.verifyMomoSignature(payload)) {
        throw new UnauthorizedException('Invalid MOMO signature');
      }

      const dto = this.gateway.normalizeMomoIpnPayload(payload);
      return this.handleWebhook(provider, {
        ...dto,
        signature: String(payload.signature),
      }, 'GATEWAY_VERIFIED');
    }

    return this.handleWebhook(provider, payload as unknown as PaymentWebhookDto);
  }

  /**
   * GET Webhook / IPN handler (specifically for VNPAY).
   * Verifies the SHA-512 signature and maps parameters to unified payload.
   */
  async handleWebhookGet(
    provider: Provider,
    query: any,
  ): Promise<{ processed: boolean; orderStatus: string; paymentStatus: string }> {
    if (provider === 'VNPAY') {
      const isValid = this.gateway.verifyVnpaySignature(query);
      if (!isValid) {
        throw new UnauthorizedException('Invalid VNPAY signature');
      }

      const vnpResponseCode = query['vnp_ResponseCode'];
      // VNPAY uses '00' for success
      const eventType: 'SUCCESS' | 'FAILED' = vnpResponseCode === '00' ? 'SUCCESS' : 'FAILED';
      const amountInCents = Number(query['vnp_Amount']);
      const amount = amountInCents / 100;

      const mockDto = {
        paymentRef: query['vnp_TxnRef'],
        gatewayTransactionId: query['vnp_TransactionNo'],
        eventType,
        amount,
        currency: query['vnp_CurrCode'] ?? 'VND',
        signature: query['vnp_SecureHash'],
      };

      const result = await this.handleWebhook(provider, mockDto, 'GATEWAY_VERIFIED');
      return {
        processed: result.processed,
        orderStatus: result.orderStatus,
        paymentStatus: result.paymentStatus,
      };
    }

    if (provider === 'MOMO' && this.gateway.isMomoIpnPayload(query)) {
      const result = await this.handleIncomingWebhook(provider, query);
      return {
        processed: result.processed,
        orderStatus: result.orderStatus,
        paymentStatus: result.paymentStatus,
      };
    }

    throw new BadRequestException(`HTTP GET Webhook not supported for provider: ${provider}`);
  }

  private async handleSuccess(
    orderId: string,
    dto: PaymentWebhookDto,
  ): Promise<string> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Lock order FOR UPDATE
      await tx.$executeRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;

      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: {
          items: {
            include: { ticketType: { select: { name: true } } },
          },
        },
      });

      if (order.status === OrderStatus.PAID) {
        this.logger.warn(`SUCCESS webhook for already PAID order: ${order.id}`);
        return { status: OrderStatus.PAID, issuedTickets: false };
      }

      const terminalStatuses: OrderStatus[] = [
        OrderStatus.EXPIRED,
        OrderStatus.CANCELLED,
        OrderStatus.REFUND_REQUIRED,
      ];

      if (terminalStatuses.includes(order.status)) {
        this.logger.error(
          `SUCCESS webhook arrived after terminal status ${order.status} for order ${order.id}. Marking REFUND_REQUIRED.`,
        );
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.REFUND_REQUIRED },
        });
        return { status: OrderStatus.REFUND_REQUIRED, issuedTickets: false };
      }

      const payableStatuses: OrderStatus[] = [
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PAYMENT_PROCESSING,
      ];

      if (!payableStatuses.includes(order.status)) {
        throw new ConflictException({
          message: `Order is not payable`,
          orderId: order.id,
          currentStatus: order.status,
        });
      }

      if (!this.amountMatches(order.totalAmount, dto.amount)) {
        throw new ConflictException({
          message: 'Payment amount mismatch',
          orderId: order.id,
          expectedAmount: order.totalAmount.toString(),
          actualAmount: this.gateway.normalizeAmount(dto.amount),
        });
      }

      const now = new Date();

      // Update Order → PAID
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          paidAt: now,
        },
      });

      // Update Reservation → CONFIRMED
      await tx.reservation.update({
        where: { id: order.reservationId },
        data: { status: ReservationStatus.CONFIRMED },
      });

      // Chuyển heldQuantity → paidQuantity per item
      for (const item of order.items) {
        await tx.$executeRaw`
          UPDATE user_ticket_quotas
           SET
             held_quantity = GREATEST(0, held_quantity - ${item.quantity}),
             paid_quantity = paid_quantity + ${item.quantity},
             updated_at = NOW()
           WHERE user_id = ${order.userId}::uuid AND ticket_type_id = ${item.ticketTypeId}::uuid
        `;
      }

      // Sinh tickets
      await this.ticketsService.issueTickets(
        tx as any,
        { id: order.id, userId: order.userId, concertId: order.concertId },
        order.items,
      );

      return { status: OrderStatus.PAID, issuedTickets: true };
    });

    // Queue notification (không block)
    if (result.issuedTickets) {
      const paidOrder = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { userId: true },
      });

      if (paidOrder) {
        this.queueSuccessNotification(paidOrder.userId, orderId).catch((err) => {
          this.logger.error(`Failed to queue notification for order ${orderId}`, err);
        });
      }
    }

    return result.status;
  }

  private async handleFailed(orderId: string): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;

      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { id: true, status: true },
      });

      if (order.status === OrderStatus.PAID) {
        this.logger.warn(
          `FAILED webhook for already PAID order: ${order.id}. Ignoring.`,
        );
        return OrderStatus.PAID;
      }

      const alreadyReleased: OrderStatus[] = [
        OrderStatus.PAYMENT_FAILED,
        OrderStatus.EXPIRED,
        OrderStatus.CANCELLED,
        OrderStatus.REFUND_REQUIRED,
      ];

      if (alreadyReleased.includes(order.status)) {
        return order.status;
      }

      await this.txHelper.releaseOrder(
        tx as any,
        orderId,
        OrderStatus.PAYMENT_FAILED,
        ReservationStatus.CANCELLED,
      );

      return OrderStatus.PAYMENT_FAILED;
    });
  }

  private async queueSuccessNotification(
    userId: string,
    orderId: string,
  ): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId,
        channel: NotificationChannel.EMAIL,
        template: 'payment_success',
        payload: { orderId } as any,
        status: NotificationStatus.PENDING,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /payments/:paymentRef/status
  // ─────────────────────────────────────────────────────────────────────────

  async getPaymentStatus(
    paymentRef: string,
    requestingUser: AuthUser,
  ): Promise<PaymentStatusResponseDto> {
    const order = await this.prisma.order.findFirst({
      where: { paymentRef },
    });

    const isAdmin = requestingUser.roles.some((r) => r.name === 'admin');

    if (!order || (!isAdmin && order.userId !== requestingUser.id)) {
      throw new NotFoundException('Payment not found');
    }

    const dbTickets =
      order.status === OrderStatus.PAID
        ? await this.ticketsService.getTicketsByOrderId(order.id)
        : [];

    const tickets: TicketResponseDto[] = dbTickets.map((t) => ({
      ticketId: t.id,
      ticketCode: t.ticketCode,
      ticketTypeName: t.ticketType.name,
      qrPayload: t.qrPayload,
      seatNumber: t.seatNumber,
      status: t.status,
    }));

    return {
      paymentRef,
      orderId: order.id,
      orderStatus: order.status,
      paymentStatus: this.toPaymentStatus(order.status as OrderStatus),
      retryAction: this.toRetryAction(order.status as OrderStatus),
      totalAmount: order.totalAmount.toString(),
      currency: 'VND',
      paidAt: order.paidAt?.toISOString() ?? null,
      expiresAt: order.expiresAt.toISOString(),
      tickets,
    };
  }

  private buildPaymentIdempotencyKey(userId: string, idempotencyKey: string): string {
    const digest = createHash('sha256')
      .update(`payments:create:${userId}:${idempotencyKey}`)
      .digest('hex');

    return `pay:${digest}`;
  }

  private amountMatches(expected: { toString(): string }, actual: number | string): boolean {
    return this.gateway.normalizeAmount(expected.toString()) === this.gateway.normalizeAmount(actual);
  }

  private toPaymentStatus(orderStatus: OrderStatus): string {
    switch (orderStatus) {
      case OrderStatus.PAID:
        return 'SUCCEEDED';
      case OrderStatus.PAYMENT_FAILED:
        return 'FAILED';
      case OrderStatus.EXPIRED:
      case OrderStatus.CANCELLED:
        return 'EXPIRED';
      case OrderStatus.REFUND_REQUIRED:
        return 'REFUND_REQUIRED';
      case OrderStatus.PAYMENT_PROCESSING:
        return 'PROCESSING';
      case OrderStatus.PENDING_PAYMENT:
      default:
        return 'PENDING';
    }
  }

  private toRetryAction(orderStatus: OrderStatus): string | undefined {
    if (
      orderStatus === OrderStatus.PAYMENT_FAILED ||
      orderStatus === OrderStatus.EXPIRED ||
      orderStatus === OrderStatus.CANCELLED
    ) {
      return 'CREATE_NEW_ORDER';
    }

    return undefined;
  }
}
