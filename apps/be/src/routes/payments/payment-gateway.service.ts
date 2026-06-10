import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt } from 'crypto';

type Provider = 'VNPAY' | 'MOMO';

@Injectable()
export class PaymentGatewayService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Tạo paymentRef unique theo format: {PROVIDER}-{YYYYMMDDHHmmss}-{5 số ngẫu nhiên}
   */
  generatePaymentRef(provider: Provider): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);
    const rand = randomInt(0, 99999).toString().padStart(5, '0');
    return `${provider}-${timestamp}-${rand}`;
  }

  /**
   * Build mock payment URL cho FE redirect.
   * Trong tuần 1, đây là URL local mock page.
   */
  buildPaymentUrl(
    provider: Provider,
    paymentRef: string,
    returnUrl?: string,
  ): string {
    const baseUrl = this.config
      .get<string>('MOCK_PAYMENT_BASE_URL', 'http://localhost:3000')
      .replace(/\/+$/, '');
    const params = new URLSearchParams({ provider, paymentRef });
    if (returnUrl) params.set('returnUrl', returnUrl);
    return `${baseUrl}/mock-payment?${params.toString()}`;
  }

  /**
   * Verify HMAC-SHA256 signature từ webhook mock.
   * Signature = HMAC-SHA256(secret, "{provider}:{paymentRef}:{gatewayTransactionId}:{eventType}:{amount}:{currency}")
   */
  verifyWebhookSignature(
    provider: Provider,
    payload: {
      paymentRef: string;
      gatewayTransactionId: string;
      eventType: string;
      amount: number | string;
      currency?: string;
    },
    signature: string,
  ): boolean {
    const secret = this.getMockSecret(provider);
    const message = this.buildSignatureMessage(provider, payload);
    const expected = createHmac('sha256', secret)
      .update(message)
      .digest('hex');
    return expected === signature;
  }

  /**
   * Throw nếu signature không hợp lệ.
   */
  assertValidSignature(
    provider: Provider,
    payload: {
      paymentRef: string;
      gatewayTransactionId: string;
      eventType: string;
      amount: number | string;
      currency?: string;
    },
    signature: string,
  ): void {
    if (!this.verifyWebhookSignature(provider, payload, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  /**
   * Tạo signature để FE/test có thể tự tạo mock webhook hợp lệ.
   * Chỉ expose trong development.
   */
  buildMockSignature(
    provider: Provider,
    payload: {
      paymentRef: string;
      gatewayTransactionId: string;
      eventType: string;
      amount: number | string;
      currency?: string;
    },
  ): string {
    const secret = this.getMockSecret(provider);
    const message = this.buildSignatureMessage(provider, payload);
    return createHmac('sha256', secret).update(message).digest('hex');
  }

  normalizeAmount(amount: number | string): string {
    const value =
      typeof amount === 'number'
        ? amount
        : Number(amount.replace(/,/g, '').trim());

    if (!Number.isFinite(value)) {
      return String(amount);
    }

    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  private buildSignatureMessage(
    provider: Provider,
    payload: {
      paymentRef: string;
      gatewayTransactionId: string;
      eventType: string;
      amount: number | string;
      currency?: string;
    },
  ): string {
    return [
      provider,
      payload.paymentRef,
      payload.gatewayTransactionId,
      payload.eventType,
      this.normalizeAmount(payload.amount),
      payload.currency ?? 'VND',
    ].join(':');
  }

  private getMockSecret(provider: Provider): string {
    const key =
      provider === 'VNPAY' ? 'MOCK_VNPAY_SECRET' : 'MOCK_MOMO_SECRET';
    return this.config.get<string>(key, 'mock-secret');
  }
}
