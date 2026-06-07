# Đặc tả: Reliability - Cache, Rate Limit, Idempotency và Consistency

## Mô tả

Reliability spec mô tả các cơ chế bảo vệ hệ thống TicketBox trong giai đoạn mở bán vé có tải cao. Trọng tâm là bảo vệ backend API và database khỏi bị quá tải, đồng thời đảm bảo không oversell, không vượt giới hạn vé mỗi user và không xử lý trùng payment/order.

Các cơ chế chính:

- Redis rate limit để chặn spam request và bot đơn giản.
- Redis cache để giảm tải database cho trang danh sách concert và chi tiết concert.
- Idempotency key để chống tạo order/payment trùng khi user retry.
- PostgreSQL transaction + row-level lock để chống oversell.
- User ticket quota để enforce `maxPerUser` dưới tải cao.
- Circuit breaker cho payment provider, được mô tả chi tiết hơn trong `payment.md`.

Redis giúp hệ thống nhanh và chịu tải tốt hơn, nhưng PostgreSQL vẫn là nguồn dữ liệu đúng cuối cùng cho tồn kho vé, order, payment và ticket.

## Phạm vi tuần 1

Tuần 1 cần hoàn thành:

- Thiết kế Redis key cho rate limit, cache, idempotency và circuit breaker.
- Mô tả thuật toán rate limit dùng cho `POST /orders` và `POST /payments/create`.
- Mô tả cache-aside cho concert list, concert detail và ticket remaining.
- Mô tả transaction chống oversell.
- Mô tả cách enforce per-user limit bằng `UserTicketQuota`.
- Có pseudo-code đủ để tuần 2 implement.

Tuần 1 chưa cần:

- Benchmark tải thật.
- Waiting room hoàn chỉnh.
- Queue mua vé production-grade.
- Chống bot nâng cao bằng CAPTCHA/device fingerprint.

## Mục tiêu

- Backend không bị quá tải khi nhiều user gửi request mua vé cùng lúc.
- Database không phải xử lý mọi request đọc concert list/detail.
- Không bán quá `TicketType.totalQuantity`.
- Không để user mua quá `TicketType.maxPerUser`.
- Retry từ frontend không tạo order/payment trùng.
- Khi Redis gặp lỗi, hệ thống vẫn không được oversell vì consistency nằm ở PostgreSQL transaction.

## Các endpoint cần bảo vệ

Endpoint đọc nhiều:

- `GET /concerts`
- `GET /concerts/:id`
- `GET /concerts/:id/ticket-types` nếu có tách riêng

Endpoint ghi nhạy cảm:

- `POST /orders`
- `POST /payments/create`
- `POST /payments/webhooks/:provider`
- `POST /checkin/scan`
- `POST /checkin/sync`

Trong tuần 1, trọng tâm của người B là:

- `POST /orders`
- `POST /payments/create`
- cache cho dữ liệu concert/ticket type liên quan mua vé

## Rate limiting

### Lựa chọn thuật toán

TicketBox dùng **Token Bucket** cho các endpoint ghi nhạy cảm.

Lý do chọn:

- Cho phép user gửi một vài request burst hợp lý khi thao tác thật.
- Vẫn giới hạn tốc độ request trung bình.
- Dễ implement bằng Redis.
- Phù hợp hơn Fixed Window vì tránh tình trạng user bắn request ở ranh giới hai window.

Fixed Window đơn giản hơn nhưng dễ bị burst gấp đôi ở ranh giới phút. Sliding Window chính xác hơn nhưng tốn Redis hơn. Leaky Bucket ổn định nhưng kém thân thiện với thao tác burst ngắn của user thật.

### Key Redis

```txt
rate:orders:user:{userId}
rate:orders:ip:{ip}
rate:payments:create:user:{userId}
rate:payments:create:ip:{ip}
rate:webhook:payment:{provider}:ip:{ip}
```

### Ngưỡng đề xuất tuần 1

`POST /orders`:

- Theo user: 5 request/phút.
- Theo IP: 60 request/phút.

`POST /payments/create`:

- Theo user: 10 request/phút.
- Theo IP: 100 request/phút.

Payment webhook:

- Theo provider/IP: 300 request/phút.
- Webhook vẫn cần idempotency bằng `PaymentEvent`, vì rate limit không thay thế chống xử lý trùng.

### Response khi bị rate limit

HTTP status: `429 Too Many Requests`

```json
{
  "success": false,
  "data": {
    "retryAfterSeconds": 30
  },
  "message": "Too many requests"
}
```

### Pseudo-code Token Bucket

```ts
async function consumeToken(key, capacity, refillRatePerSecond) {
  const now = Date.now();
  const bucket = await redis.hmget(key, 'tokens', 'updatedAt');

  const currentTokens = bucket.tokens ?? capacity;
  const updatedAt = bucket.updatedAt ?? now;
  const elapsedSeconds = (now - updatedAt) / 1000;

  const refilledTokens = Math.min(
    capacity,
    currentTokens + elapsedSeconds * refillRatePerSecond
  );

  if (refilledTokens < 1) {
    const retryAfterSeconds = Math.ceil((1 - refilledTokens) / refillRatePerSecond);
    return { allowed: false, retryAfterSeconds };
  }

  await redis.hmset(key, {
    tokens: refilledTokens - 1,
    updatedAt: now
  });

  await redis.expire(key, 120);

  return { allowed: true };
}
```

Ghi chú implement tuần 2: nên dùng Lua script để thao tác đọc/cập nhật token bucket atomic trong Redis.

## Idempotency

Idempotency dùng cho các request có nguy cơ retry hoặc double-click:

- `POST /orders`
- `POST /payments/create`

Frontend phải gửi header:

```http
Idempotency-Key: <uuid-or-random-string>
```

### Key Redis

```txt
idem:orders:{userId}:{idempotencyKey}
idem:payments:create:{userId}:{idempotencyKey}
```

### Database record

Sử dụng model `IdempotencyRecord`:

```txt
key
userId
requestHash
status
responseStatus
responseBody
expiresAt
createdAt
```

### Quy tắc xử lý

- Nếu key chưa tồn tại:
  - tạo record `PROCESSING`.
  - xử lý request.
  - lưu response và đổi status sang `COMPLETED`.
- Nếu key đã tồn tại với cùng `requestHash` và `COMPLETED`:
  - trả lại response đã lưu.
- Nếu key đã tồn tại với cùng `requestHash` và `PROCESSING`:
  - trả `202 Processing` hoặc `409 Conflict`.
- Nếu key đã tồn tại nhưng `requestHash` khác:
  - trả `409 Conflict`.

### TTL đề xuất

- Redis: 15-30 phút.
- PostgreSQL: 24 giờ.

### Pseudo-code

```ts
async function withIdempotency(scope, userId, idempotencyKey, requestBody, handler) {
  const requestHash = hashJson(requestBody);
  const key = `${scope}:${userId}:${idempotencyKey}`;

  const existing = await findIdempotencyRecord(key);

  if (existing?.requestHash !== requestHash) {
    throw new IdempotencyConflictError();
  }

  if (existing?.status === 'COMPLETED') {
    return existing.responseBody;
  }

  if (existing?.status === 'PROCESSING') {
    throw new RequestAlreadyProcessingError();
  }

  await createIdempotencyRecord({
    key,
    userId,
    requestHash,
    status: 'PROCESSING',
    expiresAt: addHours(new Date(), 24)
  });

  try {
    const response = await handler();

    await completeIdempotencyRecord(key, {
      responseStatus: 200,
      responseBody: response
    });

    return response;
  } catch (error) {
    await failIdempotencyRecord(key);
    throw error;
  }
}
```

## Cache

### Chiến lược

TicketBox dùng **cache-aside** với Redis.

Luồng đọc:

1. API kiểm tra Redis.
2. Nếu cache hit, trả dữ liệu từ Redis.
3. Nếu cache miss, đọc PostgreSQL.
4. Ghi dữ liệu vào Redis với TTL.
5. Trả response.

Luồng ghi:

- Khi admin cập nhật concert/ticket type, invalidate cache liên quan.
- Khi tạo order thành công, invalidate hoặc cập nhật cache số vé còn lại.
- Khi order expired/payment failed trả vé, invalidate hoặc cập nhật cache số vé còn lại.

### Key Redis

```txt
cache:concert:list
cache:concert:{concertId}
cache:ticket-types:{concertId}
cache:ticket-type:{ticketTypeId}:remaining
```

### TTL đề xuất

```txt
cache:concert:list                 60 seconds
cache:concert:{concertId}           60 seconds
cache:ticket-types:{concertId}      10 seconds
cache:ticket-type:{ticketTypeId}:remaining 3-5 seconds
```

Concert info ít thay đổi nên có thể cache lâu hơn. Số vé còn lại thay đổi nhanh khi mở bán nên TTL ngắn hoặc invalidate chủ động.

### Invalidation

Khi admin cập nhật concert:

```txt
DEL cache:concert:list
DEL cache:concert:{concertId}
DEL cache:ticket-types:{concertId}
```

Khi tạo order thành công:

```txt
DEL cache:ticket-types:{concertId}
DEL cache:ticket-type:{ticketTypeId}:remaining
```

Khi order expired hoặc payment failed:

```txt
DEL cache:ticket-types:{concertId}
DEL cache:ticket-type:{ticketTypeId}:remaining
```

### Ràng buộc quan trọng

Cache chỉ dùng để hiển thị. Không được dùng giá trị cache để quyết định bán vé.

Quyết định bán vé phải đọc và lock dữ liệu trong PostgreSQL transaction.

## Chống oversell

### Vấn đề

Nhiều user có thể cùng mua những vé cuối cùng của một `TicketType`. Nếu chỉ đọc `remaining`, kiểm tra rồi update ở các request độc lập, hệ thống có thể bán vượt số lượng.

### Giải pháp

Dùng PostgreSQL transaction + row-level lock trên `TicketType`.

Trong transaction:

1. Lock dòng `TicketType` bằng `SELECT ... FOR UPDATE`.
2. Kiểm tra `remaining >= requestedQuantity`.
3. Lock hoặc tạo `UserTicketQuota`.
4. Kiểm tra per-user limit.
5. Tạo `Reservation`, `ReservationItem`, `Order`, `OrderItem`.
6. Giảm `TicketType.remaining`.
7. Tăng `UserTicketQuota.heldQuantity`.
8. Commit.

Nếu bất kỳ bước nào lỗi, rollback toàn bộ.

### Pseudo-code

```ts
await prisma.$transaction(async (tx) => {
  const ticketTypes = await tx.$queryRaw`
    SELECT *
    FROM ticket_types
    WHERE id IN (${ticketTypeIds})
    ORDER BY id ASC
    FOR UPDATE
  `;

  for (const item of requestedItems) {
    const ticketType = ticketTypes.find((type) => type.id === item.ticketTypeId);

    if (!ticketType || ticketType.status !== 'ACTIVE') {
      throw new TicketTypeUnavailableError();
    }

    if (ticketType.remaining < item.quantity) {
      throw new SoldOutError();
    }
  }

  const quotas = await lockOrCreateUserQuotas(tx, userId, requestedItems);

  for (const item of requestedItems) {
    const quota = quotas.find((q) => q.ticketTypeId === item.ticketTypeId);
    const ticketType = ticketTypes.find((type) => type.id === item.ticketTypeId);

    if (quota.heldQuantity + quota.paidQuantity + item.quantity > ticketType.maxPerUser) {
      throw new TicketLimitExceededError();
    }
  }

  const reservation = await createReservation(tx, userId, concertId, expiresAt);
  const order = await createOrder(tx, userId, concertId, reservation.id, idempotencyKey);

  for (const item of requestedItems) {
    await createReservationItem(tx, reservation.id, item);
    await createOrderItem(tx, order.id, item);

    await tx.ticketType.update({
      where: { id: item.ticketTypeId },
      data: { remaining: { decrement: item.quantity } }
    });

    await tx.userTicketQuota.update({
      where: {
        userId_ticketTypeId: {
          userId,
          ticketTypeId: item.ticketTypeId
        }
      },
      data: { heldQuantity: { increment: item.quantity } }
    });
  }

  return order;
});
```

### Deadlock avoidance

Nếu order có nhiều ticket type, phải lock theo thứ tự ổn định:

```txt
ORDER BY ticket_type.id ASC
```

Điều này giảm nguy cơ hai transaction lock cùng tập vé nhưng theo thứ tự ngược nhau.

## Per-user limit

### Vấn đề

User có thể gửi nhiều request đồng thời để vượt `maxPerUser`. Ví dụ SVIP giới hạn 2 vé/user, nhưng user gửi 3 request, mỗi request mua 1 vé.

### Giải pháp

Dùng `UserTicketQuota`:

```txt
heldQuantity
paidQuantity
```

Công thức kiểm tra:

```txt
heldQuantity + paidQuantity + requestedQuantity <= TicketType.maxPerUser
```

Trong đó:

- `heldQuantity`: vé đang giữ trong order chưa thanh toán.
- `paidQuantity`: vé đã thanh toán thành công.

### Khi tạo order

- Tăng `heldQuantity`.
- Giảm `TicketType.remaining`.

### Khi payment success

- Giảm `heldQuantity`.
- Tăng `paidQuantity`.

### Khi payment fail/order expired/cancelled

- Giảm `heldQuantity`.
- Tăng lại `TicketType.remaining`.
- Không thay đổi `paidQuantity`.

### Ràng buộc

Quota phải được lock trong cùng transaction với `TicketType`. Không được kiểm tra quota ở ngoài transaction rồi mới tạo order.

## Circuit breaker cho payment provider

Chi tiết nằm trong `payment.md`, phần này chỉ định Redis key và quan hệ với reliability tổng thể.

Redis key:

```txt
cb:payment:{provider}:state
cb:payment:{provider}:failure-count
cb:payment:{provider}:opened-at
```

Khi circuit `OPEN`:

- Không gọi provider đang lỗi.
- `POST /payments/create` trả lỗi provider unavailable.
- User có thể thử provider khác nếu order chưa hết hạn.
- Các API đọc concert, tạo concert, xem ticket không bị ảnh hưởng.

## Failure mode

### Redis lỗi

Hành vi:

- Cache miss toàn bộ, fallback đọc PostgreSQL.
- Rate limit có thể fail-open hoặc fail-closed tùy endpoint.
- Với `POST /orders`, nên fail-closed trong giờ mở bán lớn để bảo vệ DB.
- Với `GET /concerts`, fail-open và đọc DB.

Quan trọng:

- Dù Redis lỗi, hệ thống vẫn không oversell vì PostgreSQL transaction là lớp bảo vệ cuối.

### Database chậm

Hành vi:

- Cache giúp giảm tải endpoint đọc.
- Endpoint tạo order có timeout rõ ràng.
- Nếu transaction timeout, không tạo order và không giữ vé.
- Frontend có thể retry với cùng idempotency key.

### Request retry từ frontend

Hành vi:

- Retry `POST /orders` với cùng `Idempotency-Key` trả lại order cũ.
- Retry `POST /payments/create` với cùng `Idempotency-Key` trả lại payment request cũ.
- Retry webhook từ gateway không xử lý trùng vì `PaymentEvent` unique.

## Tiêu chí chấp nhận tuần 1

- Có file `blueprint/specs/cache-rate-limit.md`.
- Có mô tả rate limit bằng Redis và thuật toán Token Bucket.
- Có Redis key dự kiến cho order/payment rate limit.
- Có mô tả idempotency key cho `POST /orders` và `POST /payments/create`.
- Có Redis key và database field liên quan idempotency.
- Có mô tả cache-aside cho concert list/detail/ticket remaining.
- Có TTL đề xuất cho từng loại cache.
- Có mô tả transaction chống oversell bằng row-level lock.
- Có pseudo-code transaction tạo order.
- Có mô tả enforce per-user limit bằng `UserTicketQuota`.
- Có mô tả hành vi khi Redis lỗi, database chậm và request retry.

## Ghi chú cho tuần 2

- Implement Redis service dùng chung.
- Implement rate limit guard/interceptor cho `POST /orders` và `POST /payments/create`.
- Implement idempotency wrapper dùng Redis + `IdempotencyRecord`.
- Implement cache-aside cho concert list/detail.
- Implement transaction tạo order thật.
- Viết concurrency test cho oversell.
- Viết concurrency test cho per-user limit.
