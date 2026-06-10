import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { REDIS_AUTH_USER_CACHE_TTL_SECONDS } from '../../common/redis/redis.constants';
import { AuthUser } from './dto/user-response.dto';

const AUTH_USER_CACHE_KEY_PREFIX = 'cache:auth:user';

@Injectable()
export class AuthCacheService {
  private readonly logger = new Logger(AuthCacheService.name);

  constructor(private readonly redisService: RedisService) {}

  async getUser(userId: string): Promise<AuthUser | null> {
    const key = this.buildUserCacheKey(userId);

    try {
      return await this.redisService.getJson<AuthUser>(key);
    } catch (error) {
      this.logger.warn(`Failed to read auth cache for user ${userId}`, error);
      return null;
    }
  }

  async setUser(user: AuthUser): Promise<void> {
    const key = this.buildUserCacheKey(user.id);

    try {
      await this.redisService.setJson(
        key,
        user,
        REDIS_AUTH_USER_CACHE_TTL_SECONDS,
      );
    } catch (error) {
      this.logger.warn(`Failed to write auth cache for user ${user.id}`, error);
    }
  }

  async invalidateUser(userId: string): Promise<void> {
    try {
      await this.redisService.del(this.buildUserCacheKey(userId));
    } catch (error) {
      this.logger.warn(`Failed to invalidate auth cache for user ${userId}`, error);
    }
  }

  private buildUserCacheKey(userId: string): string {
    return `${AUTH_USER_CACHE_KEY_PREFIX}:${userId}`;
  }
}
