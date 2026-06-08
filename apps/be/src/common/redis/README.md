# Redis Common Module

Module này cung cấp Redis client dùng chung cho backend NestJS.

## File đã thêm

- `redis.module.ts`: khai báo `RedisModule`, provide và export `RedisService`.
- `redis.service.ts`: quản lý kết nối Redis bằng `ioredis`.
- `redis.constants.ts`: khai báo default TTL cho cache key.
- `../../config/redis.config.ts`: đọc cấu hình Redis từ biến môi trường.

`RedisModule` đang được gắn vào `AppModule`, nên các module khác có thể inject trực tiếp `RedisService`.

## Biến môi trường

Thêm các biến sau vào `.env` của backend:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## RedisService

`RedisService` chịu trách nhiệm:

- Kết nối Redis khi app khởi động.
- Đóng kết nối Redis khi app shutdown.
- Expose Redis client gốc qua `getClient()`.
- Cung cấp helper JSON/cache cơ bản.

Các helper hiện có:

```ts
getClient()
getJson<T>(key)
setJson(key, value, ttlSeconds)
del(...keys)
delPattern(pattern)
```

## Cách dùng

Inject `RedisService` vào service cần dùng:

```ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class ExampleService {
  constructor(private readonly redisService: RedisService) {}

  async getData() {
    const cacheKey = 'cache:example:data';
    const cached = await this.redisService.getJson(cacheKey);

    if (cached) {
      return cached;
    }

    const data = { value: 'example' };
    await this.redisService.setJson(cacheKey, data, 60);

    return data;
  }
}
```

## Cache Concert

`ConcertService` đã dùng Redis theo chiến lược cache-aside:

- `GET /concerts`: cache theo prefix `cache:concert:list`.
- `GET /concerts/:id`: cache theo key `cache:concert:{concertId}`.
- TTL list/detail: `60` giây.
- Khi `create`, `update`, `publish`, `cancel`, `complete` concert thì invalidate cache liên quan.

Vì `GET /concerts` có query filter và phân trang, key thực tế có dạng:

```text
cache:concert:list:{queryHash}
```

Cách này tránh trả nhầm cache giữa các query khác nhau.

## Lưu ý

- Redis chỉ dùng cho cache/rate limit/idempotency, không dùng làm nguồn dữ liệu đúng cuối cùng.
- Nếu Redis lỗi trong cache concert, request vẫn fallback database.
- Backend sẽ cố connect Redis khi khởi động, nên Redis service cần chạy trước khi start app.
