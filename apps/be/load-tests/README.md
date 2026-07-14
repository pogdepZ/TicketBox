# Kiểm thử race condition và idempotency cho Orders

Thư mục này chứa script k6 dùng để tạo bằng chứng kỹ thuật cho `POST /orders`:

- Không oversell khi nhiều request đặt vé chạy đồng thời.
- Retry an toàn với `Idempotency-Key`.
- Cùng `Idempotency-Key` nhưng body khác phải bị từ chối bằng `409 Conflict`.

Script mặc định bắn `50` request đồng thời vào cùng một `ticketTypeId`, mỗi request dùng một `seatNumber` khác nhau. Trước khi chạy, hãy reset số vé còn lại của ticket type xuống một số nhỏ, ví dụ `5`. Kết quả hợp lệ là số order tạo thành công không vượt quá số vé còn lại; các request dư phải trả lỗi nghiệp vụ `409`, không phải lỗi `5xx`.

## 1. Chuẩn bị backend

Chạy database, migrate, seed dữ liệu và bật API local:

```bash
docker compose up -d
pnpm --filter @repo/be exec prisma migrate dev
pnpm --filter @repo/be db:seed
pnpm --filter @repo/be dev
```

Backend mặc định chạy ở:

```text
http://localhost:3001
```

## 2. Chuẩn bị dữ liệu test

Ví dụ dưới đây dùng concert seeded cố định và ticket type `SVIP`. Reset ticket type này về `5` vé còn lại:

```bash
docker exec -it nest-prisma-postgres psql -U postgres -d nest_prisma_db
```

```sql
UPDATE ticket_types
SET remaining = 5,
    total_quantity = 5,
    max_per_user = 100
WHERE id = 'da8e128c-682d-4fbb-bee4-5f26545cae11';
```

Nếu chạy lại nhiều lần, nên dọn các seat và idempotency key do script trước đó tạo:

```sql
DELETE FROM reservation_seats
WHERE concert_id = '202dedd0-18dc-4d48-a652-d0ee8aa1f441'
  AND seat_number LIKE 'RACE-%';

DELETE FROM idempotency_records
WHERE key LIKE 'RACE-%';
```

## 3. Chạy script k6

Từ thư mục `apps/be`:

```bash
pnpm loadtest:orders
```

Hoặc từ root repo:

```bash
k6 run apps/be/load-tests/orders-race-idempotency.k6.js
```

Mặc định script tự login bằng admin seeded:

```text
admin@gmail.com / 123456
```

Lý do dùng admin: service hiện bypass rate limit cho role `admin`, giúp bài test tập trung vào khóa tồn kho và idempotency thay vì bị chặn bởi giới hạn số request theo user.

## 4. Tùy biến tham số

Ví dụ chạy với 50 request đồng thời và kỳ vọng chỉ còn 5 vé:

```powershell
k6 run `
  -e BASE_URL=http://localhost:3001 `
  -e CONCERT_ID=202dedd0-18dc-4d48-a652-d0ee8aa1f441 `
  -e TICKET_TYPE_ID=da8e128c-682d-4fbb-bee4-5f26545cae11 `
  -e EXPECTED_AVAILABLE=5 `
  -e CONCURRENCY=50 `
  apps/be/load-tests/orders-race-idempotency.k6.js
```

Nếu đã có JWT và không muốn script tự login:

```bash
k6 run -e ACCESS_TOKEN=<jwt> apps/be/load-tests/orders-race-idempotency.k6.js
```

Các biến môi trường chính:

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:3001` | URL backend |
| `CONCERT_ID` | Stable seeded concert | Concert dùng để đặt vé |
| `TICKET_TYPE_ID` | Stable seeded SVIP | Ticket type bị bắn concurrent |
| `EXPECTED_AVAILABLE` | `5` | Số vé còn lại trước khi test |
| `CONCURRENCY` | `50` | Số request concurrent |
| `ACCESS_TOKEN` | rỗng | JWT có sẵn, nếu không muốn auto login |
| `LOGIN_EMAIL` | `admin@gmail.com` | Email dùng để auto login |
| `LOGIN_PASSWORD` | `123456` | Password dùng để auto login |

## 5. Bằng chứng cần thấy

Cuối run, script in summary tương tự:

```text
Orders race/idempotency evidence
- Concurrent POST /orders: 50
- Expected available seats before run: 5
- Successful new order responses: 5
- Expected 409 business rejections: 46
- 429 rate-limit responses: 0
- 5xx responses: 0
- Oversell guard: PASS (success <= expected available)
```

Tiêu chí pass:

- `Successful new order responses <= EXPECTED_AVAILABLE`.
- `Oversell guard: PASS`.
- `429 rate-limit responses = 0`.
- `5xx responses = 0`.
- Retry cùng `Idempotency-Key` trả lại đúng cùng `orderId`.
- Cùng `Idempotency-Key` nhưng body khác trả `409`.

Script cũng ghi file `orders-race-idempotency-summary.json` để đính kèm vào báo cáo hoặc demo.

## 6. Test thêm: quota, rate limit, webhook duplicate, payment timeout

Script `orders-business-rules.k6.js` kiểm thử các rule nghiệp vụ sau:

- Per-user quota: user đặt quá `max_per_user` phải bị `409`.
- Rate limit: customer thứ 6 tạo order trong cửa sổ 5 phút phải bị `429`.
- Webhook duplicate: gửi cùng `gatewayTransactionId + eventType` hai lần vẫn idempotent, không sinh trùng vé.
- Payment timeout trước khi reservation hết hạn: webhook `TIMEOUT` đưa order về `PENDING_PAYMENT` để user có thể thanh toán lại.

Chuẩn bị dữ liệu cho script này:

```sql
UPDATE ticket_types
SET remaining = 100,
    total_quantity = 100,
    max_per_user = 4
WHERE id = 'f7c6c7ab-f989-40c8-b81b-8338fc30730e';

UPDATE ticket_types
SET remaining = 100,
    total_quantity = 100,
    max_per_user = 100
WHERE id = 'da8e128c-682d-4fbb-bee4-5f26545cae11';

DELETE FROM reservation_seats
WHERE concert_id = '202dedd0-18dc-4d48-a652-d0ee8aa1f441'
  AND seat_number LIKE 'RULE-%';

DELETE FROM idempotency_records
WHERE key LIKE 'RULE-%';
```

Chạy từ thư mục `apps/be`:

```bash
pnpm loadtest:orders:rules
```

Hoặc từ root repo:

```bash
k6 run apps/be/load-tests/orders-business-rules.k6.js
```

Tuỳ biến ticket type nếu cần:

```powershell
k6 run `
  -e QUOTA_TICKET_TYPE_ID=f7c6c7ab-f989-40c8-b81b-8338fc30730e `
  -e RATE_TICKET_TYPE_ID=da8e128c-682d-4fbb-bee4-5f26545cae11 `
  apps/be/load-tests/orders-business-rules.k6.js
```

Cuối run, script ghi `orders-business-rules-summary.json` và in số rule pass/fail.

## 7. Reservation expiry và payment timeout sau khi hết hạn

Hai case này phụ thuộc vào thời gian trong database và cron `OrderExpirationJob`, nên cần chuẩn bị trạng thái hết hạn thật thay vì giả lập trong k6.

Luồng kiểm chứng reservation expiry:

1. Tạo order bằng `POST /orders`.
2. Cập nhật order và reservation về quá hạn:

```sql
UPDATE orders
SET expires_at = NOW() - INTERVAL '1 minute',
    payment_grace_until = NOW() - INTERVAL '1 minute'
WHERE id = '<order_id>';

UPDATE reservations
SET expires_at = NOW() - INTERVAL '1 minute'
WHERE id = '<reservation_id>';
```

3. Đợi cron chạy trong tối đa 1 phút.
4. Kiểm tra kết quả:

```sql
SELECT status, released_at
FROM orders
WHERE id = '<order_id>';

SELECT status
FROM reservation_seats
WHERE reservation_id = '<reservation_id>';
```

Kỳ vọng:

- `orders.status = 'EXPIRED'`.
- `orders.released_at IS NOT NULL`.
- `reservation_seats.status = 'EXPIRED'`.
- `ticket_types.remaining` được cộng trả lại.
- `user_ticket_quotas.held_quantity` được giảm.

Luồng kiểm chứng payment timeout sau khi hết hạn:

1. Tạo order bằng `POST /orders`.
2. Tạo payment bằng `POST /payments/create`.
3. Cập nhật order về quá hạn:

```sql
UPDATE orders
SET expires_at = NOW() - INTERVAL '3 minutes',
    payment_grace_until = NOW() - INTERVAL '1 minute'
WHERE payment_ref = '<payment_ref>';
```

4. Gửi mock webhook:

```json
{
  "provider": "VNPAY",
  "paymentRef": "<payment_ref>",
  "gatewayTransactionId": "manual-timeout-001",
  "eventType": "TIMEOUT",
  "amount": 1500000
}
```

Kỳ vọng:

- Response webhook có `orderStatus = "PAYMENT_FAILED"`.
- Ghế được release.
- Vé được trả lại kho.
- User có thể tạo order mới thay vì retry payment trên order cũ.
