# Đặc tả: Offline Check-in

## 1. Mô tả

Nhân sự soát vé (vai trò `checker`) dùng mobile app/PWA để quét QR e-ticket. App phải hoạt động được khi mất mạng và đồng bộ lại khi có kết nối.

## 2. Luồng online

1. `checker` đăng nhập mobile app.
2. `checker` chọn cấu hình concert/gate trên UI (chỉ là cấu hình hiển thị và vận hành thực tế trên giao diện, không phải là phân quyền).
3. `checker` quét QR.
4. App gửi request tới backend.
5. Backend verify QR, kiểm tra quyền `checker` (permission `checkin:scan`) và trạng thái ticket.
6. Nếu ticket active, backend update ticket thành used.
7. App hiển thị check-in thành công.

## 2.1 Hiệu năng

- Giao diện dễ nhìn ban đêm.
- Mạng chậm 5s -> mobile tự rớt xuống offline.
- Quét 10,000 vé trong 2 giờ -> server không quá tải DB connection (dùng redis/pgbouncer).

## 3. Luồng offline

1. Trước sự kiện, app đồng bộ khoá bí mật dùng chung (ticketSecret/publicKey) và tải danh sách vé (ticket/guest snapshot) để lưu vào SQLite local.
2. Khi mất mạng, `checker` vẫn quét QR.
3. App verify chữ ký QR offline sử dụng thuật toán đối xứng HMAC-SHA256 (HS256) với khoá bí mật đã tải về.
4. App kiểm tra local database SQLite (`ticket_snapshot`) xem vé đã ở trạng thái `USED` hoặc `TEMP_ACCEPTED` chưa.
5. App lưu check-in event vào local queue trong AsyncStorage (key `offline_checkin_queue`).
6. App hiển thị trạng thái “Tạm chấp nhận offline” (Result với trạng thái `TEMP_ACCEPTED`).
7. Khi có mạng, app gửi batch sync lên endpoint `/checkin/sync`.
8. Server xử lý từng event idempotently.
9. Server trả kết quả accepted/rejected/conflict.
10. App cập nhật local status trong SQLite (`ticket_snapshot` thành `USED` nếu sync thành công hoặc conflict) và xóa item khỏi AsyncStorage queue.

## 4. Kịch bản lỗi

| Tình huống | Xử lý |
|---|---|
| QR sai chữ ký | Từ chối ngay (verify HMAC-SHA256 thất bại) |
| QR hết hạn/sai concert | Từ chối |
| Ticket đã quét trên cùng thiết bị | Cảnh báo trùng (trạng thái `TEMP_ACCEPTED` hoặc `USED` trong SQLite) |
| Ticket đã used trên server | Reject/Conflict khi sync |
| Hai thiết bị offline cùng quét một vé | Server accept event đầu tiên sync, event sau báo CONFLICT |
| App mất mạng khi sync | Giữ local queue trong AsyncStorage và retry sau |

## 5. Ràng buộc

- Mỗi local event có `client_event_id` (được sinh ngẫu nhiên hoặc theo dạng `scan-timestamp`).
- Server dùng `(device_id, client_event_id)` trên bảng `CheckinEvent` để thực hiện idempotency.
- Không xóa local queue trong AsyncStorage cho đến khi server ACK (sync thành công hoặc báo conflict/reject rõ ràng).
- Offline không thể chống double-scan tuyệt đối giữa nhiều thiết bị; hệ thống phát hiện và ghi log khi sync.
- Quyền truy cập API check-in của `checker` bao gồm các permission:
  * `ticket:verify`
  * `checkin:scan`
  * `checkin:sync`
  * `checkin:snapshot_read`

## 6. Tiêu chí chấp nhận

- App quét được QR khi mất mạng.
- Dữ liệu offline không mất sau khi đóng app.
- Sync lại không tạo duplicate check-in event.
- Vé đã used không thể accepted lần hai trên server.

## 7. API Endpoints

### `POST /checkin/scan`
- **Mô tả:** Gửi yêu cầu check-in online cho một vé.
- **Request Payload:**
  ```json
  {
    "qrCodeData": "TKB-VIP-001",
    "staffId": "uuid",
    "concertId": "uuid",
    "deviceId": "device-uuid",
    "clientEventId": "scan-12345"
  }
  ```
- **Response:** Trả về TicketInfo cùng `status` (SUCCESS/DUPLICATE/NOT_FOUND).

### `POST /checkin/sync`
- **Mô tả:** Đồng bộ danh sách check-in offline lên server.
- **Request Payload:**
  ```json
  {
    "items": [
      {
        "ticketId": "uuid",
        "qrCodeData": "TKB-VIP-001",
        "concertId": "uuid",
        "staffId": "uuid",
        "sourceDeviceId": "device-uuid",
        "checkedAt": "ISOString"
      }
    ]
  }
  ```
- **Response:** Danh sách trạng thái đồng bộ cho từng vé (`SYNCED`/`FAILED`).
