import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import redisConfig from '../../config/redis.config';
import { REDIS_DEFAULT_KEY_TTL_SECONDS } from './redis.constants';

export type TokenBucketResult =
  | {
      allowed: true;
      retryAfterSeconds: 0;
      remainingTokens: number;
    }
  | {
      allowed: false;
      retryAfterSeconds: number;
      remainingTokens: number;
    };

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(
    @Inject(redisConfig.KEY)
    private readonly redis: ConfigType<typeof redisConfig>,
  ) {
    this.client = new Redis({
      host: redis.host,
      port: redis.port,
      password: redis.password,
      db: redis.db,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Redis connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis disconnected');
  }

  getClient(): Redis {
    return this.client;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds = REDIS_DEFAULT_KEY_TTL_SECONDS,
  ): Promise<void> {
    const payload = JSON.stringify(value);

    if (ttlSeconds > 0) {
      await this.client.set(key, payload, 'EX', ttlSeconds);
      return;
    }

    await this.client.set(key, payload);
  }

  async setJsonIfNotExists(
    key: string,
    value: unknown,
    ttlSeconds = REDIS_DEFAULT_KEY_TTL_SECONDS,
  ): Promise<boolean> {
    const payload = JSON.stringify(value);
    const result =
      ttlSeconds > 0
        ? await this.client.set(key, payload, 'EX', ttlSeconds, 'NX')
        : await this.client.set(key, payload, 'NX');

    return result === 'OK';
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.expire(key, ttlSeconds);

    return result === 1;
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }

    return this.client.del(...keys);
  }

  async delPattern(pattern: string): Promise<number> {
    let cursor = '0';
    let deletedCount = 0;

    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );

      cursor = nextCursor;

      if (keys.length > 0) {
        deletedCount += await this.client.del(...keys);
      }
    } while (cursor !== '0');

    return deletedCount;
  }

  async consumeTokenBucket(
    key: string,
    capacity: number,
    refillRatePerSecond: number,
    ttlSeconds: number,
  ): Promise<TokenBucketResult> {
    const script = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local ttlSeconds = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])

      local bucket = redis.call('HMGET', key, 'tokens', 'updatedAt')
      local tokens = tonumber(bucket[1])
      local updatedAt = tonumber(bucket[2])

      if tokens == nil then
        tokens = capacity
      end

      if updatedAt == nil then
        updatedAt = now
      end

      local elapsedSeconds = math.max(0, (now - updatedAt) / 1000)
      local refilledTokens = math.min(capacity, tokens + (elapsedSeconds * refillRate))

      if refilledTokens < 1 then
        local retryAfterSeconds = math.ceil((1 - refilledTokens) / refillRate)
        redis.call('HMSET', key, 'tokens', refilledTokens, 'updatedAt', now)
        redis.call('EXPIRE', key, ttlSeconds)
        return {0, retryAfterSeconds, refilledTokens}
      end

      local remainingTokens = refilledTokens - 1
      redis.call('HMSET', key, 'tokens', remainingTokens, 'updatedAt', now)
      redis.call('EXPIRE', key, ttlSeconds)
      return {1, 0, remainingTokens}
`;

    const [allowed, retryAfterSeconds, remainingTokens] = (await this.client.eval(
      script,
      1,
      key,
      capacity,
      refillRatePerSecond,
      ttlSeconds,
      Date.now(),
    )) as [number, number, number];

    return {
      allowed: allowed === 1,
      retryAfterSeconds,
      remainingTokens,
    } as TokenBucketResult;
  }
}
