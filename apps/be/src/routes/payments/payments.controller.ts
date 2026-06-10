import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { AuthUser } from '../auth/dto/user-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { ConfigService } from '@nestjs/config';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

type Provider = 'VNPAY' | 'MOMO';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly gatewayService: PaymentGatewayService,
    private readonly config: ConfigService,
  ) {}

  /**
   * POST /payments/create
   * Customer tạo payment request cho order đang PENDING_PAYMENT.
   */
  @Post('create')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('payment:create')
  async create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key is required');
    }

    const result = await this.paymentsService.createPayment(
      user,
      dto,
      idempotencyKey,
    );

    return result.body;
  }

  /**
   * POST /payments/webhooks/mock-trigger
   * DEV ONLY: Tạo webhook hợp lệ để test mà không cần tính signature thủ công.
   * PHẢI khai báo TRƯỚC webhooks/:provider để không bị match nhầm.
   */
  @Post('webhooks/mock-trigger')
  @HttpCode(HttpStatus.OK)
  async mockTrigger(
    @Body()
    body: {
      provider: Provider;
      paymentRef: string;
      gatewayTransactionId: string;
      eventType: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
      amount: number;
    },
  ) {
    const nodeEnv = this.config.get('NODE_ENV') ?? process.env.NODE_ENV;
    if (nodeEnv === 'production' || process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Not available in production');
    }

    const signature = this.gatewayService.buildMockSignature(body.provider, {
      paymentRef: body.paymentRef,
      gatewayTransactionId: body.gatewayTransactionId,
      eventType: body.eventType,
      amount: body.amount,
      currency: 'VND',
    });

    const result = await this.paymentsService.handleWebhook(body.provider, {
      paymentRef: body.paymentRef,
      gatewayTransactionId: body.gatewayTransactionId,
      eventType: body.eventType,
      amount: body.amount,
      currency: 'VND',
      signature,
    });

    return result;
  }

  /**
   * POST /payments/webhooks/:provider
   * Nhận webhook từ mock gateway (public, không cần JWT).
   * Verify signature qua HMAC-SHA256.
   * PHẢI khai báo SAU mock-trigger.
   */
  @Post('webhooks/:provider')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Param('provider') provider: string,
    @Body() dto: PaymentWebhookDto,
  ) {
    const validProviders: Provider[] = ['VNPAY', 'MOMO'];

    if (!validProviders.includes(provider.toUpperCase() as Provider)) {
      throw new BadRequestException(`Unknown payment provider: ${provider}`);
    }

    const result = await this.paymentsService.handleWebhook(
      provider.toUpperCase() as Provider,
      dto,
    );

    return result;
  }

  /**
   * GET /payments/:paymentRef/status
   * Poll trạng thái payment. Trả tickets nếu PAID.
   */
  @Get(':paymentRef/status')
  @UseGuards(JwtAuthGuard)
  async getStatus(
    @Param('paymentRef') paymentRef: string,
    @CurrentUser() user: AuthUser,
  ) {
    const status = await this.paymentsService.getPaymentStatus(
      paymentRef,
      user,
    );

    return status;
  }
}
