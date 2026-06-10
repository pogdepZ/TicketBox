import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

type Provider = 'VNPAY' | 'MOMO';

/** Số lỗi liên tiếp trước khi mở circuit breaker */
const FAILURE_THRESHOLD = 5;
/** Thời gian giữ counter lỗi (giây) */
const FAILURE_WINDOW_SECONDS = 60;
/** Thời gian circuit mở (giây) trước khi thử lại */
const OPEN_DURATION_SECONDS = 30;

@Injectable()
export class PaymentCircuitBreakerService {
  private readonly logger = new Logger(PaymentCircuitBreakerService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Kiểm tra circuit breaker của provider.
   * Throw 503 nếu circuit đang OPEN.
   */
  async assertAvailable(provider: Provider): Promise<void> {
    const openKey = `cb:${provider}:open`;
    const isOpen = await this.redis.getJson<boolean>(openKey);

    if (isOpen) {
      this.logger.warn(`Circuit OPEN for provider: ${provider}`);
      throw new ServiceUnavailableException(
        `Payment gateway ${provider} is temporarily unavailable. Please try again later.`,
      );
    }
  }

  /**
   * Ghi nhận thành công → reset failure counter.
   */
  async recordSuccess(provider: Provider): Promise<void> {
    const failureKey = `cb:${provider}:failures`;
    await this.redis.del(failureKey);
  }

  /**
   * Ghi nhận thất bại. Nếu vượt threshold → mở circuit.
   */
  async recordFailure(provider: Provider): Promise<void> {
    const failureKey = `cb:${provider}:failures`;
    const client = this.redis.getClient();

    const failures = await client.incr(failureKey);

    if (failures === 1) {
      // Set TTL cho lần đầu tiên
      await client.expire(failureKey, FAILURE_WINDOW_SECONDS);
    }

    if (failures >= FAILURE_THRESHOLD) {
      const openKey = `cb:${provider}:open`;
      await this.redis.setJson(openKey, true, OPEN_DURATION_SECONDS);
      this.logger.error(
        `Circuit OPENED for ${provider} after ${failures} failures`,
      );
    }
  }
}
