# Đặc tả: Payment

## Mô tả

Payment xử lý bước thanh toán cho order đã được tạo bởi Ticketing flow. Trong tuần 1, hệ thống chỉ cần mock thanh toán qua VNPAY/MoMo, nhưng thiết kế phải đủ rõ để tuần 2 triển khai luồng payment thật ở mức nội bộ.

Mục tiêu chính:

- Tạo payment request cho order đang chờ thanh toán.
- Nhận webhook success/fail/timeout từ payment gateway mock.
- Đảm bảo một order không bị trừ tiền hoặc xử lý thành công hai lần.
- Khi gateway lỗi kéo dài, hệ thống payment degrade có kiểm soát và không kéo sập các chức năng khác.

Payment không chịu trách nhiệm giữ vé. Vé đã được giữ ở `Reservation` khi tạo order. Payment chỉ xác nhận kết quả thanh toán và kích hoạt phát hành ticket khi thành công.

## Actor và quyền truy cập

- Role `customer` (Khán giả) đã đăng nhập được tạo payment cho order của chính mình.
- Backend nhận webhook từ payment gateway qua endpoint public có kiểm tra chữ ký hoặc secret.
- Role `admin` (Ban tổ chức) chỉ xem thống kê payment, không can thiệp trực tiếp vào luồng thanh toán của user.
- Role `checker` (Nhân sự soát vé) không có quyền truy cập payment API.

## Dữ liệu liên quan

Các model chính:

- `Order`: lưu trạng thái đơn hàng, tổng tiền, phương thức thanh toán, mã tham chiếu payment.
- `PaymentEvent`: lưu mọi event từ gateway, gồm gateway, transaction id, event type, raw payload, trạng thái chữ ký và thời điểm xử lý.
- `IdempotencyRecord`: lưu request idempotency để chống tạo payment trùng hoặc xử lý trùng.
- `Reservation`: giữ vé tạm thời trong lúc user thanh toán.
- `Ticket`: được sinh sau khi payment success và order chuyển sang `PAID`.
- `Notification`: dùng ở bước sau để gửi xác nhận mua vé thành công.

Trạng thái `OrderStatus` liên quan:

- `PENDING_PAYMENT`: order đã tạo, chưa tạo payment request hoặc đang chờ user chọn phương thức.
- `PAYMENT_PROCESSING`: payment request đã được tạo, đang chờ gateway trả kết quả.
- `PAID`: gateway báo thành công, ticket đã phát hành.
- `PAYMENT_FAILED`: gateway báo thất bại.
- `EXPIRED`: order quá hạn thanh toán.
- `CANCELLED`: user hủy trước khi thanh toán.
- `REFUND_REQUIRED`: gateway báo thành công nhưng order không còn hợp lệ để phát hành vé.

## API đề xuất

### POST /payments/create

Tạo payment request mock cho order.

Headers:

```http
Authorization: Bearer <access_token>
Idempotency-Key: <unique_key>
```

Request body:

```json
{
  "orderId": "uuid",
  "provider": "VNPAY",
  "returnUrl": "https://ticketbox.local/checkout/result"
}
```

Response success:

```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "paymentRef": "PAY-20260605-000001",
    "provider": "VNPAY",
    "status": "PAYMENT_PROCESSING",
    "amount": 3600000,
    "paymentUrl": "https://mock-payment.ticketbox.local/vnpay/pay?ref=PAY-20260605-000001",
    "expiresAt": "2026-06-05T10:15:00.000Z"
  },
  "message": "Payment request created"
}
```

Response khi order không hợp lệ:

```json
{
  "success": false,
  "data": {
    "orderId": "uuid",
    "status": "EXPIRED"
  },
  "message": "Order is not payable"
}
```

### POST /payments/webhooks/:provider

Nhận webhook mock từ VNPAY/MoMo.

Request body mock:

```json
{
  "paymentRef": "PAY-20260605-000001",
  "gatewayTransactionId": "VNPAY-TXN-123",
  "eventType": "SUCCESS",
  "amount": 3600000,
  "occurredAt": "2026-06-05T10:08:00.000Z",
  "signature": "mock-signature"
}
```

Event type tuần 1:

- `SUCCESS`
- `FAILED`
- `TIMEOUT`

Response:

```json
{
  "success": true,
  "data": {
    "processed": true,
    "orderStatus": "PAID"
  },
  "message": "Webhook processed"
}
```

### GET /payments/:paymentRef/status

API tùy chọn cho frontend polling trạng thái thanh toán khi chưa nhận được redirect hoặc webhook.

## Luồng chính: tạo payment request

1. Frontend gọi `POST /payments/create` sau khi order đã được tạo.
2. Backend xác thực user từ JWT.
3. Backend kiểm tra rate limit và idempotency key.
4. Backend tìm order theo `orderId`.
5. Backend kiểm tra order thuộc user hiện tại.
6. Backend kiểm tra order có thể thanh toán:
   - `status` là `PENDING_PAYMENT` hoặc `PAYMENT_PROCESSING`.
   - `expiresAt` lớn hơn thời điểm hiện tại.
   - `totalAmount` lớn hơn 0.
7. Backend kiểm tra circuit breaker của provider:
   - Nếu provider đang `OPEN`, trả lỗi payment gateway unavailable.
   - Nếu `HALF_OPEN`, cho phép một số request thử.
8. Backend tạo `paymentRef` nếu order chưa có.
9. Backend cập nhật:
   - `Order.status = PAYMENT_PROCESSING`.
   - `Order.paymentMethod = provider`.
   - `Order.paymentRef = generatedRef`.
10. Backend trả `paymentUrl` mock cho frontend.
11. Frontend chuyển user đến trang thanh toán mock hoặc hiển thị nút mô phỏng success/fail.

## Luồng webhook success

1. Gateway mock gửi `POST /payments/webhooks/:provider` với `eventType = SUCCESS`.
2. Backend kiểm tra provider hợp lệ.
3. Backend kiểm tra chữ ký mock hoặc shared secret.
4. Backend tạo `PaymentEvent` với unique key:

```txt
gateway + gatewayTransactionId + eventType
```

5. Nếu event đã tồn tại và đã xử lý, backend trả success nhưng không xử lý lại.
6. Backend mở transaction.
7. Backend lock order theo `paymentRef`.
8. Nếu order đã `PAID`, trả success idempotent.
9. Nếu order đã `EXPIRED` hoặc `CANCELLED`, ghi nhận event và chuyển order sang `REFUND_REQUIRED`.
10. Nếu order đang `PENDING_PAYMENT` hoặc `PAYMENT_PROCESSING`:
    - kiểm tra amount khớp với `Order.totalAmount`.
    - đổi `Order.status = PAID`.
    - set `Order.paidAt = now`.
    - đổi `Reservation.status = CONFIRMED`.
    - cập nhật `UserTicketQuota`: giảm `heldQuantity`, tăng `paidQuantity`.
    - sinh `Ticket` theo từng `OrderItem`.
    - tạo `ticketCode` và `qrPayload`.
11. Mark `PaymentEvent.processedAt = now`.
12. Commit transaction.
13. Đẩy notification xác nhận mua vé vào hàng đợi gửi sau.

## Luồng webhook failed

1. Gateway mock gửi `eventType = FAILED`.
2. Backend kiểm tra chữ ký và lưu `PaymentEvent`.
3. Backend lock order trong transaction.
4. Nếu order đã `PAID`, không rollback ticket; ghi log bất thường để đối soát.
5. Nếu order đang `PENDING_PAYMENT` hoặc `PAYMENT_PROCESSING`:
   - đổi `Order.status = PAYMENT_FAILED`.
   - đổi `Reservation.status = CANCELLED`.
   - trả vé lại bằng cách tăng `TicketType.remaining`.
   - giảm `UserTicketQuota.heldQuantity`.
6. Mark event đã xử lý.

## Luồng timeout

Timeout có thể xảy ra ở hai nơi:

- User bị timeout khi redirect sang gateway.
- Gateway không gửi webhook trước khi order hết hạn.

Hành vi:

- `POST /payments/create` timeout phía client không được tạo payment trùng nếu retry cùng `Idempotency-Key`.
- Nếu gateway không phản hồi, order vẫn giữ trạng thái `PAYMENT_PROCESSING` cho đến khi hết `expiresAt`.
- Background job của ticketing xử lý order hết hạn:
  - đổi `Order.status = EXPIRED`.
  - đổi `Reservation.status = EXPIRED`.
  - trả lại `TicketType.remaining`.
  - giảm `UserTicketQuota.heldQuantity`.
- Nếu webhook success đến sau khi order expired:
  - không sinh ticket tự động.
  - chuyển order sang `REFUND_REQUIRED`.
  - ghi `PaymentEvent` để đối soát.

## Chống trừ tiền hai lần

Payment cần chống trùng ở ba lớp:

### 1. Idempotency cho POST /payments/create

Redis key:

```txt
idem:payments:create:{userId}:{idempotencyKey}
```

Quy tắc:

- Cùng key + cùng request hash: trả lại response cũ.
- Cùng key + request hash khác: trả `409 Conflict`.
- Key đang xử lý: trả `202 Processing` hoặc `409 Conflict`.

TTL đề xuất:

- Redis: 15-30 phút.
- Database `IdempotencyRecord`: 24 giờ.

### 2. Một order chỉ có một paymentRef active

`Order.paymentRef` là unique. Nếu user gọi `POST /payments/create` nhiều lần cho cùng order:

- Nếu order đã có `paymentRef`, backend trả lại payment info cũ.
- Không tạo thêm payment transaction mới khi order còn trong thời gian thanh toán.

### 3. Webhook idempotency

`PaymentEvent` có unique constraint:

```txt
gateway + gatewayTransactionId + eventType
```

Webhook trùng phải trả success nhưng không xử lý lại. Đặc biệt, event success trùng không được sinh thêm ticket.

## Circuit breaker

Payment gateway là hệ thống ngoài nên phải được cô lập lỗi bằng circuit breaker.

### Trạng thái

- `CLOSED`: gateway hoạt động bình thường.
- `OPEN`: gateway lỗi liên tục, backend tạm ngưng gọi gateway.
- `HALF_OPEN`: sau một khoảng nghỉ, backend cho phép một số request thử.

### Ngưỡng đề xuất tuần 1

- Mở circuit nếu có 5 lỗi liên tiếp hoặc tỷ lệ lỗi trên 50% trong 1 phút.
- Giữ trạng thái `OPEN` trong 60 giây.
- Ở `HALF_OPEN`, cho phép 3 request thử:
  - Nếu thành công, chuyển về `CLOSED`.
  - Nếu lỗi, quay lại `OPEN`.

Redis key đề xuất:

```txt
cb:payment:{provider}:state
cb:payment:{provider}:failure-count
cb:payment:{provider}:opened-at
```

Hành vi khi circuit `OPEN`:

```json
{
  "success": false,
  "data": {
    "provider": "VNPAY",
    "retryAfterSeconds": 60
  },
  "message": "Payment provider is temporarily unavailable"
}
```

Graceful degradation:

- Trang danh sách concert và chi tiết concert vẫn hoạt động.
- User vẫn xem được số vé còn lại.
- Không tạo payment request mới tới provider đang lỗi.
- Nếu order đã giữ vé, user có thể thử lại với provider khác nếu còn trong `expiresAt`.

## Payment mock cho tuần 1

Mock provider cần hỗ trợ ba kết quả:

- Success: giả lập gateway trả webhook `SUCCESS`.
- Fail: giả lập gateway trả webhook `FAILED`.
- Timeout: không gửi webhook, để order hết hạn theo job.

Payment URL mock có thể là URL frontend nội bộ:

```txt
/mock-payment?provider=VNPAY&paymentRef=PAY-...
```

Trang mock-payment cho phép bấm:

- Pay success.
- Pay failed.
- Simulate timeout.

Nếu frontend chưa có trang mock-payment, backend vẫn có thể trả `paymentUrl` giả để C nối UI sau.

## Pseudo-code xử lý create payment

```ts
async function createPayment(userId, dto, idempotencyKey) {
  return withIdempotency(userId, idempotencyKey, dto, async () => {
    if (await circuitBreaker.isOpen(dto.provider)) {
      throw new PaymentProviderUnavailableError();
    }

    return prisma.$transaction(async (tx) => {
      const order = await lockOrder(tx, dto.orderId);

      if (order.userId !== userId) {
        throw new ForbiddenError();
      }

      if (!['PENDING_PAYMENT', 'PAYMENT_PROCESSING'].includes(order.status)) {
        throw new OrderNotPayableError();
      }

      if (order.expiresAt <= new Date()) {
        throw new OrderExpiredError();
      }

      const paymentRef = order.paymentRef ?? generatePaymentRef();

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAYMENT_PROCESSING',
          paymentMethod: dto.provider,
          paymentRef
        }
      });

      return buildMockPaymentResponse(updatedOrder, dto.provider);
    });
  });
}
```

## Pseudo-code xử lý webhook success

```ts
async function handleSuccessWebhook(provider, payload) {
  await verifySignature(provider, payload);

  return prisma.$transaction(async (tx) => {
    const event = await createPaymentEventIfNotExists(tx, provider, payload);

    if (event.processedAt) {
      return { processed: false, reason: 'duplicate_event' };
    }

    const order = await lockOrderByPaymentRef(tx, payload.paymentRef);

    if (order.status === 'PAID') {
      await markEventProcessed(tx, event.id);
      return { processed: false, reason: 'order_already_paid' };
    }

    if (order.status === 'EXPIRED' || order.status === 'CANCELLED') {
      await markRefundRequired(tx, order.id);
      await markEventProcessed(tx, event.id);
      return { processed: true, orderStatus: 'REFUND_REQUIRED' };
    }

    if (payload.amount !== order.totalAmount) {
      throw new InvalidPaymentAmountError();
    }

    await confirmReservation(tx, order.reservationId);
    await moveQuotaHeldToPaid(tx, order.items);
    await generateTickets(tx, order);
    await markOrderPaid(tx, order.id);
    await markEventProcessed(tx, event.id);

    return { processed: true, orderStatus: 'PAID' };
  });
}
```

## Ràng buộc

- Không tạo payment cho order không thuộc user hiện tại.
- Không tạo payment cho order đã hết hạn.
- Không tạo nhiều `paymentRef` active cho cùng một order.
- Webhook success lặp lại không được sinh ticket lần hai.
- Webhook fail đến sau khi order đã paid không được tự động hủy ticket.
- Amount trong webhook phải khớp `Order.totalAmount`.
- Payment provider lỗi không được làm ảnh hưởng API xem concert.
- Order expired nhưng nhận success muộn phải chuyển sang `REFUND_REQUIRED`, không phát hành vé tự động.
