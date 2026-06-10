# Orders API

Base URL: `/orders`

Tất cả các endpoint đều yêu cầu **JWT Access Token** trong header:
```
Authorization: Bearer <access_token>
```

---

## Mục lục

- [POST /orders](#1-post-orders--tạo-order)
- [GET /orders/:id](#2-get-ordersid--lấy-chi-tiết-order)
- [POST /orders/:id/cancel](#3-post-ordersidcancel--huỷ-order)

---

## 1. `POST /orders` – Tạo order

> Giữ vé tạm thời 10 phút, sau khi tạo cần thanh toán trước khi hết hạn.

**Quyền:** Chỉ user có role `customer`

### Headers

| Header            | Bắt buộc | Mô tả                                                                 |
|-------------------|----------|-----------------------------------------------------------------------|
| `Authorization`   | ✅        | `Bearer <access_token>`                                               |
| `Idempotency-Key` | ✅        | UUID do FE tạo ra. Dùng để gửi lại request an toàn mà không bị tạo order trùng |
| `Content-Type`    | ✅        | `application/json`                                                    |

> **Lưu ý `Idempotency-Key`:**
> - FE phải tự sinh một UUID mới cho mỗi **ý định mua hàng** (mỗi lần user bấm "Đặt vé").
> - Nếu request bị timeout/lỗi mạng, FE **giữ nguyên key cũ** và gửi lại – server sẽ trả về response cũ thay vì tạo order mới.
> - Nếu gửi cùng key nhưng **đổi body** → 409 Conflict.

### Request Body

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

| Field                   | Type     | Bắt buộc | Mô tả                                    |
|-------------------------|----------|----------|------------------------------------------|
| `concertId`             | `string` | ✅        | UUID của concert                         |
| `items`                 | `array`  | ✅        | Danh sách vé muốn mua, tối thiểu 1 item |
| `items[].ticketTypeId`  | `string` | ✅        | UUID của loại vé                         |
| `items[].quantity`      | `number` | ✅        | Số lượng (1–10)                          |

### Response `201 Created`

```json
{
  "success": true,
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440000",
    "concertId": "...",
    "status": "PENDING_PAYMENT",
    "totalAmount": "3600000",
    "currency": "VND",
    "expiresAt": "2025-06-09T12:10:00.000Z",
    "items": [
      {
        "ticketTypeId": "...",
        "name": "VIP",
        "quantity": 2,
        "unitPrice": "1800000",
        "lineTotal": "3600000"
      }
    ]
  }
}
```

> ⚠️ `expiresAt` là **thời điểm hết hạn giữ vé** (10 phút từ lúc tạo). FE nên hiển thị countdown timer và điều hướng user đến trang thanh toán ngay.

### Lỗi có thể gặp

| HTTP | Trường hợp | Response body |
|------|-----------|---------------|
| `400` | Thiếu `Idempotency-Key` | `{ "message": "Idempotency-Key is required" }` |
| `400` | Body không hợp lệ (thiếu field, sai UUID...) | Zod validation error |
| `400` | `ticketTypeId` không thuộc `concertId` | `{ "message": "Invalid ticket type", "ticketTypeId": "..." }` |
| `401` | Thiếu hoặc JWT hết hạn | `{ "message": "Unauthorized" }` |
| `403` | User không phải `customer` (vd: admin) | `{ "message": "You do not have permission" }` |
| `409` | Cùng `Idempotency-Key` nhưng body khác | `{ "message": "Idempotency key conflict", "key": "..." }` |
| `409` | Concert chưa mở bán / bị cancel | `{ "message": "Concert is not available", "concertId": "...", "status": "DRAFT" }` |
| `409` | Loại vé đã hết | `{ "message": "Not enough tickets available", "ticketTypeId": "...", "availableQuantity": 0 }` |
| `409` | Vượt giới hạn mua per-user | `{ "message": "Ticket limit exceeded", "maxPerUser": 4, "held": 3, "paid": 0, "requested": 2 }` |
| `429` | Gửi quá nhiều request (> 5 lần / 5 phút) | `{ "message": "Too many order requests. Retry after Xs" }` |

---

## 2. `GET /orders/:id` – Lấy chi tiết order

**Quyền:** Owner của order hoặc admin

### Path Params

| Param | Type     | Mô tả          |
|-------|----------|----------------|
| `id`  | `string` | UUID của order |

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "orderId": "...",
    "userId": "...",
    "concertId": "...",
    "reservationId": "...",
    "status": "PENDING_PAYMENT",
    "totalAmount": "3600000",
    "currency": "VND",
    "expiresAt": "2025-06-09T12:10:00.000Z",
    "createdAt": "2025-06-09T12:00:00.000Z",
    "paymentMethod": null,
    "paidAt": null,
    "items": [
      {
        "ticketTypeId": "...",
        "name": "VIP",
        "quantity": 2,
        "unitPrice": "1800000",
        "lineTotal": "3600000"
      }
    ]
  }
}
```

### Các giá trị `status`

| Status               | Ý nghĩa                                                       |
|----------------------|---------------------------------------------------------------|
| `PENDING_PAYMENT`    | Đã giữ vé, đang chờ thanh toán (còn trong countdown)         |
| `PAYMENT_PROCESSING` | Đang xử lý thanh toán (đã redirect sang cổng payment)        |
| `PAID`               | Thanh toán thành công, vé đã được phát hành                  |
| `PAYMENT_FAILED`     | Thanh toán thất bại, vé đã được trả lại                      |
| `EXPIRED`            | Hết thời gian thanh toán (10 phút), vé đã được trả lại       |
| `CANCELLED`          | User tự huỷ                                                   |
| `REFUND_REQUIRED`    | Cần xử lý hoàn tiền thủ công (edge case hiếm gặp)            |

### Lỗi có thể gặp

| HTTP | Trường hợp |
|------|-----------|
| `401` | Thiếu hoặc JWT hết hạn |
| `404` | Order không tồn tại hoặc không thuộc user đang request |

---

## 3. `POST /orders/:id/cancel` – Huỷ order

> Chỉ huỷ được khi order đang ở trạng thái `PENDING_PAYMENT`. Vé sẽ được trả lại ngay lập tức.

**Quyền:** Chỉ owner của order

### Path Params

| Param | Type     | Mô tả          |
|-------|----------|----------------|
| `id`  | `string` | UUID của order |

### Request Body

Không cần body.

### Response `200 OK`

```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "orderId": "...",
    "status": "CANCELLED",
    "totalAmount": "3600000",
    "currency": "VND",
    "expiresAt": "...",
    "createdAt": "...",
    "paymentMethod": null,
    "paidAt": null,
    "items": [...]
  }
}
```

### Lỗi có thể gặp

| HTTP | Trường hợp | Response body |
|------|-----------|---------------|
| `401` | Thiếu hoặc JWT hết hạn | — |
| `404` | Order không tồn tại hoặc không thuộc user | `{ "message": "Order not found" }` |
| `409` | Order không ở trạng thái `PENDING_PAYMENT` | `{ "message": "Cannot cancel order with status PAID", "currentStatus": "PAID" }` |

---

## Flow FE nên theo

```
1. User chọn vé → FE sinh Idempotency-Key (UUID v4)
2. POST /orders  →  nhận orderId + expiresAt
3. Hiển thị countdown timer (10 phút)
4. Redirect sang trang thanh toán (gọi POST /payments)
5. Polling GET /orders/:id để check status (mỗi 3-5s)
     PAID             → chuyển sang trang thành công
     EXPIRED/FAILED   → thông báo thất bại, cho phép thử lại
6. Nếu user bấm "Huỷ đơn" → POST /orders/:id/cancel
```

> **Idempotency retry pattern:**
> ```
> try {
>   const res = await POST /orders (key=myKey)
> } catch (network_error) {
>   // Dùng lại cùng myKey, KHÔNG tạo key mới
>   const res = await POST /orders (key=myKey)
> }
> ```
