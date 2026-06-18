import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { VNPay, ProductCode, VnpLocale } from 'vnpay';

type Provider = 'VNPAY' | 'MOMO';

type UnifiedWebhookPayload = {
  paymentRef: string;
  gatewayTransactionId: string;
  eventType: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  amount: number | string;
  currency: 'VND';
};

type MomoIpnPayload = {
  partnerCode?: string;
  orderId?: string;
  requestId?: string;
  amount?: number | string;
  orderInfo?: string;
  orderType?: string;
  transId?: number | string;
  resultCode?: number | string;
  message?: string;
  payType?: string;
  responseTime?: number | string;
  extraData?: string;
  signature?: string;
};

@Injectable()
export class PaymentGatewayService {
  constructor(private readonly config: ConfigService) {}

  private getVnpayInstance(): VNPay {
    const tmnCode = this.config.get<string>('VNP_TMN_CODE') || '';
    const hashSecret = this.config.get<string>('VNP_HASH_SECRET') || '';
    const vnpUrl = this.config.get<string>('VNP_URL') || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    
    let vnpayHost = 'https://sandbox.vnpayment.vn';
    try {
      const urlObj = new URL(vnpUrl);
      vnpayHost = urlObj.origin;
    } catch {}

    return new VNPay({
      tmnCode,
      secureSecret: hashSecret,
      vnpayHost,
    });
  }

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
   * Build payment URL (VNPAY Sandbox or MoMo Sandbox).
   */
  async buildPaymentUrl(
    provider: Provider,
    paymentRef: string,
    amount: string,
    expiresAt: Date,
    returnUrl?: string,
  ): Promise<string> {
    if (provider === 'VNPAY') {
      const vnpay = this.getVnpayInstance();
      const rawAmount = Number(amount.replace(/,/g, '').trim());
      const fallbackReturnUrl = this.config.get<string>('VNP_RETURN_URL') || 'http://localhost:3000/checkout/result';

      // VNPAY Expire Date format: yyyyMMddHHmmss
      const vnpExpireDate = this.formatVnpayDate(expiresAt);

      return vnpay.buildPaymentUrl({
        vnp_Amount: rawAmount,
        vnp_TxnRef: paymentRef,
        vnp_OrderInfo: `Thanh toan don hang ${paymentRef}`,
        vnp_OrderType: ProductCode.Other,
        vnp_ReturnUrl: returnUrl || fallbackReturnUrl,
        vnp_IpAddr: '127.0.0.1',
        vnp_Locale: VnpLocale.VN,
        vnp_ExpireDate: Number(vnpExpireDate),
      });
    }

    return this.createMomoPaymentUrl(paymentRef, amount, expiresAt, returnUrl);
  }

  private formatVnpayDate(date: Date): string {
    // Chuyển đổi sang múi giờ Việt Nam (GMT+7)
    // VNPay yêu cầu định dạng yyyyMMddHHmmss theo giờ Việt Nam
    const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    return [
      vnTime.getFullYear(),
      pad(vnTime.getMonth() + 1),
      pad(vnTime.getDate()),
      pad(vnTime.getHours()),
      pad(vnTime.getMinutes()),
      pad(vnTime.getSeconds()),
    ].join('');
  }

  /**
   * Verify VNPAY signature from IPN/Webhook query parameters
   */
  verifyVnpaySignature(query: Record<string, string>): boolean {
    const secureHash = query['vnp_SecureHash'];
    if (!secureHash) return false;

    try {
      const vnpay = this.getVnpayInstance();
      const result = vnpay.verifyIpnCall(query as any);
      return result.isVerified;
    } catch {
      return false;
    }
  }

  /**
   * Verify MoMo IPN/redirect signature.
   * The signed fields match MoMo One-Time Payment result handling docs.
   */
  verifyMomoSignature(payload: MomoIpnPayload): boolean {
    if (!payload.signature) return false;

    const rawSignature = this.buildMomoResultRawSignature(payload);
    const expected = createHmac('sha256', this.getMomoSecretKey())
      .update(rawSignature)
      .digest('hex');

    return this.safeCompare(expected, payload.signature);
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
    const expected = createHmac('sha256', secret).update(message).digest('hex');
    return this.safeCompare(expected, signature);
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

  normalizeMomoIpnPayload(payload: MomoIpnPayload): UnifiedWebhookPayload {
    const resultCode = Number(payload.resultCode);
    const eventType: 'SUCCESS' | 'FAILED' = resultCode === 0 ? 'SUCCESS' : 'FAILED';

    return {
      paymentRef: String(payload.orderId ?? ''),
      gatewayTransactionId: String(payload.transId ?? payload.requestId ?? ''),
      eventType,
      amount: payload.amount ?? '',
      currency: 'VND',
    };
  }

  isMomoIpnPayload(payload: unknown): payload is MomoIpnPayload {
    if (!payload || typeof payload !== 'object') return false;

    const body = payload as Record<string, unknown>;
    return (
      'partnerCode' in body &&
      'orderId' in body &&
      'requestId' in body &&
      'resultCode' in body &&
      'transId' in body &&
      'signature' in body
    );
  }

  private async createMomoPaymentUrl(
    paymentRef: string,
    amount: string,
    expiresAt: Date,
    returnUrl?: string,
  ): Promise<string> {
    const endpoint = this.config.get<string>(
      'MOMO_ENDPOINT',
      'https://test-payment.momo.vn/v2/gateway/api/create',
    );
    const partnerCode = this.config.get<string>('MOMO_PARTNER_CODE', '');
    const accessKey = this.config.get<string>('MOMO_ACCESS_KEY', '');
    const secretKey = this.getMomoSecretKey();
    const redirectUrl =
      returnUrl ||
      this.config.get<string>('MOMO_REDIRECT_URL') ||
      'http://localhost:3000/checkout/result';
    const ipnUrl =
      this.config.get<string>('MOMO_IPN_URL') ||
      'http://localhost:3001/payments/webhooks/MOMO';
    const requestType = this.config.get<string>(
      'MOMO_REQUEST_TYPE',
      'captureWallet',
    );
    const requestId = paymentRef;
    const orderInfo = `Thanh toan don hang ${paymentRef}`;
    const extraData = '';
    const normalizedAmount = this.normalizeAmount(amount);

    // Ép cứng thời gian hết hạn là 10 phút theo yêu cầu để tránh lệch múi giờ trên MoMo Sandbox
    const expireTimeMinutes = 10;

    const rawSignature = [
      `accessKey=${accessKey}`,
      `amount=${normalizedAmount}`,
      `extraData=${extraData}`,
      `ipnUrl=${ipnUrl}`,
      `orderId=${paymentRef}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${partnerCode}`,
      `redirectUrl=${redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`,
    ].join('&');

    const signature = createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerCode,
        partnerName: 'TicketBox',
        storeId: 'TicketBox',
        requestId,
        amount: Number(normalizedAmount),
        orderId: paymentRef,
        orderInfo,
        redirectUrl,
        ipnUrl,
        lang: 'vi',
        requestType,
        autoCapture: true,
        extraData,
        signature,
        // Tham số quy định thời gian hết hạn của link MoMo
        expireTime: expireTimeMinutes,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      resultCode?: number;
      message?: string;
      payUrl?: string;
    };

    if (!response.ok || data.resultCode !== 0 || !data.payUrl) {
      throw new ServiceUnavailableException(
        `MoMo sandbox create payment failed: ${data.message ?? response.statusText}`,
      );
    }

    return data.payUrl;
  }

  private buildMomoResultRawSignature(payload: MomoIpnPayload): string {
    return [
      `accessKey=${this.config.get<string>('MOMO_ACCESS_KEY', '')}`,
      `amount=${payload.amount ?? ''}`,
      `extraData=${payload.extraData ?? ''}`,
      `message=${payload.message ?? ''}`,
      `orderId=${payload.orderId ?? ''}`,
      `orderInfo=${payload.orderInfo ?? ''}`,
      `orderType=${payload.orderType ?? ''}`,
      `partnerCode=${payload.partnerCode ?? ''}`,
      `payType=${payload.payType ?? ''}`,
      `requestId=${payload.requestId ?? ''}`,
      `responseTime=${payload.responseTime ?? ''}`,
      `resultCode=${payload.resultCode ?? ''}`,
      `transId=${payload.transId ?? ''}`,
    ].join('&');
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

  private getMomoSecretKey(): string {
    return this.config.get<string>('MOMO_SECRET_KEY', 'mock-momo-secret');
  }

  private safeCompare(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const actualBuffer = Buffer.from(actual, 'utf8');

    return (
      expectedBuffer.length === actualBuffer.length &&
      timingSafeEqual(expectedBuffer, actualBuffer)
    );
  }
}
