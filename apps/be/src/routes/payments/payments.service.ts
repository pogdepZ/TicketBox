import { Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  createMockPayment(dto: CreatePaymentDto, idempotencyKey?: string) {
    const paymentRef = this.generatePaymentRef(dto.provider);

    return {
      success: true,
      data: {
        orderId: dto.orderId,
        paymentRef,
        provider: dto.provider,
        status: 'PAYMENT_PROCESSING',
        amount: 3600000,
        currency: 'VND',
        paymentUrl: this.buildMockPaymentUrl(dto.provider, paymentRef, dto.returnUrl),
        idempotencyKey: idempotencyKey ?? null,
        mockEvents: ['SUCCESS', 'FAILED', 'TIMEOUT'],
      },
      message: 'Mock payment request created',
    };
  }

  private generatePaymentRef(provider: 'VNPAY' | 'MOMO'): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);

    return `${provider}-${timestamp}-${Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0')}`;
  }

  private buildMockPaymentUrl(
    provider: 'VNPAY' | 'MOMO',
    paymentRef: string,
    returnUrl?: string,
  ): string {
    const params = new URLSearchParams({
      provider,
      paymentRef,
    });

    if (returnUrl) {
      params.set('returnUrl', returnUrl);
    }

    return `/mock-payment?${params.toString()}`;
  }
}
