import { Injectable, Logger } from '@nestjs/common';
import { PaymentGateway } from '../../generated/prisma';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface InsertEventResult {
  isNew: boolean;
  eventId: string;
  processedAt: Date | null;
  status: 'PROCESSING' | 'PROCESSED' | 'FAILED';
}

@Injectable()
export class PaymentEventService {
  private readonly logger = new Logger(PaymentEventService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Insert PaymentEvent idempotently.
   * Unique constraint: (gateway, gatewayTransactionId, eventType)
   * Nếu event đã tồn tại → isNew=false, caller nên skip xử lý.
   */
  async insertEvent(data: {
    orderId: string;
    gateway: PaymentGateway;
    gatewayTransactionId: string;
    eventType: string;
    rawPayload: Record<string, unknown>;
    signatureValid: boolean;
  }): Promise<InsertEventResult> {
    // Dùng raw SQL với ON CONFLICT DO NOTHING để đảm bảo idempotency
    const result = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO payment_events
         (id, order_id, gateway, gateway_transaction_id, event_type, raw_payload, signature_valid, status, created_at)
       VALUES
         (gen_random_uuid(), $1::uuid, $2::text::"PaymentGateway", $3, $4, $5::jsonb, $6, 'PROCESSING', NOW())
       ON CONFLICT (gateway, gateway_transaction_id, event_type) DO NOTHING
       RETURNING id`,
      data.orderId,
      data.gateway,
      data.gatewayTransactionId,
      data.eventType,
      JSON.stringify(data.rawPayload),
      data.signatureValid,
    );

    if (result.length === 0) {
      // Conflict → event đã tồn tại
      this.logger.warn(
        `Duplicate PaymentEvent skipped: ${data.gateway}/${data.gatewayTransactionId}/${data.eventType}`,
      );
      // Lấy eventId hiện có
      const existing = await this.prisma.paymentEvent.findFirst({
        where: {
          gateway: data.gateway,
          gatewayTransactionId: data.gatewayTransactionId,
          eventType: data.eventType,
        },
        select: { id: true, processedAt: true },
      });
      const status = await this.getStatus(existing?.id ?? '');
      return {
        isNew: false,
        eventId: existing?.id ?? '',
        processedAt: existing?.processedAt ?? null,
        status,
      };
    }

    return { isNew: true, eventId: result[0].id, processedAt: null, status: 'PROCESSING' };
  }

  /**
   * Đánh dấu event đã được xử lý xong.
   */
  async markProcessed(eventId: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `UPDATE payment_events
       SET status = 'PROCESSED', processed_at = NOW()
       WHERE id = $1::uuid`,
      eventId,
    ).catch((err) => {
      this.logger.error(`Failed to mark event processed: ${eventId}`, err);
    });
  }

  async markProcessing(eventId: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `UPDATE payment_events
       SET status = 'PROCESSING'
       WHERE id = $1::uuid`,
      eventId,
    );
  }

  async markFailed(eventId: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `UPDATE payment_events
       SET status = 'FAILED'
       WHERE id = $1::uuid`,
      eventId,
    ).catch((err) => {
      this.logger.error(`Failed to mark event failed: ${eventId}`, err);
    });
  }

  private async getStatus(eventId: string): Promise<'PROCESSING' | 'PROCESSED' | 'FAILED'> {
    if (!eventId) {
      return 'FAILED';
    }

    const rows = await this.prisma.$queryRawUnsafe<{ status: string }[]>(
      `SELECT status FROM payment_events WHERE id = $1::uuid`,
      eventId,
    );

    const status = rows[0]?.status;
    if (status === 'PROCESSED' || status === 'FAILED') {
      return status;
    }

    return 'PROCESSING';
  }
}
