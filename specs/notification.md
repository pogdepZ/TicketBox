# Đặc tả: Hệ thống Thông báo (Notification)

## 1. Tổng quan

Hệ thống thông báo xử lý việc gửi thông tin đến người dùng qua nhiều kênh. Bao gồm: xác nhận sau thanh toán, nhắc nhở trước concert, và các thông báo hệ thống khác.

---

## 2. Luồng thông báo

### 2.1 Xác nhận sau thanh toán

```
Thanh toán thành công (PaymentModule)
  → Publish event: 'payment.completed'
  → NotificationWorker nhận job từ BullMQ
  → Render template "ticket_confirmation"
  → Gửi đồng thời:
      ├─ In-app notification (lưu DB, push realtime)
      └─ Email xác nhận (SMTP)
  → Ghi trạng thái vào bảng notifications
```

### 2.2 Nhắc nhở 24h trước concert

```
ReminderWorker (Cron: mỗi 1 giờ)
  → Query: concerts WHERE event_date BETWEEN NOW() AND NOW() + 24h
  → Với mỗi concert tìm thấy:
      → Query: tất cả user có vé confirmed cho concert này
      → Tạo bulk notification jobs
      → Gửi:
          ├─ In-app notification
          └─ Email nhắc nhở
      → Đánh dấu: đã gửi reminder cho concert này (tránh gửi lại)
```

---

## 3. Kênh thông báo

| Kênh | Ưu tiên | Mô tả | Trạng thái |
|---|---|---|---|
| In-app | 1 (Cao nhất) | Push notification + lưu DB | Tuần 2+ |
| Email | 2 | SMTP (Mailgun/SendGrid/SMTP local) | Tuần 2+ |
| Zalo | 3 | Zalo OA API (sau) | Sau MVP |
| SMS | 4 | SMS gateway (sau) | Sau MVP |

Quy tắc ưu tiên:
- Luôn gửi In-app
- Email là kênh mặc định thứ hai
- Zalo/SMS chỉ khi user đăng ký và kênh khả dụng

---

## 4. Database Schema

### Bảng `notifications`

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,        -- 'ticket_confirmation', 'reminder_24h', 'checkin_alert'
  channel VARCHAR(20) NOT NULL,      -- 'email', 'push', 'sms', 'zalo'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'queued', 'sent', 'failed', 'read'
  payload JSONB NOT NULL,            -- { subject, body, templateData, ... }
  sentAt TIMESTAMPTZ,
  readAt TIMESTAMPTZ,
  errorMessage TEXT,
  retryCount INTEGER DEFAULT 0,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(userId, createdAt DESC);
CREATE INDEX idx_notifications_status ON notifications(status);
```

---

## 5. Queue & Worker (BullMQ + Redis)

### Job Data

```typescript
interface NotificationJob {
  type: 'ticket_confirmation' | 'reminder_24h' | 'checkin_alert';
  userId: string;
  channel: 'email' | 'push' | 'sms' | 'zalo';
  payload: {
    subject: string;
    template: string;
    templateData: Record<string, unknown>;
  };
  priority: number; // 1 = cao nhất
}
```

### Queue Configuration

```typescript
const notificationQueue = new Queue('notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s → 10s → 20s
    },
    removeOnComplete: { age: 24 * 3600 }, // Xóa job hoàn thành sau 24h
    removeOnFail: { age: 7 * 24 * 3600 },  // Giữ job lỗi 7 ngày
  },
});
```

### Retry Strategy

| Lần thử | Delay | Hành động khi thất bại |
|---|---|---|
| 1 | 0 (ngay lập tức) | Retry |
| 2 | 5 phút | Retry |
| 3 | 15 phút | Retry |
| Cuối | — | Đánh dấu FAILED, ghi log, admin review |

---

## 6. Error Handling

| Tình huống | Xử lý |
|---|---|
| Email service down | Retry sau 5 phút (exponential backoff). Sau 3 lần → FAILED |
| Push token không hợp lệ | Bỏ qua push, fallback sang email |
| User không có email | Chỉ gửi In-app notification |
| Template rendering lỗi | Log error, FAILED, admin review |
| Redis/Queue down | Circuit breaker, notification lưu DB pending |

---

## 7. API Contract

### Internal Service Interface

```typescript
interface NotificationChannel {
  send(message: NotificationMessage): Promise<void>;
}

interface NotificationMessage {
  to: string;        // email, phone, pushToken, userId
  subject: string;
  body: string;
  templateData?: Record<string, unknown>;
}
```

### Notification Types

| Type | Trigger | Channels |
|---|---|---|
| `ticket_confirmation` | Payment completed | In-app + Email |
| `reminder_24h` | 24h before concert | In-app + Email |
| `checkin_alert` | Check-in event | In-app |
| `concert_cancelled` | Concert cancelled | In-app + Email |
| `refund_processed` | Refund completed | In-app + Email |

---

## 8. Tiêu chí chấp nhận

- Notification gửi được sau khi thanh toán thành công
- Reminder gửi đúng 24h trước concert
- Retry 3 lần khi email service down
- Không gửi duplicate notification cho cùng event + user
- Ghi log đầy đủ trạng thái gửi
