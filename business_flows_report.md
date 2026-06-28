# 5. Mô tả các luồng nghiệp vụ quan trọng

Hệ thống TicketBox được thiết kế với tính mở rộng và khả năng xử lý lỗi toàn vẹn. Dưới đây là mô tả chi tiết của 3 luồng nghiệp vụ xương sống của hệ thống.

---

## 5.1. Luồng mua vé (Tạo đơn hàng & Phát hành E-Ticket)

Luồng mua vé bao phủ từ lúc khách hàng bắt đầu giữ chỗ đến khi hệ thống phát hành mã QR định danh (E-ticket).

### 5.1.1. Các bước xử lý
1. **Giữ vé (Reservation):** Khi User bấm "Mua vé" trên Frontend, yêu cầu tạo Reservation được gửi lên Backend. Backend sử dụng Transaction để kiểm tra số lượng vé khả dụng (`remaining`) của hạng vé (TicketType) và tạo mới bản ghi `Reservation` với trạng thái `HELD`. Số lượng vé khả dụng được trừ đi.
2. **Khởi tạo thanh toán:** User chọn cổng thanh toán (VD: VNPAY) và xác nhận. Backend tạo hóa đơn (`Order`) liên kết với Reservation, định cấu hình `idempotency_key`, và sinh URL thanh toán để Frontend redirect khách hàng sang cổng VNPAY.
3. **Thực thi thanh toán & Xử lý Webhook:** Khách hàng thanh toán trên ứng dụng ngân hàng. Khi thành công, cổng thanh toán gửi Webhook bất đồng bộ về Backend. Backend kiểm tra tính toàn vẹn (Signature/Hash) của payload.
4. **Phát hành vé (E-ticket Issue):** Sau khi xác nhận thanh toán thành công, Order chuyển sang `PAID`. Backend khởi tạo E-ticket (`Ticket`). 
5. **Ký số QR Code:** Để đảm bảo tính bảo mật và chống giả mạo offline, Backend dùng thuật toán **RS256 (Asymmetric)** với khóa Private Key để ký (sign) payload thông tin vé (chứa Ticket ID, Concert ID, Event ID). Mã Token JWS này được trả về Frontend dưới dạng QR Code.

### 5.1.2. Các thành phần tham gia
- **Frontend / Client:** Giao diện đặt vé và hiển thị QR sau cùng.
- **Backend (API):** Xử lý business logic, transaction, chữ ký điện tử.
- **PostgreSQL:** Lưu trữ trạng thái vé (Inventory) và Đơn hàng.
- **Cổng thanh toán (VNPAY/MoMo):** Xác thực tài chính.
- **Redis & BullMQ:** Quản lý hàng đợi xử lý sự kiện webhook (tùy chọn).

### 5.1.3. Xử lý khi có lỗi xảy ra
- **Khách hàng không thanh toán hoặc bỏ ngang:** Bản ghi `Reservation` có thời gian hết hạn (ví dụ 15 phút). Một tiến trình chạy ngầm (CronJob) sẽ quét các Reservation quá hạn, chuyển sang `EXPIRED`, và cộng lại số lượng vé (`remaining`) vào kho để người khác mua.
- **Webhook đến muộn hoặc lặp lại (Network Retry):** Backend sử dụng `idempotency_key` (Mã tham chiếu thanh toán kết hợp Hash Payload). Khi nhận Webhook, hệ thống kiểm tra nếu mã này đã xử lý thành công (Status = `COMPLETED`) thì trả về HTTP 200 mà không cập nhật DB, tránh phát hành trùng vé.

---

## 5.2. Luồng soát vé khi mất mạng (Offline Sync)

Do đặc thù ở sân vận động lớn thường nghẽn sóng 4G/WiFi, Mobile App dành cho nhân viên soát vé (Checker) phải có khả năng hoạt động Offline hoàn toàn.

### 5.2.1. Các bước xử lý
1. **Đồng bộ trước sự kiện (Pre-fetch / Caching):** Khi còn mạng, Mobile App tải danh sách toàn bộ vé (`ticket_snapshot`), danh sách khách mời (`guest_snapshot`) và đặc biệt là **Public Key** của sự kiện về lưu trữ cục bộ vào cơ sở dữ liệu **SQLite**.
2. **Quét vé Offline (Offline Scan):** Khi máy ảnh quét mã QR, App sử dụng Public Key đã lưu để Verify (giải mã chữ ký) thuật toán RSA của JWT Token.
3. **Ghi nhận Offline (Local Log):**
   - Nếu vé hợp lệ và không trùng trong `ticket_snapshot` cục bộ: App báo XANH (Thành công), cập nhật trạng thái tạm thành `TEMP_ACCEPTED`, ghi bản ghi check-in vào bảng `checkin_log` (SQLite) với trạng thái `PENDING`.
4. **Đồng bộ về Server (Sync):** Khi có mạng trở lại, Checker bấm đồng bộ (hoặc app tự chạy ngầm). App gom danh sách các bản ghi `PENDING` (kèm thông tin cổng kiểm soát `gate`, `clientEventId`, `qrCodeData`) gửi lên Backend qua API `/checkin/sync`. Backend lưu `CheckinEvent` chính thức.

### 5.2.2. Các thành phần tham gia
- **Check-in Mobile App:** Chứa DB SQLite (`concert_cache`, `checkin_log`) và module thuật toán ký số `node-forge`.
- **Backend API:** Cấp Public Key và tiếp nhận endpoint Bulk Sync.

### 5.2.3. Xử lý khi có lỗi xảy ra
- **Vé giả mạo chữ ký:** Public Key verify sẽ thất bại ngay lập tức mà không cần gọi API. Hệ thống chặn vé đỏ (Invalid).
- **Trùng lặp vé giữa hai máy khi Offline (Conflict):** Ví dụ vé A được in làm 2 bản, một người quét cổng 1, một người quét cổng 2. Lúc đồng bộ, Backend sẽ xác định vé A đã có `CheckinEvent` của người đầu tiên. Lệnh đồng bộ thứ hai sẽ bị từ chối với status `CONFLICT`. Hệ thống giữ vé ở trạng thái đã sử dụng, thông báo cho quản lý qua màn hình Sync Log để xử lý sự cố tại hiện trường.

---

## 5.3. Luồng nhập danh sách khách mời từ CSV

Ngoài vé bán qua luồng thương mại, hệ thống hỗ trợ Import danh sách khách mời (Sponsors, VIPs) với số lượng lớn lên tới vài ngàn dòng qua file CSV.

### 5.3.1. Các bước xử lý
1. **Upload File:** Admin tại hệ thống quản trị chọn file CSV tải lên. Backend nhận file, lưu vào bộ nhớ hoặc Cloud Storage (S3), và tạo bản ghi `GuestImportBatch` với trạng thái `PENDING`.
2. **Đẩy vào Hàng đợi (Message Queue):** Backend đưa ID của batch này vào hàng đợi Redis (BullMQ) để xử lý bất đồng bộ (Asynchronous Worker). Điều này giúp API trả về thành công ngay lập tức mà không để giao diện bị "treo" khi file lớn.
3. **Xử lý ngầm (Background Worker):** 
   - Worker nhận Job từ Queue, parse từng dòng trong file CSV.
   - Xác thực: Trùng lặp Email/Số điện thoại, kiểm tra định dạng tên, mã Guest Code.
   - Ghi nhận trạng thái cho mỗi dòng vào `GuestImportRow` (`VALID`, `INVALID`, `DUPLICATE`).
4. **Hoàn tất (Completion):** Gom tất cả các dòng `VALID` và chèn hàng loạt (Bulk Insert) vào bảng `GuestList`. Cập nhật `GuestImportBatch` sang trạng thái `COMPLETED` hoặc `PARTIAL`.

### 5.3.2. Các thành phần tham gia
- **Admin Dashboard (Web):** Giao diện gửi file và xem báo cáo.
- **Backend API & Worker:** Chịu trách nhiệm nhận yêu cầu và xử lý job.
- **Redis Queue (BullMQ):** Hàng đợi điều phối task.
- **PostgreSQL:** Lưu trữ trạng thái batch, báo cáo lỗi và danh sách khách mời.

### 5.3.3. Xử lý khi có lỗi xảy ra
- **Dữ liệu CSV bị sai cấu trúc / dòng bị lỗi:** Worker không hủy toàn bộ tiến trình. Dòng lỗi bị gắn nhãn `INVALID` kèm message `errorMessage` rõ ràng. Tiến trình vẫn tiếp tục cho các dòng hợp lệ. Giao diện có thể hiển thị báo cáo chi tiết để tải xuống chỉnh sửa.
- **Worker bị tắt đột ngột (Crash / Out of memory):** Redis MQ có cơ chế theo dõi Timeout & Retry (Active/Stalled Job). Job đang xử lý dở sẽ tự động được gán lại cho Worker khác sau khi Worker cũ hết timeout.
- **Trùng lặp dữ liệu trong lúc Retry:** Bulk insert sử dụng tính năng "Upsert" hoặc transaction để đảm bảo nếu quá trình chèn bị chạy lại, các mã `guest_code` không bị nhân bản (Idempotency ở mức database bằng UNIQUE constraint).
