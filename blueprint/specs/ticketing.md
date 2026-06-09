# Đặc tả: Ticketing

## Mô tả

Ticketing xử lý luồng mua vé từ lúc khán giả chọn loại vé đến khi hệ thống tạo order, giữ vé tạm thời, nhận kết quả thanh toán và phát hành e-ticket QR.

TicketBox chọn mô hình **temporary reservation**:

- Khi khán giả tạo order, hệ thống giữ vé trong một khoảng thời gian ngắn để người dùng thanh toán.
- Khi thanh toán thành công, vé giữ tạm thời được xác nhận thành vé đã bán và hệ thống sinh e-ticket QR.
- Khi thanh toán thất bại, bị hủy hoặc quá hạn, vé được trả lại kho.

Cơ chế nhất quán chính là **PostgreSQL transaction + row-level lock**. Redis được dùng để hỗ trợ rate limit, idempotency và cache, nhưng database vẫn là nguồn dữ liệu đúng cuối cùng.

## Actor và quyền truy cập

- Role `customer` (Khán giả) đã đăng nhập có quyền tạo order và thanh toán order của chính mình.
- Role `admin` (Ban tổ chức / Quản trị viên) không tạo order thay khán giả trong luồng public ticketing.
- Role `checker` (Nhân sự soát vé) không được truy cập API tạo order.

API ticketing cần kiểm tra JWT trước khi xử lý. User id lấy từ access token, không nhận `userId` từ request body để tránh giả mạo.

## Dữ liệu liên quan

Các model chính trong schema hiện tại:

- `Concert`: sự kiện được bán vé.
- `TicketType`: loại vé theo khu, gồm `totalQuantity`, `remaining`, `maxPerUser`, `saleStartAt`, `saleEndAt`, `status`.
- `Reservation`: lượt giữ vé tạm thời, có `status` và `expiresAt`.
- `ReservationItem`: chi tiết vé được giữ.
- `UserTicketQuota`: quota theo user và ticket type, gồm `heldQuantity`, `paidQuantity`.
- `Order`: đơn hàng, có `status`, `idempotencyKey`, `totalAmount`, `expiresAt`.
- `OrderItem`: chi tiết vé trong order.
- `PaymentEvent`: sự kiện thanh toán từ gateway.
- `Ticket`: vé điện tử sau khi order thanh toán thành công.
- `IdempotencyRecord`: chống xử lý trùng request.

## Trạng thái chính

### ReservationStatus

- `HELD`: vé đang được giữ để chờ thanh toán.
- `CONFIRMED`: vé giữ đã được xác nhận sau khi thanh toán thành công.
- `EXPIRED`: vé giữ đã quá hạn.
- `CANCELLED`: vé giữ bị hủy do payment fail hoặc user hủy.

### OrderStatus

- `PENDING_PAYMENT`: order đã tạo, đang chờ thanh toán.
- `PAYMENT_PROCESSING`: đã tạo payment request, chờ gateway trả kết quả.
- `PAID`: thanh toán thành công, ticket đã được phát hành.
- `PAYMENT_FAILED`: thanh toán thất bại.
- `EXPIRED`: quá thời hạn thanh toán.
- `CANCELLED`: bị hủy trước khi thanh toán.
- `REFUND_REQUIRED`: gateway báo thành công nhưng hệ thống không thể phát hành vé, cần xử lý hoàn tiền thủ công.

## API đề xuất

### POST /orders

Tạo order và giữ vé tạm thời.

Headers:

```http
Authorization: Bearer <access_token>
Idempotency-Key: <unique_key>
```

Request body:

```json
{
  "concertId": "uuid",
  "items": [
    {
      "ticketTypeId": "uuid",
      "quantity": 2
    }
  ]
}
```

Response success:

```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "status": "PENDING_PAYMENT",
    "totalAmount": 3600000,
    "expiresAt": "2026-06-05T10:15:00.000Z",
    "items": [
      {
        "ticketTypeId": "uuid",
        "name": "SVIP",
        "quantity": 2,
        "unitPrice": 1800000
      }
    ]
  },
  "message": "Order created"
}
```

Response lỗi sold out:

```json
{
  "success": false,
  "data": {
    "ticketTypeId": "uuid",
    "availableQuantity": 1
  },
  "message": "Not enough tickets available"
}
```

Response lỗi vượt giới hạn:

```json
{
  "success": false,
  "data": {
    "ticketTypeId": "uuid",
    "maxPerUser": 2,
    "currentHeldQuantity": 1,
    "currentPaidQuantity": 1,
    "requestedQuantity": 1
  },
  "message": "Ticket limit exceeded"
}
```

### GET /orders/:id

Lấy trạng thái order để frontend hiển thị checkout/payment result.

### POST /orders/:id/cancel

Hủy order khi user chưa thanh toán. API này trả vé lại kho và chuyển order sang `CANCELLED`.

## Luồng chính: chọn vé -> tạo order -> payment -> generate ticket QR

1. Khán giả mở trang chi tiết concert và chọn ticket type trên seat map.
2. Frontend gọi `POST /orders` với `Idempotency-Key`.
3. Backend xác thực user và kiểm tra rate limit.
4. Backend kiểm tra idempotency:
   - Nếu key đã hoàn tất với cùng request hash, trả lại response cũ.
   - Nếu key đang xử lý, trả `409 Conflict` hoặc `202 Processing`.
   - Nếu key đã dùng cho request body khác, trả `409 Conflict`.
5. Backend mở PostgreSQL transaction.
6. Backend lock các dòng `TicketType` liên quan bằng row-level lock.
7. Backend kiểm tra concert và ticket type:
   - concert phải `PUBLISHED`.
   - ticket type phải `ACTIVE`.
   - thời gian hiện tại nằm trong `saleStartAt` và `saleEndAt` nếu có cấu hình.
8. Backend kiểm tra số vé còn lại:
   - `TicketType.remaining >= requestedQuantity`.
9. Backend lock hoặc upsert `UserTicketQuota`.
10. Backend kiểm tra giới hạn per-user:
    - `heldQuantity + paidQuantity + requestedQuantity <= TicketType.maxPerUser`.
11. Backend tạo `Reservation` trạng thái `HELD`, `expiresAt = now + 10 minutes`.
12. Backend tạo `ReservationItem`.
13. Backend tạo `Order` trạng thái `PENDING_PAYMENT`.
14. Backend tạo `OrderItem`.
15. Backend cập nhật:
    - giảm `TicketType.remaining`.
    - tăng `UserTicketQuota.heldQuantity`.
16. Backend commit transaction.
17. Frontend chuyển user sang bước thanh toán.
18. Khi payment success, PaymentsModule xử lý webhook trong transaction:
    - kiểm tra payment event chưa từng xử lý.
    - đổi `Order.status` sang `PAID`.
    - đổi `Reservation.status` sang `CONFIRMED`.
    - giảm `UserTicketQuota.heldQuantity`.
    - tăng `UserTicketQuota.paidQuantity`.
    - sinh `Ticket` theo số lượng trong `OrderItem`.
    - tạo `ticketCode` và `qrPayload` signed.
19. Backend trả kết quả để frontend hiển thị e-ticket QR.

## Luồng lỗi

### Sold out

Điều kiện:

- `TicketType.remaining < requestedQuantity`.

Hành vi:

- Không tạo reservation.
- Không tạo order.
- Không thay đổi quota.
- Trả lỗi `409 Conflict`.

Thông điệp đề xuất:

```txt
Not enough tickets available
```

### Vượt giới hạn vé per-user

Điều kiện:

```txt
heldQuantity + paidQuantity + requestedQuantity > maxPerUser
```

Hành vi:

- Không tạo reservation.
- Không tạo order.
- Không trừ `remaining`.
- Trả lỗi `409 Conflict`.

Lưu ý:

- Phải tính cả vé đã thanh toán và vé đang giữ.
- Không được chỉ tính order hiện tại, vì user có thể tạo nhiều order nhỏ để lách giới hạn.

### Order hết hạn

Điều kiện:

- `Order.status = PENDING_PAYMENT`.
- `Order.expiresAt < now`.

Hành vi của background job:

1. Tìm order quá hạn.
2. Mở transaction.
3. Lock order/reservation liên quan.
4. Đổi `Order.status` sang `EXPIRED`.
5. Đổi `Reservation.status` sang `EXPIRED`.
6. Tăng lại `TicketType.remaining`.
7. Giảm `UserTicketQuota.heldQuantity`.

Job nên chạy định kỳ, ví dụ mỗi 30 giây hoặc 1 phút.

### Payment fail

Điều kiện:

- Gateway webhook báo thất bại.
- Hoặc user hủy thanh toán.

Hành vi:

- Đổi `Order.status` sang `PAYMENT_FAILED` hoặc `CANCELLED`.
- Đổi `Reservation.status` sang `CANCELLED`.
- Tăng lại `TicketType.remaining`.
- Giảm `UserTicketQuota.heldQuantity`.
- Không sinh ticket.

### Payment timeout

Điều kiện:

- Gateway không trả kết quả trong thời gian giữ vé.

Hành vi:

- Nếu chưa có webhook success trước `expiresAt`, order được chuyển sang `EXPIRED`.
- Nếu webhook success đến sau khi order đã expired:
  - Không phát hành ticket tự động.
  - Chuyển order sang `REFUND_REQUIRED` hoặc ghi nhận payment event để xử lý hoàn tiền.

### Request trùng do user bấm nhiều lần

Điều kiện:

- Cùng `Idempotency-Key` và cùng request body.

Hành vi:

- Không tạo order mới.
- Trả lại response đã lưu trong `IdempotencyRecord`.

Điều kiện:

- Cùng `Idempotency-Key` nhưng request body khác.

Hành vi:

- Trả `409 Conflict`.
- Không xử lý request mới.

## Cơ chế chống oversell

Không được kiểm tra số vé còn lại rồi update ở hai câu lệnh độc lập ngoài transaction.

Pseudo-code:

```ts
await prisma.$transaction(async (tx) => {
  const ticketType = await tx.$queryRaw`
    SELECT * FROM ticket_types
    WHERE id = ${ticketTypeId}
    FOR UPDATE
  `;

  if (ticketType.remaining < requestedQuantity) {
    throw new SoldOutError();
  }

  const quota = await lockOrCreateUserTicketQuota(tx, userId, ticketTypeId);

  if (quota.heldQuantity + quota.paidQuantity + requestedQuantity > ticketType.maxPerUser) {
    throw new TicketLimitExceededError();
  }

  await createReservationAndOrder(tx);

  await tx.ticketType.update({
    where: { id: ticketTypeId },
    data: { remaining: { decrement: requestedQuantity } }
  });

  await tx.userTicketQuota.update({
    where: { userId_ticketTypeId: { userId, ticketTypeId } },
    data: { heldQuantity: { increment: requestedQuantity } }
  });
});
```

Nếu một order có nhiều ticket type, backend cần lock theo thứ tự tăng dần của `ticketTypeId` để giảm nguy cơ deadlock.

## Idempotency

Mọi request tạo order phải có `Idempotency-Key`.

Redis key đề xuất:

```txt
idem:orders:{userId}:{idempotencyKey}
```

Database record:

```txt
IdempotencyRecord.key
IdempotencyRecord.userId
IdempotencyRecord.requestHash
IdempotencyRecord.status
IdempotencyRecord.responseStatus
IdempotencyRecord.responseBody
IdempotencyRecord.expiresAt
```

TTL đề xuất:

- Redis: 15 phút đến 30 phút.
- Database: giữ 24 giờ để phục vụ retry và đối soát lỗi.

## Rate limit liên quan ticketing

Ticketing API cần rate limit theo user và IP.

Redis key đề xuất:

```txt
rate:orders:user:{userId}
rate:orders:ip:{ip}
```

Ngưỡng tuần 1 đề xuất:

- User: tối đa 5 request tạo order/phút.
- IP: tối đa 60 request tạo order/phút.

Khi vượt ngưỡng, API trả `429 Too Many Requests`.

## Cache liên quan ticketing

Trang concert detail có thể cache thông tin concert và ticket type, nhưng số vé còn lại cần TTL ngắn hoặc invalidate chủ động.

Redis key đề xuất:

```txt
cache:concert:list
cache:concert:{concertId}
cache:ticket-types:{concertId}
```

TTL đề xuất:

- Concert list: 60 giây.
- Concert detail: 60 giây.
- Ticket remaining: 3-5 giây, hoặc invalidate sau mỗi order thành công.

Nguồn đúng cuối cùng vẫn là PostgreSQL. Cache không được dùng để quyết định bán vé nếu không kiểm tra lại trong transaction.

## Ràng buộc

- Một vé chỉ được phát hành sau khi order đã `PAID`.
- Một payment success webhook không được sinh ticket hai lần.
- Một user không được vượt `TicketType.maxPerUser`.
- Không được oversell dù nhiều request đồng thời cùng mua vé cuối.
- Order chưa thanh toán phải có `expiresAt`.
- Khi order hết hạn hoặc payment fail, vé giữ phải được trả lại.
- QR payload phải được ký để tránh giả mạo.