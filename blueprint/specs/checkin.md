# Đặc tả: Offline Check-in

## 1. Mô tả

Nhân sự soát vé (vai trò `checker`) dùng mobile app/PWA để quét QR e-ticket. App phải hoạt động được khi mất mạng và đồng bộ lại khi có kết nối.

## 2. Luồng online

1. `checker` đăng nhập mobile app.
2. `checker` chọn cấu hình concert/gate trên UI (chỉ là cấu hình hiển thị và vận hành thực tế trên giao diện, không phải là phân quyền).
3. `checker` quét QR (vé JWT hoặc mã VIP).
4. App gửi request tới backend thông qua `apiService`.
5. Backend verify QR, kiểm tra quyền `checker` (permission `checkin:scan`) và trạng thái vé/VIP.
6. Nếu vé active, backend update vé thành used.
7. App hiển thị kết quả quét vé (Thành công, Trùng vé, Sai cổng, Không tìm thấy).

## 2.1 Hiệu năng & Khả năng chịu lỗi

- Giao diện tối màu (Dark mode) dễ nhìn ban đêm.
- **Client-Side Circuit Breaker:** App triển khai bộ ngắt mạch tự động trên API Client. Nếu mạng chậm hoặc request bị timeout 3 lần liên tiếp (Failure Threshold), bộ ngắt mạch chuyển sang trạng thái `OPEN` và ép app chuyển hẳn sang chế độ Offline (0 giây chờ). Sau 1 khoảng thời gian (VD: 1 phút `RESET_TIMEOUT`), nó chuyển sang `HALF-OPEN` để thử lại ping mạng.
- Quét 10,000 vé trong 2 giờ -> server không quá tải DB connection (dùng redis/pgbouncer).

## 3. Luồng offline

1. Trước sự kiện, app gọi API `/checkin/events/:id/snapshot` để tải: danh sách vé (`tickets`), danh sách VIP (`guests`), và khoá công khai (`publicKey`). Dữ liệu được lưu vào SQLite cục bộ (`ticket_snapshot`, `guest_snapshot`, `concert_cache`).
2. Khi mất mạng (hoặc bị Circuit Breaker ngắt), `checker` vẫn quét QR.
3. **Vé Thường (JWT):** App verify chữ ký QR offline sử dụng thuật toán HMAC-SHA256 (HS256) với khoá bí mật/công khai đã tải về.
4. **Khách VIP (Fallback):** Nếu chữ ký không hợp lệ, app tra cứu trực tiếp trong bảng `guest_snapshot` bằng `guestCode`.
5. App kiểm tra cổng (Gate) và trạng thái (đã `USED` hoặc `TEMP_ACCEPTED` chưa). Nếu hợp lệ, đổi local status sang `TEMP_ACCEPTED`.
6. App lưu check-in event vào local queue trong AsyncStorage (key `offline_checkin_queue`).
7. App hiển thị trạng thái “Tạm chấp nhận offline” (Result với trạng thái `TEMP_ACCEPTED` hoặc `ACCEPTED_GUEST`).

## 3.1 Bulk Sync Pattern

1. Khi mạng có lại, quy trình `Background Sync` sẽ lấy các bản ghi từ `offline_checkin_queue`.
2. **Chunking/Batching:** App chỉ lấy tối đa 100 vé mỗi lần gửi lên server để đồng bộ (`/checkin/sync`). Gửi thành công lô này mới tiếp tục lô khác để bảo vệ server khỏi tải trọng đột biến (Spike load).
3. Server xử lý từng event idempotently.
4. App cập nhật local status trong SQLite (`ticket_snapshot` / `guest_snapshot` thành `CHECKED_IN` nếu sync thành công) và xóa item khỏi AsyncStorage.

## 4. Kịch bản lỗi

| Tình huống | Xử lý |
|---|---|
| QR sai chữ ký / sai định dạng | Từ chối (báo Không hợp lệ/Không tìm thấy) |
| Ticket/Guest sai cổng (Gate) | Cảnh báo sai khu vực/cổng (`WRONG_ZONE`) |
| Ticket/Guest đã quét trên cùng thiết bị | Cảnh báo trùng (`DUPLICATE` / `DUPLICATE_GUEST`) |
| Ticket/Guest đã used trên server | Reject/Conflict khi sync |
| Hai thiết bị offline cùng quét | Server accept event đầu tiên sync, event sau báo CONFLICT |
| App mất mạng khi sync | Giữ local queue trong AsyncStorage và retry sau |

## 5. Ràng buộc

- Mỗi local event sinh ngẫu nhiên `id` (dạng UUID/Timestamp).
- Server dùng `(sourceDeviceId, ticketId, checkedAt)` hoặc `clientEventId` để thực hiện idempotency.
- Không xóa local queue trong AsyncStorage cho đến khi server ACK (sync thành công hoặc báo lỗi rõ ràng có thể xử lý).
- Offline không thể chống double-scan tuyệt đối giữa nhiều thiết bị; hệ thống phát hiện và ghi log khi sync.

## 6. Tiêu chí chấp nhận

- App quét được QR khi mất mạng.
- Dữ liệu offline không mất sau khi đóng app.
- Sync lại không tạo duplicate check-in event.
- Vé đã used không thể accepted lần hai trên server.

## 7. API Endpoints

### `POST /checkin/scan`
- **Mô tả:** Gửi yêu cầu check-in online cho một vé JWT hoặc vé VIP.
- **Request Payload:**
  ```json
  {
    "qrCodeData": "TKB-VIP-001",
    "staffId": "uuid",
    "concertId": "uuid",
    "deviceId": "device-uuid"
  }
  ```

### `GET /checkin/events/:id/snapshot`
- **Mô tả:** Tải dữ liệu vé, khách VIP và khóa công khai để chạy offline.
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "tickets": [{ "id": "...", "ticketCode": "...", "status": "..." }],
      "guests": [{ "id": "...", "guestCode": "...", "status": "..." }],
      "publicKey": "...",
      "version": "1.0"
    }
  }
  ```

### `POST /checkin/sync`
- **Mô tả:** Đồng bộ danh sách check-in offline lên server theo từng lô (batch).
- **Request Payload:**
  ```json
  {
    "items": [
      {
        "ticketId": "uuid",
        "ticketCode": "CODE123",
        "qrCodeData": "...",
        "concertId": "uuid",
        "staffId": "uuid",
        "sourceDeviceId": "device-uuid",
        "checkedAt": "ISOString"
      }
    ]
  }
  ```
