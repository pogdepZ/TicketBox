# Payments API

Base URL: `/payments`

---

## Module này đang có gì

| Thành phần | File | Vai trò |
|---|---|---|
| Controller | `payments.controller.ts` | Khai báo API tạo payment, webhook, mock-trigger dev-only, polling status |
| Core service | `payments.service.ts` | Điều phối create payment, xử lý webhook success/fail/timeout, lock order, issue ticket, queue notification |
| Payment gateway | `payment-gateway.service.ts` | Sinh `paymentRef`, build VNPAY/MoMo sandbox payment URL, ký/verify HMAC-SHA256 webhook |
| Payment event | `payment-event.service.ts` | Insert `PaymentEvent` idempotent theo unique `(gateway, gatewayTransactionId, eventType)` |
| Ticket issuer | `ticket-issuer.service.ts` | Sinh `Ticket`, `ticketCode`, và QR JWT bằng `JWT_TICKET_SECRET` |
| Circuit breaker | `payment-circuit-breaker.service.ts` | Redis circuit breaker theo provider, timeout nhiều lần sẽ tạm chặn create payment |
| DTO | `dto/create-payment.dto.ts` | Validate `POST /payments/create` |
| DTO | `dto/payment-webhook.dto.ts` | Validate webhook/mock-trigger payload |
| DTO | `dto/payment-status-response.dto.ts` | Chuẩn response polling status |
| Env | `config/env.validation.ts` | Validate `JWT_TICKET_SECRET`, VNPAY sandbox, MoMo sandbox và mock webhook secrets |

### Hành vi chính

| Luồng | Hành vi |
|---|---|
| `POST /payments/create` | Customer tạo payment request cho order của chính mình; order được lock để tránh tạo nhiều `paymentRef`, kể cả khi client dùng nhiều `Idempotency-Key` |
| Retry create payment | Dùng `Idempotency-Key`; cùng key/body trả lại response cũ |
| Webhook `SUCCESS` | Verify signature, lock order, check amount, chuyển `PAID`, confirm reservation, chuyển quota held -> paid, sinh ticket |
| Webhook duplicate | Nếu event đã processed thì trả idempotent; nếu insert rồi nhưng xử lý lỗi thì retry được |
| Webhook `FAILED`/`TIMEOUT` | Release order qua `OrderTransactionHelper`, trả vé và giảm held quota |
| Success sau expired/cancelled | Chuyển `REFUND_REQUIRED`, không sinh ticket |
| Poll status | Owner/admin xem trạng thái payment; nếu `PAID` trả danh sách ticket + QR payload |

### Endpoint hiện có

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| `POST` | `/payments/create` | Customer JWT | Tạo hoặc lấy lại payment request, trả `orderStatus` + `paymentStatus` |
| `POST` | `/payments/webhooks/:provider` | Public + HMAC | Provider: `VNPAY`, `MOMO` |
| `POST` | `/payments/webhooks/mock-trigger` | Dev only | Tự ký HMAC để test webhook |
| `GET` | `/payments/:paymentRef/status` | Owner/admin JWT | Poll kết quả payment |

---

## Mục lục

- [POST /payments/create](#1-post-paymentscreate--tạo-payment-request)
- [POST /payments/webhooks/:provider](#2-post-paymentswebhooksprovider--nhận-webhook)
- [POST /payments/webhooks/mock-trigger](#3-post-paymentswebhooksmock-trigger--dev-only)
- [GET /payments/:paymentRef/status](#4-get-paymentspaymentrefstatus--poll-trạng-thái)
- [Flow FE nên theo](#flow-fe-nên-theo)

---

## 1. `POST /payments/create` – Tạo payment request

**Quyền:** `customer` (JWT required)

### Headers

| Header            | Bắt buộc | Mô tả                                         |
|-------------------|----------|-----------------------------------------------|
| `Authorization`   | ✅        | `Bearer <access_token>`                        |
| `Idempotency-Key` | ✅        | UUID do FE tạo – giữ nguyên khi retry         |
| `Content-Type`    | ✅        | `application/json`                             |

### Request Body

```json
{
  "orderId": "uuid",
  "provider": "VNPAY",
  "returnUrl": "https://your-fe.com/payment/result"
}
```

| Field       | Type     | Bắt buộc | Giá trị hợp lệ         |
|-------------|----------|----------|------------------------|
| `orderId`   | `string` | ✅        | UUID của order         |
| `provider`  | `string` | ✅        | `"VNPAY"` \| `"MOMO"` |
| `returnUrl` | `string` | ❌        | URL FE nhận kết quả    |

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "orderId": "...",
    "paymentRef": "VNPAY-20250609120000-00001",
    "provider": "VNPAY",
    "orderStatus": "PAYMENT_PROCESSING",
    "paymentStatus": "PROCESSING",
    "paymentUrl": "https://test-payment.momo.vn/v2/gateway/pay?t=...",
    "expiresAt": "2025-06-09T12:10:00.000Z",
    "amount": "3600000",
    "currency": "VND"
  }
}
```

> ⚠️ FE redirect user đến `paymentUrl` ngay sau khi nhận response.
> Lưu `paymentRef` để dùng cho polling status.

### Lỗi có thể gặp

| HTTP | Trường hợp |
|------|-----------|
| `400` | Thiếu `Idempotency-Key` hoặc body invalid |
| `401` | JWT không hợp lệ |
| `403` | Không phải customer |
| `404` | Order không tồn tại hoặc không thuộc user |
| `409` | Order đã expired / không ở trạng thái thanh toán được |
| `503` | Payment gateway tạm thời không khả dụng (circuit breaker OPEN) |

---

## MoMo sandbox config

Backend gọi MoMo One-Time Payment sandbox bằng `POST /v2/gateway/api/create` với `requestType = captureWallet`.

```env
MOMO_PARTNER_CODE="MOMO"
MOMO_ACCESS_KEY="F8BBA842ECF85"
MOMO_SECRET_KEY="K951B6PE1waDMi640xX08PD3vg6EkVlz"
MOMO_ENDPOINT="https://test-payment.momo.vn/v2/gateway/api/create"
MOMO_REDIRECT_URL="http://localhost:3000/checkout/result"
MOMO_IPN_URL="http://localhost:3001/payments/webhooks/MOMO"
MOMO_REQUEST_TYPE="captureWallet"
```

Khi tạo payment với `"provider": "MOMO"`, BE trả `paymentUrl` là `payUrl` từ MoMo sandbox. MoMo IPN sẽ POST body gốc về `MOMO_IPN_URL`; BE verify chữ ký MoMo rồi map về payload chung để xử lý order/ticket.

Theo docs MoMo One-Time Payment, request tạo thanh toán dùng endpoint `/v2/gateway/api/create`; signature tạo payment ký HMAC SHA256 trên chuỗi `accessKey`, `amount`, `extraData`, `ipnUrl`, `orderId`, `orderInfo`, `partnerCode`, `redirectUrl`, `requestId`, `requestType`; IPN/redirect trả các field như `orderId`, `requestId`, `amount`, `resultCode`, `transId`, `payType`, `responseTime` và `signature`.

## 2. `POST /payments/webhooks/:provider` – Nhận webhook

**Quyền:** Public (không cần JWT). Bảo vệ bằng HMAC-SHA256 signature.

`:provider` = `VNPAY` hoặc `MOMO`

Với `MOMO` sandbox thật, body là payload IPN gốc từ MoMo, ví dụ:

```json
{
  "partnerCode": "MOMO",
  "orderId": "MOMO-20260610120000-00001",
  "requestId": "MOMO-20260610120000-00001",
  "amount": 1000,
  "orderInfo": "Thanh toan don hang MOMO-20260610120000-00001",
  "orderType": "momo_wallet",
  "transId": 4088878653,
  "resultCode": 0,
  "message": "Successful.",
  "payType": "qr",
  "responseTime": 1721720663942,
  "extraData": "",
  "signature": "<momo-hmac-sha256>"
}
```

`resultCode = 0` được map thành `SUCCESS`, còn các mã khác được map thành `FAILED`.

### Request Body

Mock webhook nội bộ vẫn hỗ trợ payload chung sau:

```json
{
  "paymentRef": "VNPAY-20250609120000-00001",
  "gatewayTransactionId": "GW-TXN-12345",
  "eventType": "SUCCESS",
  "amount": 3600000,
  "currency": "VND",
  "signature": "<hmac-sha256>"
}
```

| Field                  | Type     | Mô tả                                              |
|------------------------|----------|----------------------------------------------------|
| `paymentRef`           | `string` | Ref được BE tạo ra khi create payment              |
| `gatewayTransactionId` | `string` | Transaction ID từ phía gateway                     |
| `eventType`            | `string` | `"SUCCESS"` \| `"FAILED"` \| `"TIMEOUT"`          |
| `amount`               | `number` | Số tiền (VND)                                      |
| `signature`            | `string` | HMAC-SHA256 – xem cách tính bên dưới              |

**Cách tính signature:**
```
message = "{provider}:{paymentRef}:{gatewayTransactionId}:{eventType}:{normalizedAmount}:{currency}"
signature = HMAC-SHA256(MOCK_VNPAY_SECRET, message)
```

> Secret mặc định trong dev: `mock-vnpay-secret` / `mock-momo-secret`

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "processed": true,
    "orderStatus": "PAID",
    "paymentStatus": "SUCCEEDED"
  }
}
```

### Hành vi theo `eventType`

| eventType | Order trước | Kết quả |
|-----------|------------|---------|
| `SUCCESS` | PENDING/PROCESSING | → PAID, ticket được sinh |
| `SUCCESS` | PAID | Idempotent, bỏ qua |
| `SUCCESS` | EXPIRED/CANCELLED | → REFUND_REQUIRED (không sinh ticket) |
| `FAILED` | PENDING/PROCESSING | → PAYMENT_FAILED, trả vé lại kho; FE phải hiển thị "Đặt vé lại" |
| `FAILED` | PAID | Ignore (log warning) |
| `TIMEOUT` | PENDING/PROCESSING | → PAYMENT_FAILED, trả vé; FE phải hiển thị "Đặt vé lại" |

### Lỗi có thể gặp

| HTTP | Trường hợp |
|------|-----------|
| `400` | Provider không hợp lệ hoặc body invalid |
| `401` | Signature sai |

---

## 3. `POST /payments/webhooks/mock-trigger` – Dev only

> ⚠️ Chỉ hoạt động khi `NODE_ENV ≠ production`.
> FE/tester dùng endpoint này để simulate webhook mà không cần tính signature thủ công.

### Request Body

```json
{
  "provider": "VNPAY",
  "paymentRef": "VNPAY-20250609120000-00001",
  "gatewayTransactionId": "GW-TXN-12345",
  "eventType": "SUCCESS",
  "amount": 3600000
}
```

BE sẽ tự tính signature và gọi webhook handler.

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "processed": true,
    "orderStatus": "PAID",
    "paymentStatus": "SUCCEEDED"
  }
}
```

---

## 4. `GET /payments/:paymentRef/status` – Poll trạng thái

**Quyền:** Owner của order hoặc admin (JWT required)

### Path Params

| Param        | Mô tả              |
|--------------|--------------------|
| `paymentRef` | Ref từ bước create |

### Response `200 OK` (khi PAID)

```json
{
  "success": true,
  "data": {
    "paymentRef": "VNPAY-20250609120000-00001",
    "orderId": "...",
    "orderStatus": "PAID",
    "paymentStatus": "SUCCEEDED",
    "totalAmount": "3600000",
    "currency": "VND",
    "paidAt": "2025-06-09T12:05:30.000Z",
    "expiresAt": "2025-06-09T12:10:00.000Z",
    "tickets": [
      {
        "ticketId": "...",
        "ticketCode": "TB-ABCDEF-1A2B3C",
        "ticketTypeName": "VIP",
        "qrPayload": "<jwt-string>",
        "seatNumber": null,
        "status": "ACTIVE"
      }
    ]
  }
}
```

> Khi `orderStatus` chưa phải `PAID`, mảng `tickets` sẽ rỗng `[]`. Nếu `retryAction = "CREATE_NEW_ORDER"`, FE phải đưa user về luồng đặt vé mới thay vì retry payment trên order cũ.

### Các giá trị `orderStatus`

| Status               | Ý nghĩa FE nên hiển thị                        |
|----------------------|------------------------------------------------|
| `PAYMENT_PROCESSING` | Đang chờ kết quả từ gateway (tiếp tục poll)    |
| `PAID`               | Thành công – hiển thị tickets                  |
| `PAYMENT_FAILED`     | Thất bại – vé đã release, FE hiển thị "Đặt vé lại" |
| `EXPIRED`            | Hết giờ – tạo order mới                        |
| `REFUND_REQUIRED`    | Edge case – liên hệ hỗ trợ                     |

### Lỗi có thể gặp

| HTTP | Trường hợp |
|------|-----------|
| `401` | JWT không hợp lệ |
| `404` | paymentRef không tồn tại hoặc không thuộc user |

---

## Flow FE nên theo

```
1. POST /orders              → nhận orderId, expiresAt
2. POST /payments/create     → nhận paymentRef, paymentUrl
3. Redirect user → paymentUrl (mock payment page)
4. [DEV] Mock page gọi POST /payments/webhooks/mock-trigger
5. Polling GET /payments/:paymentRef/status mỗi 3s
     PAID             → hiển thị tickets, stop polling
     PAYMENT_FAILED   → thông báo thất bại, nút "Đặt vé lại"
     EXPIRED          → thông báo hết hạn, nút "Đặt vé lại"
     PAYMENT_PROCESSING → tiếp tục poll
```

### Retry pattern (khi mạng lỗi)

```js
// Giữ nguyên idempotencyKey khi retry
const key = crypto.randomUUID(); // tạo 1 lần duy nhất per checkout
try {
  const res = await POST('/payments/create', body, { 'Idempotency-Key': key });
} catch (networkError) {
  // Retry với cùng key – server trả response cũ, không tạo payment mới
  const res = await POST('/payments/create', body, { 'Idempotency-Key': key });
}
```
