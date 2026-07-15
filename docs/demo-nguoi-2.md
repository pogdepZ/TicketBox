# KỊCH BẢN DEMO NGƯỜI 2 — PAYMENT VÀ HẠ TẦNG BACKEND

Tài liệu này dùng cho PowerShell trên Windows, chạy từ thư mục gốc repository.

> Thời lượng đề xuất: 12–15 phút. Luồng chính nên demo: webhook thành công → gửi lặp → webhook đến trễ → rate limit → cache → outbox/worker/email. Circuit breaker là phần dự phòng vì cần làm gateway lỗi thật.

## 0. Những điểm phải nói đúng với code hiện tại

- Base URL mặc định trong tài liệu payment là `http://localhost:3001`. Nếu API của bạn in ra port khác khi start, sửa `$BASE_URL`.
- Endpoint webhook đúng là `/payments/webhooks/:provider` (có chữ `s`).
- Endpoint dev tự ký webhook là `/payments/webhooks/mock-trigger`.
- `eventType` hợp lệ: `SUCCESS`, `FAILED`, `TIMEOUT`, `CANCELLED`.
- Webhook không dùng `orderId` trực tiếp; nó tìm order qua `paymentRef`.
- Khóa idempotency của event là `(gateway, gatewayTransactionId, eventType)`.
- Rate limit tạo order: 5 request trong 300 giây trên mỗi user; admin được bypass.
- Circuit breaker: 5 lỗi trong 60 giây, mở 30 giây.
- Outbox retry mỗi 5 giây, tối đa 5 lần.
- MailHog UI: `http://localhost:8025`.

## 1. Chuẩn bị trước buổi demo

### 1.1. Terminal 1 — hạ tầng

```powershell
docker compose up -d
docker compose ps
```

Phải thấy PostgreSQL, Redis, MailHog và MinIO đang chạy.

### 1.2. Terminal 2 — API

Chạy chế độ dev để endpoint `mock-trigger` được phép hoạt động:

```powershell
pnpm --filter @repo/be dev:api
```

### 1.3. Terminal 3 — worker

```powershell
pnpm --filter @repo/be dev:worker
```

Giữ terminal này trên màn hình để chỉ log `payment.completed` và `send-single`.

### 1.4. Terminal 4 — Prisma Studio (tùy chọn)

```powershell
pnpm --filter @repo/be migrate:studio
```

Hoặc dùng các câu SQL trong tài liệu để kết quả dễ lặp lại hơn.

### 1.5. Kiểm tra nhanh

```powershell
$BASE_URL = "http://localhost:3001"
curl.exe -s "$BASE_URL/health"
docker exec ticketbox-redis redis-cli PING
```

Kết quả mong đợi: API trả `ok`, Redis trả `PONG`.

## 2. Biến dùng xuyên suốt

Đăng nhập bằng customer đã có dữ liệu/order. Thay email và mật khẩu nếu seed của bạn dùng tài khoản khác.

```powershell
$BASE_URL = "http://localhost:3001"
$CUSTOMER_EMAIL = "customer@ticketbox.vn"
$CUSTOMER_PASSWORD = "password123"

$loginBody = @{
  email = $CUSTOMER_EMAIL
  password = $CUSTOMER_PASSWORD
} | ConvertTo-Json

$login = Invoke-RestMethod `
  -Method Post `
  -Uri "$BASE_URL/auth/login" `
  -ContentType "application/json" `
  -Body $loginBody

$TOKEN = $login.data.accessToken
$AUTH = @{ Authorization = "Bearer $TOKEN" }
```

Kiểm tra token:

```powershell
Invoke-RestMethod -Method Get -Uri "$BASE_URL/auth/profile" -Headers $AUTH
```

### 2.1. Lấy order đang chờ thanh toán

Mở Prisma Studio, bảng `Order`, chọn một order `PENDING_PAYMENT`. Hoặc chạy:

```powershell
docker exec nest-prisma-postgres psql -U postgres -d nest_prisma_db -c "SELECT id, status, total_amount, payment_ref, expires_at FROM orders WHERE status = 'PENDING_PAYMENT' ORDER BY created_at DESC LIMIT 5;"
```

Gán ID và tạo payment nếu order chưa có `paymentRef`:

```powershell
$ORDER_ID = "<DAN_ORDER_ID_VAO_DAY>"

$paymentBody = @{
  orderId = $ORDER_ID
  provider = "VNPAY"
} | ConvertTo-Json

$paymentHeaders = @{
  Authorization = "Bearer $TOKEN"
  "Idempotency-Key" = "demo-payment-$ORDER_ID"
}

$payment = Invoke-RestMethod `
  -Method Post `
  -Uri "$BASE_URL/payments/create" `
  -Headers $paymentHeaders `
  -ContentType "application/json" `
  -Body $paymentBody

$PAYMENT_REF = $payment.data.paymentRef
$AMOUNT = [decimal]$payment.data.totalAmount
$PAYMENT_REF
$AMOUNT
```

Nếu interceptor của bản đang chạy không bọc `data`, dùng:

```powershell
$PAYMENT_REF = $payment.paymentRef
$AMOUNT = [decimal]$payment.totalAmount
```

## 3. Demo webhook idempotency

### 3.1. Lời dẫn

> “Payment gateway có thể gửi cùng một webhook nhiều lần nếu chưa nhận được phản hồi. Backend phải cho phép retry nhưng không được phát hành vé hoặc cập nhật quota hai lần.”

### 3.2. Chụp trạng thái trước webhook

```powershell
docker exec nest-prisma-postgres psql -U postgres -d nest_prisma_db -c "SELECT id, status, payment_ref, paid_at FROM orders WHERE id = '$ORDER_ID';"
docker exec nest-prisma-postgres psql -U postgres -d nest_prisma_db -c "SELECT COUNT(*) AS ticket_count FROM tickets WHERE order_id = '$ORDER_ID';"
docker exec nest-prisma-postgres psql -U postgres -d nest_prisma_db -c "SELECT gateway, gateway_transaction_id, event_type, status FROM payment_events WHERE order_id = '$ORDER_ID';"
```

Mong đợi: order `PENDING_PAYMENT`, `ticket_count = 0`.

### 3.3. Gửi webhook SUCCESS lần đầu

```powershell
$TXN_ID = "TXN-DEMO-" + (Get-Date -Format "yyyyMMddHHmmss")

$webhookBody = @{
  provider = "VNPAY"
  paymentRef = $PAYMENT_REF
  gatewayTransactionId = $TXN_ID
  eventType = "SUCCESS"
  amount = $AMOUNT
} | ConvertTo-Json

$first = Invoke-RestMethod `
  -Method Post `
  -Uri "$BASE_URL/payments/webhooks/mock-trigger" `
  -ContentType "application/json" `
  -Body $webhookBody

$first | ConvertTo-Json -Depth 10
```

Mong đợi: `processed = true`, `orderStatus = PAID`, `paymentStatus = SUCCEEDED`.

### 3.4. Kiểm tra DB sau lần đầu

```powershell
docker exec nest-prisma-postgres psql -U postgres -d nest_prisma_db -c "SELECT id, status, payment_ref, paid_at FROM orders WHERE id = '$ORDER_ID';"
docker exec nest-prisma-postgres psql -U postgres -d nest_prisma_db -c "SELECT COUNT(*) AS ticket_count FROM tickets WHERE order_id = '$ORDER_ID';"
docker exec nest-prisma-postgres psql -U postgres -d nest_prisma_db -c "SELECT gateway, gateway_transaction_id, event_type, status, processed_at FROM payment_events WHERE order_id = '$ORDER_ID';"
docker exec nest-prisma-postgres psql -U postgres -d nest_prisma_db -c "SELECT queue_name, job_name, status, retry_count FROM outbox_messages WHERE payload->>'orderId' = '$ORDER_ID' ORDER BY created_at;"
```

Chỉ ra order đã `PAID`, có đúng số ticket theo order, payment event là `PROCESSED`.

### 3.5. Gửi lại y hệt lần hai

```powershell
$second = Invoke-RestMethod `
  -Method Post `
  -Uri "$BASE_URL/payments/webhooks/mock-trigger" `
  -ContentType "application/json" `
  -Body $webhookBody

$second | ConvertTo-Json -Depth 10
```

Chạy lại hai truy vấn đếm:

```powershell
docker exec nest-prisma-postgres psql -U postgres -d nest_prisma_db -c "SELECT COUNT(*) AS ticket_count FROM tickets WHERE order_id = '$ORDER_ID';"
docker exec nest-prisma-postgres psql -U postgres -d nest_prisma_db -c "SELECT COUNT(*) AS event_count FROM payment_events WHERE order_id = '$ORDER_ID' AND gateway_transaction_id = '$TXN_ID' AND event_type = 'SUCCESS';"
```

Mong đợi: số ticket không đổi, `event_count = 1`.

### 3.6. Lời kết

> “Database có unique constraint trên gateway, transaction ID và event type. Service còn dùng trạng thái PROCESSING/PROCESSED và khóa order bằng FOR UPDATE, nên cả retry tuần tự lẫn webhook đồng thời đều không tạo side effect lần hai.”

## 4. Demo webhook thanh toán đến trễ

### 4.1. Chuẩn bị một order riêng

Chọn một order `PENDING_PAYMENT` khác đã có `payment_ref`, rồi gán:

```powershell
$EXPIRED_ORDER_ID = "<DAN_EXPIRED_ORDER_ID>"
```

Update DB có chủ đích để mô phỏng job expiration đã chạy:

```powershell
docker exec nest-prisma-postgres psql -U postgres -d nest_prisma_db -c "UPDATE orders SET status = 'EXPIRED', expires_at = NOW() - INTERVAL '5 minutes' WHERE id = '$EXPIRED_ORDER_ID'; SELECT id, status, payment_ref, total_amount, expires_at FROM orders WHERE id = '$EXPIRED_ORDER_ID';"
```

Lấy `payment_ref` và amount từ kết quả, rồi gán:

```powershell
$EXPIRED_PAYMENT_REF = "<PAYMENT_REF>"
$EXPIRED_AMOUNT = <TOTAL_AMOUNT>
```

### 4.2. Gửi SUCCESS đến order đã EXPIRED

```powershell
$lateBody = @{
  provider = "VNPAY"
  paymentRef = $EXPIRED_PAYMENT_REF
  gatewayTransactionId = "TXN-LATE-" + (Get-Date -Format "yyyyMMddHHmmss")
  eventType = "SUCCESS"
  amount = $EXPIRED_AMOUNT
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "$BASE_URL/payments/webhooks/mock-trigger" `
  -ContentType "application/json" `
  -Body $lateBody | ConvertTo-Json -Depth 10
```

Kiểm tra:

```powershell
docker exec nest-prisma-postgres psql -U postgres -d nest_prisma_db -c "SELECT id, status, paid_at FROM orders WHERE id = '$EXPIRED_ORDER_ID';"
docker exec nest-prisma-postgres psql -U postgres -d nest_prisma_db -c "SELECT COUNT(*) AS ticket_count FROM tickets WHERE order_id = '$EXPIRED_ORDER_ID';"
```

Mong đợi: order thành `REFUND_REQUIRED`, không phát hành ticket.

### 4.3. Lời nói

> “Hệ thống không hồi sinh reservation đã hết hạn. Tiền đến sau hạn được đánh dấu REFUND_REQUIRED để xử lý hoàn tiền, và không có vé không hợp lệ nào được phát hành.”

## 5. Demo rate limit

### 5.1. Reset bucket để kết quả lặp lại được

Lấy user ID từ profile hoặc DB:

```powershell
$USER_ID = $login.data.user.id
docker exec ticketbox-redis redis-cli DEL "order-rate:$USER_ID"
```

Chuẩn bị một body tạo order hợp lệ. Thay hai ID:

```powershell
$CONCERT_ID = "<CONCERT_ID>"
$TICKET_TYPE_ID = "<TICKET_TYPE_ID>"

$orderBody = @{
  concertId = $CONCERT_ID
  items = @(
    @{
      ticketTypeId = $TICKET_TYPE_ID
      quantity = 1
    }
  )
} | ConvertTo-Json -Depth 5
```

### 5.2. Gửi 6 request với idempotency key khác nhau

```powershell
1..6 | ForEach-Object {
  $headers = @{
    Authorization = "Bearer $TOKEN"
    "Idempotency-Key" = "rate-demo-$([guid]::NewGuid())"
  }

  try {
    $response = Invoke-WebRequest `
      -Method Post `
      -Uri "$BASE_URL/orders" `
      -Headers $headers `
      -ContentType "application/json" `
      -Body $orderBody
    "Request $_ -> HTTP $($response.StatusCode)"
  } catch {
    "Request $_ -> HTTP $([int]$_.Exception.Response.StatusCode): $($_.ErrorDetails.Message)"
  }
}
```

Mong đợi request vượt bucket trả `429`. Nếu request nghiệp vụ trước đó đã tiêu token, `429` có thể xuất hiện sớm hơn request thứ 6; reset Redis key ngay trước khi demo.

### 5.3. Lời nói

> “Rate limit được đặt theo user, tối đa 5 lần tạo order trong 300 giây. Token bucket nằm ở Redis và được tiêu thụ nguyên tử. Admin được bypass để không cản trở thao tác vận hành.”

## 6. Demo cache L1 và Redis L2

### 6.1. Xóa Redis cache concert

Không dùng pipeline kiểu Unix trên PowerShell. Dùng lệnh an toàn sau:

```powershell
$cacheKeys = docker exec ticketbox-redis redis-cli --scan --pattern "cache:concert*"
foreach ($key in $cacheKeys) {
  docker exec ticketbox-redis redis-cli DEL $key
}
```

Restart API một lần để L1 memory cache cũng rỗng, sau đó chạy lại API.

### 6.2. Cache miss → DB

```powershell
Measure-Command {
  Invoke-RestMethod -Method Get -Uri "$BASE_URL/concerts/$CONCERT_ID" | Out-Null
}

docker exec ticketbox-redis redis-cli --scan --pattern "cache:concert*"
```

Lần đầu backend đọc DB rồi ghi Redis và L1.

### 6.3. L1 hit

```powershell
Measure-Command {
  Invoke-RestMethod -Method Get -Uri "$BASE_URL/concerts/$CONCERT_ID" | Out-Null
}
```

Lần hai trong vòng TTL L1 trả từ memory. Thời gian chỉ là minh họa, không dùng một lần đo để kết luận benchmark.

### 6.4. L2 hit

Restart riêng API để mất L1 nhưng giữ Redis. Gọi lại:

```powershell
Invoke-RestMethod -Method Get -Uri "$BASE_URL/concerts/$CONCERT_ID"
```

Redis vẫn có key nên backend hydrate lại L1 mà không cần query DB.

### 6.5. Invalidation

Dùng token admin để update concert qua API, không update thẳng DB vì update thẳng DB sẽ cố tình bỏ qua invalidation:

```powershell
$ADMIN_TOKEN = "<ADMIN_ACCESS_TOKEN>"
$adminHeaders = @{ Authorization = "Bearer $ADMIN_TOKEN" }
$updateBody = @{ description = "Cache invalidation demo $(Get-Date -Format o)" } | ConvertTo-Json

Invoke-RestMethod `
  -Method Patch `
  -Uri "$BASE_URL/concerts/$CONCERT_ID" `
  -Headers $adminHeaders `
  -ContentType "application/json" `
  -Body $updateBody

docker exec ticketbox-redis redis-cli --scan --pattern "cache:concert*"
```

> “Mutation xóa cả cache detail và các cache list liên quan. Request tiếp theo lấy dữ liệu mới, tránh stale cache.”

## 7. Demo queue, worker, outbox và email

Phần này nối trực tiếp sau webhook SUCCESS ở mục 3.

### 7.1. Chỉ log worker

Trong terminal worker, tìm chuỗi:

```text
Processing notification job: payment.completed
Starting payment.completed fan-out
Enqueueing send-single
Processing notification job: send-single
```

### 7.2. Kiểm tra DB

```powershell
docker exec nest-prisma-postgres psql -U postgres -d nest_prisma_db -c "SELECT queue_name, job_name, status, retry_count, error, created_at FROM outbox_messages WHERE payload->>'orderId' = '$ORDER_ID' ORDER BY created_at;"
docker exec nest-prisma-postgres psql -U postgres -d nest_prisma_db -c "SELECT channel, template, status, retry_count, dedupe_key, sent_at FROM notifications WHERE payload->>'orderId' = '$ORDER_ID' ORDER BY created_at;"
docker exec nest-prisma-postgres psql -U postgres -d nest_prisma_db -c "SELECT title, read, created_at FROM in_app_notifications WHERE message LIKE '%$ORDER_ID%' ORDER BY created_at;"
```

### 7.3. Mở email

Mở `http://localhost:8025`, chọn email thanh toán thành công và chỉ QR attachment.

### 7.4. Lời nói

> “Transaction thanh toán chỉ ghi trạng thái nghiệp vụ và phát event. Gửi email được đẩy sang BullMQ để API không phải chờ. Outbox giữ thông điệp trong database; nếu Redis tạm lỗi, cron sẽ thử chuyển lại mỗi 5 giây, tối đa 5 lần. Notification dùng dedupe key nên retry không gửi trùng.”

## 8. Circuit breaker — phần dự phòng

Không thể mở circuit chỉ bằng webhook mock. Circuit breaker được cập nhật khi thao tác tạo payment gọi gateway thật thất bại/timeout.

### 8.1. Trạng thái Redis

```powershell
docker exec ticketbox-redis redis-cli DEL "cb:VNPAY:failures" "cb:VNPAY:open"
docker exec ticketbox-redis redis-cli GET "cb:VNPAY:failures"
docker exec ticketbox-redis redis-cli GET "cb:VNPAY:open"
```

### 8.2. Demo khi đã có cấu hình provider lỗi

Tạo 5 payment request hợp lệ vào provider đang lỗi, mỗi request dùng order/key phù hợp. Sau đó xem:

```powershell
docker exec ticketbox-redis redis-cli GET "cb:VNPAY:failures"
docker exec ticketbox-redis redis-cli GET "cb:VNPAY:open"
docker exec ticketbox-redis redis-cli TTL "cb:VNPAY:open"
```

Request tiếp theo phải trả `503 Service Unavailable`. Đồng thời:

```powershell
Invoke-RestMethod -Method Get -Uri "$BASE_URL/concerts"
```

vẫn trả thành công, chứng minh lỗi payment không kéo sập module khác.

> Không tự set `cb:VNPAY:open` rồi nói đó là circuit breaker tự mở. Nếu cần minh họa nhanh, phải nói rõ đây chỉ là “mô phỏng trạng thái OPEN”.

### 8.3. Mô phỏng OPEN khi giảng viên chỉ yêu cầu xem hành vi

```powershell
docker exec ticketbox-redis redis-cli SETEX "cb:VNPAY:open" 30 "true"
docker exec ticketbox-redis redis-cli TTL "cb:VNPAY:open"
```

Sau 30 giây key tự hết hạn.

## 9. Checklist trước khi lên demo

- [ ] `$BASE_URL` đúng port API.
- [ ] Có customer token và admin token.
- [ ] Có hai order riêng: một order payment success, một order late webhook.
- [ ] Hai order đều đã có `paymentRef` và biết đúng `totalAmount`.
- [ ] API và worker chạy ở hai terminal riêng.
- [ ] PostgreSQL, Redis, MailHog đang healthy.
- [ ] Đã mở MailHog `http://localhost:8025`.
- [ ] Đã thử toàn bộ lệnh một lần trước buổi demo.
- [ ] Không chạy seed có `deleteMany()` ngay trước demo vì có thể xóa dữ liệu chung.
- [ ] Mỗi lần tập lại webhook dùng `gatewayTransactionId` mới.

## 10. Kịch bản rút gọn khi chỉ còn 5 phút

1. Gửi `mock-trigger SUCCESS`, chỉ order `PAID` và ticket được sinh.
2. Gửi lại cùng body, chứng minh event count và ticket count không đổi.
3. Update order phụ thành `EXPIRED`, gửi SUCCESS, chứng minh `REFUND_REQUIRED` và không có ticket.
4. Chỉ worker log + MailHog để giải thích outbox/queue.
5. Kết luận bằng các con số rate limit và circuit breaker, không demo trực tiếp nếu thiếu thời gian.

## 11. Câu tổng kết

> “Phần demo cho thấy backend không chỉ xử lý happy path. Webhook có thể lặp hoặc đến trễ nhưng side effect vẫn nhất quán; Redis bảo vệ endpoint và hỗ trợ cache/circuit breaker; còn outbox và worker tách tác vụ email khỏi request chính. Khi một thành phần ngoài hệ thống gặp lỗi, dữ liệu thanh toán và các module còn lại vẫn được bảo vệ.”
