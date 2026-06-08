# Đặc tả: Offline Check-in (Chi tiết)

## 1. Mô tả

Nhân sự soát vé dùng mobile app Expo React Native để quét QR e-ticket. App phải hoạt động được khi mất mạng (offline-first) và đồng bộ lại khi có kết nối. Dữ liệu offline được lưu bằng **SQLite** trên thiết bị.

---

## 2. Local SQLite Schema

### 2.1 Bảng `checkin_log`

Lưu trữ tất cả sự kiện check-in tại local.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | TEXT (UUID) | Primary Key, tạo bởi client |
| `ticketId` | TEXT | ID vé được quét |
| `qrCodeData` | TEXT | Dữ liệu QR code thô |
| `concertId` | TEXT | Concert đang check-in |
| `staffId` | TEXT | Nhân viên soát vé |
| `sourceDeviceId` | TEXT | ID thiết bị |
| `checkedAt` | TEXT (ISO 8601) | Thời điểm quét (client time) |
| `syncStatus` | TEXT | `PENDING` / `SYNCED` / `FAILED` |
| `syncAttempts` | INTEGER | Số lần thử sync (mặc định 0) |
| `lastSyncError` | TEXT (nullable) | Lỗi sync gần nhất |
| `serverCheckinId` | TEXT (nullable) | ID check-in trên server (sau khi sync) |
| `createdAt` | TEXT (ISO 8601) | Thời điểm tạo bản ghi |

```sql
CREATE TABLE IF NOT EXISTS checkin_log (
  id TEXT PRIMARY KEY,
  ticketId TEXT NOT NULL,
  qrCodeData TEXT NOT NULL,
  concertId TEXT NOT NULL,
  staffId TEXT NOT NULL,
  sourceDeviceId TEXT NOT NULL,
  checkedAt TEXT NOT NULL,
  syncStatus TEXT NOT NULL DEFAULT 'PENDING',
  syncAttempts INTEGER NOT NULL DEFAULT 0,
  lastSyncError TEXT,
  serverCheckinId TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_checkin_log_sync ON checkin_log(syncStatus);
CREATE INDEX idx_checkin_log_ticket ON checkin_log(ticketId);
CREATE UNIQUE INDEX idx_checkin_log_device_ticket ON checkin_log(sourceDeviceId, ticketId);
```

### 2.2 Bảng `concert_cache`

Cache thông tin concert để hiển thị khi offline.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | TEXT (UUID) | Primary Key (concert ID) |
| `name` | TEXT | Tên concert |
| `eventDate` | TEXT (ISO 8601) | Ngày sự kiện |
| `venueName` | TEXT | Địa điểm |
| `ticketTypes` | TEXT (JSON) | Danh sách loại vé (JSON string) |
| `lastSyncedAt` | TEXT (ISO 8601) | Lần sync gần nhất |

```sql
CREATE TABLE IF NOT EXISTS concert_cache (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  eventDate TEXT NOT NULL,
  venueName TEXT NOT NULL,
  ticketTypes TEXT NOT NULL DEFAULT '[]',
  lastSyncedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 2.3 Bảng `sync_log`

Ghi lại lịch sử các lần sync với server.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | TEXT (UUID) | Primary Key |
| `syncedAt` | TEXT (ISO 8601) | Thời điểm sync |
| `recordCount` | INTEGER | Số bản ghi được sync |
| `successCount` | INTEGER | Số thành công |
| `failedCount` | INTEGER | Số thất bại |
| `status` | TEXT | `SUCCESS` / `FAILED` / `PARTIAL` |
| `errorMessage` | TEXT (nullable) | Lỗi tổng quan (nếu có) |

```sql
CREATE TABLE IF NOT EXISTS sync_log (
  id TEXT PRIMARY KEY,
  syncedAt TEXT NOT NULL DEFAULT (datetime('now')),
  recordCount INTEGER NOT NULL DEFAULT 0,
  successCount INTEGER NOT NULL DEFAULT 0,
  failedCount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  errorMessage TEXT
);
```

---

## 3. Luồng Online/Offline

### Trường hợp 1: Online — Quét mã khi có mạng

```
Staff quét QR
  → App parse QR data
  → App gọi POST /checkin/scan { qrCodeData, staffId, concertId }
  → Server verify ticket:
      ├─ Ticket active → Accept, update ticket.status = 'used'
      │   → Response: { success: true, data: { ticketId, status: 'SUCCESS', checkedInAt } }
      │   → App hiển thị ✅ Check-in thành công
      │   → KHÔNG lưu local (đã xử lý trên server)
      │
      ├─ Ticket đã used → Reject duplicate
      │   → Response: { success: true, data: { ticketId, status: 'DUPLICATE' } }
      │   → App hiển thị ⚠️ Vé đã check-in
      │
      ├─ Ticket không tồn tại → Not found
      │   → Response: { success: false, message: 'Ticket not found' }
      │   → App hiển thị ❌ Vé không tồn tại
      │
      └─ Ticket sai concert → Wrong event
          → Response: { success: true, data: { ticketId, status: 'WRONG_EVENT' } }
          → App hiển thị 🚫 Vé sai sự kiện

  → Nếu API call thất bại (network error, timeout):
      → Lưu vào checkin_log với syncStatus = 'PENDING'
      → Hiển thị badge "Offline mode"
```

### Trường hợp 2: Offline — Mất mạng

```
Staff quét QR khi KHÔNG có kết nối mạng
  → App detect: Không có mạng
  → App verify QR chữ ký offline (nếu đã tải public key)
  → App kiểm tra checkin_log: ticketId đã quét trên thiết bị này chưa?
      ├─ Đã quét → Cảnh báo: "Vé đã được quét trên thiết bị này"
      └─ Chưa quét:
          → Tạo bản ghi mới trong checkin_log:
              - id: UUID v4 (client-generated)
              - syncStatus: 'PENDING'
              - syncAttempts: 0
          → Hiển thị: "✅ Tạm chấp nhận – Offline mode"
          → Hiển thị badge: "Offline – sẽ tự động sync"
```

### Trường hợp 3: Sync — Có mạng lại

```
App phát hiện kết nối mạng khôi phục
  → Query checkin_log WHERE syncStatus IN ('PENDING', 'FAILED')
  → Nếu có bản ghi:
      → Gửi batch: POST /checkin/sync
          Body: { items: [{ ticketId, qrCodeData, concertId, staffId, sourceDeviceId, checkedAt }] }
      → Server xử lý từng item idempotently:
          - Dùng (sourceDeviceId, ticketId) để tránh duplicate
          - Check ticket status trên server
          - Trả results: [{ ticketId, status: 'SYNCED'|'REJECTED', serverId }]
      → App cập nhật checkin_log:
          - SYNCED → syncStatus = 'SYNCED', serverCheckinId = serverId
          - REJECTED → syncStatus = 'FAILED', lastSyncError = reason
      → Ghi sync_log: thời gian, số lượng, kết quả
      → Retry nếu thất bại:
          - Tối đa 3 lần (syncAttempts < 3)
          - Delay giữa mỗi lần: 5s → 15s → 30s (exponential backoff)
          - Sau 3 lần → syncStatus = 'FAILED', chờ sync thủ công
```

### Trường hợp 4: Chống Duplicate

```
Kiểm tra duplicate có 2 tầng:

1. Offline (Client-side):
   → Trước khi lưu vào checkin_log
   → Query: SELECT * FROM checkin_log WHERE ticketId = ? AND sourceDeviceId = ?
   → Nếu tìm thấy → Cảnh báo duplicate, KHÔNG lưu thêm
   → Hạn chế: Chỉ chống duplicate trên CÙNG thiết bị

2. Online (Server-side):
   → Khi nhận sync batch
   → Server check: ticket.status === 'used'?
   → Dùng UNIQUE constraint: (device_id, client_event_id) trên bảng checkin_events
   → Nếu ticket đã used:
       - Reject bản ghi
       - Ghi audit/fraud log
       - Vé nào sync thành công đầu tiên được accept
       - Các bản ghi sau bị reject với reason: 'CONFLICT'

Lưu ý: Khi nhiều thiết bị offline cùng quét 1 vé, KHÔNG thể chống
trùng realtime. Hệ thống xử lý conflict khi sync và ghi log.
```

---

## 4. Pseudo-code Sync

```typescript
async function syncOfflineCheckins(): Promise<SyncResult> {
  // 1. Lấy tất cả bản ghi chưa sync
  const pendingItems = await db.query(
    `SELECT * FROM checkin_log
     WHERE syncStatus IN ('PENDING', 'FAILED')
       AND syncAttempts < 3
     ORDER BY checkedAt ASC`
  );

  if (pendingItems.length === 0) {
    return { synced: 0, failed: 0 };
  }

  // 2. Chuẩn bị payload
  const payload = {
    items: pendingItems.map(item => ({
      ticketId: item.ticketId,
      qrCodeData: item.qrCodeData,
      concertId: item.concertId,
      staffId: item.staffId,
      sourceDeviceId: item.sourceDeviceId,
      checkedAt: item.checkedAt,
    })),
  };

  let syncedCount = 0;
  let failedCount = 0;

  try {
    // 3. Gửi batch lên server
    const response = await api.post('/checkin/sync', payload);

    if (response.success) {
      // 4. Cập nhật từng bản ghi theo kết quả
      for (const result of response.data.results) {
        const localItem = pendingItems.find(i => i.ticketId === result.ticketId);
        if (!localItem) continue;

        if (result.status === 'SYNCED') {
          await db.run(
            `UPDATE checkin_log
             SET syncStatus = 'SYNCED',
                 serverCheckinId = ?,
                 syncAttempts = syncAttempts + 1
             WHERE id = ?`,
            [result.serverId, localItem.id]
          );
          syncedCount++;
        } else {
          await db.run(
            `UPDATE checkin_log
             SET syncStatus = 'FAILED',
                 lastSyncError = ?,
                 syncAttempts = syncAttempts + 1
             WHERE id = ?`,
            [result.reason || 'Server rejected', localItem.id]
          );
          failedCount++;
        }
      }
    }
  } catch (error) {
    // 5. Lỗi mạng → tăng syncAttempts cho tất cả
    for (const item of pendingItems) {
      await db.run(
        `UPDATE checkin_log
         SET syncAttempts = syncAttempts + 1,
             lastSyncError = ?
         WHERE id = ?`,
        [error.message, item.id]
      );
    }
    failedCount = pendingItems.length;
  }

  // 6. Ghi sync log
  await db.run(
    `INSERT INTO sync_log (id, recordCount, successCount, failedCount, status)
     VALUES (?, ?, ?, ?, ?)`,
    [
      generateUUID(),
      pendingItems.length,
      syncedCount,
      failedCount,
      failedCount === 0 ? 'SUCCESS' : syncedCount === 0 ? 'FAILED' : 'PARTIAL',
    ]
  );

  return { synced: syncedCount, failed: failedCount };
}

// Auto-sync: Chạy khi phát hiện có mạng
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    syncOfflineCheckins();
  }
});

// Periodic sync: Chạy mỗi 30 giây khi app đang mở
setInterval(() => {
  if (isOnline) {
    syncOfflineCheckins();
  }
}, 30_000);
```

---

## 5. Flowchart tổng quan

```
┌─────────────┐
│  Staff quét  │
│   QR code    │
└──────┬──────┘
       │
       ▼
┌──────────────┐     Có      ┌──────────────────┐
│  Có mạng?    │────────────▶│  Gọi API /scan   │
└──────┬───────┘             └────────┬─────────┘
       │ Không                        │
       ▼                              ▼
┌──────────────┐             ┌──────────────────┐
│ Verify QR    │             │ Server xử lý     │
│ offline      │             │ (verify, update)  │
└──────┬───────┘             └────────┬─────────┘
       │                              │
       ▼                              ▼
┌──────────────┐             ┌──────────────────┐
│ Check local  │             │ Trả kết quả      │
│ duplicate    │             │ cho App           │
└──────┬───────┘             └──────────────────┘
       │
       ▼
┌──────────────┐
│ Lưu vào      │
│ checkin_log   │
│ (PENDING)     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Hiển thị     │
│ "Tạm chấp    │
│  nhận"       │
└──────┬───────┘
       │
       ▼ (Khi có mạng)
┌──────────────┐
│ Batch sync   │
│ POST /sync   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Cập nhật     │
│ local status │
└──────────────┘
```

---

## 6. Tiêu chí chấp nhận

- App quét được QR khi mất mạng
- Dữ liệu offline không mất sau khi đóng app (persist SQLite)
- Sync lại không tạo duplicate check-in event
- Vé đã used không thể accepted lần hai trên server
- Retry tối đa 3 lần với exponential backoff
- Chống duplicate trên cùng thiết bị (offline)
- Server phát hiện conflict khi nhiều thiết bị cùng quét (online)
