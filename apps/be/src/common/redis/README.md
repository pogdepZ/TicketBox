# Redis Common Module

Redis trong TicketBox được dùng để giảm tải các truy vấn lặp lại, chặn request quá dày, lưu trạng thái ngắn hạn và hỗ trợ idempotency. PostgreSQL vẫn là nguồn dữ liệu đúng cuối cùng cho user, role, tồn kho vé, order, payment, ticket và check-in.

## Thành phần hiện có

- `redis.module.ts`: khai báo `RedisModule` dạng global để service khác có thể inject `RedisService`.
- `redis.service.ts`: quản lý kết nối `ioredis`, JSON cache helpers, xóa key/pattern, primitive idempotency và token bucket.
- `redis.constants.ts`: TTL mặc định và TTL chuyên biệt cho auth cache.
- `../../config/redis.config.ts`: đọc cấu hình Redis từ biến môi trường.

`RedisModule` đã được import trong `AppModule`, nên các module backend có thể inject `RedisService` trực tiếp.

## Biến môi trường

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

`docker-compose.yml` đã có service `redis` dùng image `redis:7-alpine`.

## Helpers trong RedisService

```ts
getClient()
getJson<T>(key)
setJson(key, value, ttlSeconds)
setJsonIfNotExists(key, value, ttlSeconds)
expire(key, ttlSeconds)
del(...keys)
delPattern(pattern)
consumeTokenBucket(key, capacity, refillRatePerSecond, ttlSeconds)
```

### Vì sao có `setJsonIfNotExists`

`setJsonIfNotExists` dùng Redis `SET ... NX` để chỉ set khi key chưa tồn tại. Đây là primitive cần cho idempotency lock hoặc chống double-submit ngắn hạn.

Ví dụ:

```ts
const acquired = await redisService.setJsonIfNotExists(
  `idem:orders:${userId}:${idempotencyKey}`,
  { status: 'PROCESSING', requestHash },
  30 * 60,
);
```

Nếu `acquired = false`, request cùng idempotency key đã được xử lý hoặc đang xử lý. Service gọi Redis cần kiểm tra DB `IdempotencyRecord` để trả response cũ hoặc báo conflict.

### Vì sao có `consumeTokenBucket`

`consumeTokenBucket` dùng Lua script để thao tác đọc, refill và trừ token trong một lệnh atomic. Nếu implement token bucket bằng nhiều lệnh Redis rời rạc, hai request đồng thời có thể cùng đọc số token cũ và vượt limit.

Primitive này phù hợp cho:

- `POST /orders`
- `POST /payments/create`
- payment webhook
- `POST /checkin/scan`
- `POST /checkin/sync`

Redis chỉ quyết định request có bị throttle không. Logic nghiệp vụ vẫn phải validate ở service tương ứng.

## Đã implement: Concert Cache

`ConcertService` đang dùng cache-aside:

- `GET /concerts`: cache theo prefix `cache:concert:list`.
- `GET /concerts/:id`: cache theo key `cache:concert:{concertId}`.
- TTL: `60` giây.
- Khi `create`, `update`, `publish`, `cancel`, `complete` concert thì invalidate list cache và detail cache của concert đó.

Vì `GET /concerts` có query filter và phân trang, key thực tế có dạng:

```text
cache:concert:list:{queryHash}
```

Query được normalize rồi hash để tránh trả nhầm cache giữa các filter khác nhau.

### Vì sao cache concert

Concert list/detail là dữ liệu đọc nhiều, thay đổi ít hơn nhiều so với số lần user mở trang. Cache 60 giây giúp giảm số query `findMany + count` và `findUnique` vào PostgreSQL, nhất là trong lúc nhiều user cùng xem danh sách sự kiện.

TTL ngắn giúp dữ liệu đủ mới cho UI. Các thao tác admin quan trọng vẫn invalidate ngay để giảm khả năng stale.

## Đã implement: Auth User Cache

`JwtStrategy.validate()` trước đây query PostgreSQL ở mọi request protected để load user, roles và permissions. Hiện luồng đã đổi thành:

1. Đọc `cache:auth:user:{userId}` từ Redis.
2. Nếu có cache và user vẫn `ACTIVE`, trả luôn `AuthUser`.
3. Nếu miss cache, query PostgreSQL với `authUserInclude`.
4. Normalize thành `UserResponseDto`, lưu Redis, rồi trả về request.

Key:

```text
cache:auth:user:{userId}
```

TTL:

```text
5 phút
```

### Vì sao cache auth

Mỗi request dùng `JwtAuthGuard` đều chạy `JwtStrategy.validate()`. Nếu không cache, các endpoint admin/protected sẽ tạo rất nhiều query giống nhau để lấy user, role và permission. Đây là dữ liệu nhỏ, đọc cực nhiều, và thường không đổi liên tục.

TTL 5 phút là mức cân bằng:

- Đủ dài để giảm tải DB rõ rệt.
- Đủ ngắn để thay đổi role/status không bị stale quá lâu nếu chưa có invalidation event đầy đủ.

`AuthService.login()` và `AuthService.refresh()` cũng warm cache để request tiếp theo không cần query lại user.

### Invalidation auth cache

Hiện có helper:

```ts
authCacheService.invalidateUser(userId)
```

Cần gọi helper này khi bổ sung các luồng sau:

- Admin đổi status user sang `BLOCKED` hoặc `DELETED`.
- Gán hoặc gỡ role cho user.
- Thêm hoặc gỡ permission khỏi role mà user đang có.
- Cập nhật profile user nếu response auth cần phản ánh ngay.

Nếu chưa có các luồng quản trị này, TTL 5 phút là lớp bảo vệ stale tạm thời.

## Nên implement tiếp: Ticket Types, Seat Zones, Availability

Schema đã có `TicketType`, `SeatZone`, `remaining`, `maxPerUser`, `saleStartAt`, `saleEndAt`. Khi các endpoint production được thêm, nên cache các dữ liệu đọc nhiều này:

```text
cache:concert:{concertId}:ticket-types
cache:concert:{concertId}:seat-zones
cache:concert:{concertId}:availability
```

TTL đề xuất:

- `ticket-types`: 30-60 giây.
- `seat-zones`: 5-30 phút nếu layout ít đổi.
- `availability`: 5-15 giây trong giai đoạn mở bán.

### Vì sao không dùng Redis làm nguồn tồn kho đúng cuối cùng

`TicketType.remaining` ảnh hưởng trực tiếp đến việc oversell. Redis snapshot có thể stale, mất key hoặc lệch khi có retry/concurrency. Vì vậy:

- Redis chỉ dùng để hiển thị availability nhanh cho frontend.
- PostgreSQL transaction và row-level lock vẫn phải quyết định có được giữ vé/mua vé hay không.
- Khi order/reservation thay đổi số lượng vé, service nên invalidate hoặc refresh `cache:concert:{concertId}:availability`.

## Nên implement tiếp: Orders và Payments

Blueprint đã định hướng idempotency cho:

```text
idem:orders:{userId}:{idempotencyKey}
idem:payments:create:{userId}:{idempotencyKey}
```

TTL Redis đề xuất:

```text
15-30 phút
```

DB `IdempotencyRecord` giữ lâu hơn:

```text
24 giờ
```

### Vì sao dùng cả Redis và PostgreSQL cho idempotency

Redis xử lý nhanh trường hợp user double-click hoặc frontend retry ngay lập tức. PostgreSQL lưu record bền vững hơn để trả lại response cũ, audit và chống mất trạng thái khi Redis restart.

Luồng đề xuất:

1. Hash request body.
2. Dùng `setJsonIfNotExists` để lấy processing lock ngắn hạn.
3. Tạo hoặc kiểm tra `IdempotencyRecord` trong PostgreSQL.
4. Nếu request cùng key và cùng hash đã `COMPLETED`, trả response cũ.
5. Nếu cùng key nhưng khác hash, trả `409 Conflict`.
6. Sau khi xử lý xong, lưu response vào DB và cập nhật Redis cache ngắn hạn.

## Nên implement tiếp: Rate Limit

Dùng `consumeTokenBucket` cho các endpoint ghi nhạy cảm:

```text
rate:orders:user:{userId}
rate:orders:ip:{ip}
rate:payments:create:user:{userId}
rate:payments:create:ip:{ip}
rate:webhook:payment:{provider}:ip:{ip}
rate:checkin:scan:user:{userId}
rate:checkin:sync:user:{userId}
```

Ngưỡng ban đầu có thể theo blueprint:

- `POST /orders`: 5 request/phút/user, 60 request/phút/IP.
- `POST /payments/create`: 10 request/phút/user, 100 request/phút/IP.
- Payment webhook: 300 request/phút/provider/IP.

### Vì sao rate limit dùng Redis

Rate limit cần chia sẻ trạng thái giữa nhiều instance backend. Nếu lưu trong memory local, mỗi instance có bucket riêng và tổng traffic thực tế sẽ vượt limit. Redis là nơi trung gian nhanh, có TTL, và atomic Lua script giúp nhiều request đồng thời không vượt token.

## Nên implement tiếp: Reservation Hold

Khi order flow thật được thêm, Redis có thể lưu hold ngắn hạn:

```text
hold:reservation:{reservationId}
hold:user:{userId}:concert:{concertId}
```

TTL đề xuất:

```text
10 phút
```

### Vì sao chỉ dùng Redis cho trạng thái ngắn hạn

Reservation có hạn tự nhiên và được đọc nhiều trong checkout. Redis giúp kiểm tra nhanh hold còn sống và hạn chế user tạo nhiều hold song song. Nhưng khi trừ số lượng vé, PostgreSQL vẫn phải lock row `TicketType` và cập nhật `remaining` trong transaction.

## Nên implement tiếp: Check-in

Khi `CheckinService` chuyển từ mock sang DB thật, nên cache lookup ticket theo code:

```text
cache:ticket:code:{ticketCode}
checkin:used:{ticketId}
```

TTL đề xuất:

- Ticket lookup: 1-6 giờ hoặc theo thời lượng sự kiện.
- Used marker: đến khi sự kiện kết thúc.

### Vì sao vẫn cần DB khi check-in

Redis giúp scan nhanh tại cổng, nhưng check-in là thao tác không được xử lý trùng. DB vẫn phải ghi `CheckinEvent` với unique key và cập nhật `Ticket.status/scannedAt` trong transaction. Redis `checkin:used:{ticketId}` chỉ là lớp chặn nhanh trước khi hit DB.

## Nên implement tiếp: Waiting Room

Schema đã có `WaitingRoomSession`. Redis phù hợp để giữ queue live:

```text
queue:concert:{concertId}
waiting:token:{token}
```

Kiểu dữ liệu đề xuất:

- Sorted set cho queue, score là timestamp hoặc priority.
- String/JSON cho token session.

### Vì sao waiting room hợp với Redis

Vị trí hàng chờ thay đổi liên tục và cần đọc nhanh. Nếu cập nhật position liên tục trong PostgreSQL, DB sẽ chịu nhiều write nhỏ không cần thiết. Redis xử lý queue live tốt hơn, còn PostgreSQL lưu session/admission record để audit và khôi phục.

## Nguyên tắc vận hành

- Cache dữ liệu đọc nhiều, đổi ít hoặc chấp nhận stale ngắn.
- Dùng TTL ngắn cho dữ liệu liên quan mở bán.
- Luôn có fallback DB cho cache read.
- Không dùng Redis làm nguồn đúng cuối cùng cho tiền, vé, payment, ticket status.
- Invalidate cache khi có mutation biết rõ ảnh hưởng.
- Với key pattern lớn, tránh lạm dụng `delPattern` trên hot path; khi hệ thống lớn hơn nên dùng tag/version key.

## Key Naming

```text
cache:{domain}:{id}
cache:{domain}:{id}:{view}
idem:{scope}:{actorId}:{idempotencyKey}
rate:{scope}:user:{userId}
rate:{scope}:ip:{ip}
hold:{scope}:{id}
queue:{scope}:{id}
```

Key nên có domain rõ ràng để dễ debug, invalidate và tránh collision.
