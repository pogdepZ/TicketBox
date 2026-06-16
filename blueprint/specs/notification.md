# Đặc tả: Notification

## 1. Mô tả

Hệ thống gửi thông báo cho khán giả sau khi mua vé thành công và trước concert 24 giờ. Thiết kế phải dễ mở rộng thêm SMS/Zalo OA.

## 2. Luồng xác nhận mua vé

1. Payment thành công.
2. Backend publish event `payment.completed`.
3. NotificationWorker tạo job gửi email/push.
4. Worker render template.
5. Gửi qua channel tương ứng.
6. Ghi trạng thái vào bảng `notifications`.

## 3. Luồng nhắc nhở trước 24 giờ

1. ReminderWorker chạy mỗi giờ.
2. Tìm concert sắp diễn ra trong khoảng 24 giờ.
3. Tìm user có ticket active.
4. Enqueue reminder notification.
5. Gửi email/push.

## 4. Kịch bản lỗi

| Lỗi | Xử lý |
|---|---|
| Email provider lỗi | Retry với backoff |
| Gửi quá số lần retry | Đánh dấu failed |
| User không có email | Bỏ qua email, thử push nếu có |
| Channel mới như Zalo OA | Thêm class channel mới, không sửa luồng chính |

## 5. Ràng buộc

- Gửi notification không block luồng mua vé.
- Có audit trạng thái sent/failed.
- Template quản lý tập trung.

## 6. Dedupe notification

Để tránh gửi trùng reminder, hệ thống dùng dedupe key:

```
userId + concertId + notificationType
```

Ví dụ: `customer-001 + concert-001 + reminder_24h`

Nếu notification với dedupe key này đã ở trạng thái `sent` hoặc `queued`, worker không tạo thêm job mới. Dedupe key được lưu vào bảng `notifications` và kiểm tra trước khi enqueue.

## 7. Tiêu chí chấp nhận

- Mua vé thành công tạo notification job.
- Email/push lỗi không làm rollback order.
- Có thể thêm channel mới qua interface chung.
- ReminderWorker không enqueue trùng reminder cho cùng user + concert + loại thông báo.

## 8. Internal API / Service

### `NotificationsService.sendNotification`
- **Mô tả:** Gửi thông báo đến user thông qua các kênh khác nhau.
- **Tham số:**
  - `userId`: string
  - `type`: string (template identifier)
  - `channel`: 'EMAIL' | 'PUSH' | 'SMS' | 'ZALO'
  - `payload`: Record<string, unknown>
- **Trả về:** `{ notificationId: string, status: string }`
