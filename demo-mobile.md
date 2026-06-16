# Hướng dẫn Demo Mobile Check-in & Backend Integration (Người D)

## 1. Chuẩn bị môi trường

1. Mở terminal, di chuyển vào thư mục backend `cd apps/be`. Sau đó chạy lệnh `npx prisma db push` để đảm bảo Database schema đã được push.
2. Mở ứng dụng mobile qua Expo Go hoặc emulator (`npx expo start`).
3. Khởi tạo một số vé hợp lệ vào Database. Chạy đoạn script Prisma sau (có thể gõ vào REPL hoặc seed):
   ```js
   const user = await prisma.user.create({ data: { email: 'staff-001@ticketbox.vn', fullName: 'Checker' }});
   const concert = await prisma.concert.create({ data: { name: 'Sơn Tùng M-TP - Sky Tour 2026', venueName: 'SVĐ', venueAddress: 'HN', eventDate: new Date() }});
   const order = await prisma.order.create({ data: { userId: user.id, concertId: concert.id, reservationId: '...', idempotencyKey: '...', totalAmount: 0, expiresAt: new Date() }});
   const type = await prisma.ticketType.create({ data: { concertId: concert.id, name: 'VIP', price: 0, totalQuantity: 100, remaining: 100 }});
   
   // Tạo vé Hợp lệ
   await prisma.ticket.create({ data: { orderId: order.id, ticketTypeId: type.id, ownerUserId: user.id, ticketCode: 'TKB-2026-VIP-001', qrPayload: 'TKB-2026-VIP-001', status: 'ACTIVE' }});
   // Tạo vé Đã Check-in
   await prisma.ticket.create({ data: { orderId: order.id, ticketTypeId: type.id, ownerUserId: user.id, ticketCode: 'TKB-2026-SVIP-002', qrPayload: 'TKB-2026-SVIP-002', status: 'USED' }});
   ```

## 2. Kịch bản Demo: Online Check-in

1. **Đăng nhập**: Mở app, nhập `staff-001@ticketbox.vn` / `mật khẩu`. Bấm **Bắt đầu ca trực**.
2. **Scan vé hợp lệ**: 
   - Trên màn hình Scanner, bấm chọn "Hợp lệ" (giả lập quét mã `TKB-2026-VIP-001`).
   - Kết quả hiển thị **ACCEPTED** (Xanh lá). Chuyển về DB, vé đã thành `USED`.
3. **Scan vé trùng**: 
   - Quay lại Scanner, bấm "Đã check-in" (quét mã `TKB-2026-SVIP-002` hoặc mã VIP 001 vừa quét xong).
   - Kết quả hiển thị **DUPLICATE** (Cam).
4. **Scan vé sai/không tồn tại**:
   - Bấm "Không tồn tại" hoặc "Sai sự kiện".
   - Kết quả hiển thị **NOT_FOUND** / **REJECTED** (Đỏ).

## 3. Kịch bản Demo: Offline Sync

1. Tắt kết nối WiFi/4G trên Emulator/Thiết bị di động hoặc ngắt backend.
2. Trên màn hình Scanner, bấm "Hợp lệ".
3. Lúc này do không thể kết nối server, app sẽ hiển thị màn hình Result báo Offline Mode nhưng vẫn chấp nhận cho khách vào cổng (`SUCCESS`).
4. Vé được lưu vào Queue. 
5. Bật lại mạng.
6. Chuyển sang màn hình **Queue**, thấy có vé đang Pending.
7. Bấm **Sync Data**. Các vé pending sẽ được gửi lên `/checkin/sync`. Trạng thái chuyển thành `SYNCED` hoặc `FAILED` nếu có lỗi.

## 4. Kịch bản Demo: Các API Skeletons

Dùng Postman hoặc CURL gọi vào các endpoint:

**A. AI Artist Bio**
```bash
curl -X POST http://localhost:3000/ai-bio/upload -F "concertId=uuid" -F "file=@/path/to/bio.pdf"
```
Quan sát console backend: *"Processing PDF for concert..."* và sau 2s báo mock background worker hoàn thành.

**B. CSV Guest List**
```bash
curl -X POST http://localhost:3000/guest-list/import -F "concertId=uuid" -F "file=@/path/to/guests.csv"
```
Kết quả trả về: `{ imported: 2, duplicates: 0, errors: 0 }`.

**C. Notification**
```bash
# Không có endpoint trực tiếp, hàm được gọi nội bộ khi có trigger.
# Bạn có thể inject NotificationsService và gọi sendNotification() để thấy log và record DB.
```
