# BÁO CÁO CHI TIẾT MINH CHỨNG HOÀN THÀNH 38 YÊU CẦU ĐỒ ÁN (TICKETBOX)

Tài liệu này được biên soạn độc lập dựa trên việc rà soát và kiểm tra trực tiếp từng file code trong repository của dự án TicketBox, ánh xạ chính xác 100% các yêu cầu từ file Sheets chấm điểm (`checklistyeucau`) sang các file source code thực tế và link GitHub tương ứng.

---

## I. NHÓM BLUEPRINT (ĐẶC TẢ THIẾT KẾ & KIẾN TRÚC) — ĐÃ CÓ BẢN SPECS CHI TIẾT

| ID | Yêu cầu cần chứng minh | Minh chứng mong đợi | Trạng thái thực tế | Link/Path minh chứng trên GitHub |
| :--- | :--- | :--- | :---: | :--- |
| **`BP01`** | Tài liệu mô tả kiến trúc tổng thể, thành phần, giao tiếp, ảnh hưởng khi lỗi. | design.md/blueprint.pdf; lập luận lựa chọn kiến trúc | **Đã viết** | `https://github.com/pogdepZ/TicketBox/blob/main/blueprint/design.md` |
| **`BP02`** | C4 Level 1 – System Context: actors và hệ thống ngoài. | Sơ đồ + mô tả Khán giả, Ban tổ chức, Soát vé, VNPAY/MoMo, AI, CSV | **Đã viết** | `https://github.com/pogdepZ/TicketBox/blob/main/blueprint/design.md#1-sơ-đồ-bối-cảnh-hệ-thống-c4-context-diagram` |
| **`BP03`** | C4 Level 2 – Container: web, mobile, backend, database, broker/cache... | Sơ đồ có công nghệ và giao tiếp giữa container | **Đã viết** | `https://github.com/pogdepZ/TicketBox/blob/main/blueprint/design.md#2-sơ-đồ-container-c4-container-diagram` |
| **`BP04`** | High-Level Architecture Diagram, nhấn mạnh payment, AI, CSV và offline check-in. | Sơ đồ luồng dữ liệu/phụ thuộc và failure boundary | **Đã viết** | `https://github.com/pogdepZ/TicketBox/blob/main/blueprint/design.md` |
| **`BP05`** | Thiết kế dữ liệu: SQL/NoSQL/kết hợp và schema entity quan trọng. | ERD/schema + giải thích lựa chọn và consistency | **Đã viết** | `https://github.com/pogdepZ/TicketBox/blob/main/blueprint/design.md#3-thiết-kế-cơ-sở-dữ-liệu-database-design` |
| **`BP06`** | Luồng mua vé từ bấm mua đến nhận e-ticket; có xử lý lỗi giữa chừng. | Sequence/activity diagram hoặc mô tả bước + lỗi | **Đã viết** | `https://github.com/pogdepZ/TicketBox/blob/main/blueprint/specs/ticketing.md` |
| **`BP07`** | Luồng soát vé mất mạng và đồng bộ lại; tránh vé vào hai lần. | Sequence/state diagram + conflict handling | **Đã viết** | `https://github.com/pogdepZ/TicketBox/blob/main/blueprint/specs/checkin.md` |
| **`BP08`** | Luồng nhập Guest List CSV; xử lý file lỗi và dữ liệu trùng. | Flow + validation + idempotent import | **Đã viết** | `https://github.com/pogdepZ/TicketBox/blob/main/blueprint/specs/csv-import.md` |
| **`BP09`** | Thiết kế kiểm soát truy cập cho Khán giả, Ban tổ chức, Nhân sự soát vé. | Role-permission matrix + enforcement tại endpoint/UI/app | **Đã viết** | `https://github.com/pogdepZ/TicketBox/blob/main/blueprint/specs/auth.md` |
| **`BP10`** | Giải pháp tải đột biến/rate limiting cho 80.000 người trong 5 phút. | Thuật toán, ngưỡng, key giới hạn, hành vi khi vượt ngưỡng | **Đã viết** | `https://github.com/pogdepZ/TicketBox/blob/main/blueprint/specs/cache-rate-limit.md` |
| **`BP11`** | Circuit Breaker + Graceful Degradation khi VNPAY/MoMo lỗi. | Closed/Open/Half-Open, threshold, fallback | **Đã viết** | `https://github.com/pogdepZ/TicketBox/blob/main/blueprint/specs/payment.md` |
| **`BP12`** | Idempotency Key chống trừ tiền hai lần. | Cách sinh/lưu/check key, TTL, response khi lặp | **Đã viết** | `https://github.com/pogdepZ/TicketBox/blob/main/blueprint/specs/payment.md` |
| **`BP13`** | Caching cho danh sách/chi tiết concert và số vé còn lại. | Cache-aside, TTL từng loại, invalidation | **Đã viết** | `https://github.com/pogdepZ/TicketBox/blob/main/blueprint/specs/cache-rate-limit.md` |
| **`BP14`** | ADR cho các quyết định lớn và đánh đổi. | ADR SQL/NoSQL, JWT/session, broker, locking... | **Đã viết** | `https://github.com/pogdepZ/TicketBox/blob/main/blueprint/design.md#4-tài-liệu-quyết-định-kiến-trúc-adr` |
| **`BP15`** | Tổ chức proposal.md, design.md và specs/[feature].md. | Cấu trúc file đầy đủ, dạng tài liệu markdown rõ ràng | **Đã viết** | `https://github.com/pogdepZ/TicketBox/tree/main/blueprint` |

---

## II. NHÓM CÀI ĐẶT (MÃ NGUỒN PHẦN MỀM) — ĐA HOÀN THÀNH 100% TRONG CODE

### `IM01` — Xem danh sách/chi tiết concert, nghệ sĩ, địa điểm, sơ đồ SVG theo khu và vé còn lại
*   *Mô tả:* Giao diện và API đọc concert & sơ đồ SVG.
*   *File code triển khai:* Giao diện SVG tương tác tại [seat-map.tsx](file:///home/pognova/TicketBox/apps/fe/components/seat-map.tsx) và API đọc concert tại [concert.service.ts](file:///home/pognova/TicketBox/apps/be/src/routes/concert/concert.service.ts).
*   *GitHub Link:* `https://github.com/pogdepZ/TicketBox/blob/main/apps/fe/components/seat-map.tsx`

### `IM02` — Chọn loại/số lượng vé, thanh toán và sinh e-ticket QR
*   *Mô tả:* Luồng mua vé hoàn chỉnh tích hợp API backend thật và JWS QR Code.
*   *File code triển khai:* 
    *   Tạo Order: [orders.service.ts](file:///home/pognova/TicketBox/apps/be/src/routes/orders/orders.service.ts)
    *   Thanh toán: [payments.service.ts](file:///home/pognova/TicketBox/apps/be/src/routes/payments/payments.service.ts)
    *   Sinh vé: [tickets.service.ts](file:///home/pognova/TicketBox/apps/be/src/routes/tickets/tickets.service.ts)
*   *GitHub Link:* `https://github.com/pogdepZ/TicketBox/blob/main/apps/be/src/routes/tickets/tickets.service.ts`

### `IM03` — Enforce giới hạn vé/tài khoản trên toàn bộ đơn thành công, kể cả request đồng thời
*   *Mô tả:* Lock dòng `UserTicketQuota` FOR UPDATE để tránh race condition vượt quota.
*   *File code triển khai:* Hàm `lockOrUpsertQuota` tại [ticket-inventory.service.ts](file:///home/pognova/TicketBox/apps/be/src/routes/orders/ticket-inventory.service.ts#L128-L150).
*   *GitHub Link:* `https://github.com/pogdepZ/TicketBox/blob/main/apps/be/src/routes/orders/ticket-inventory.service.ts`

### `IM04` — Thông báo app/email sau mua và nhắc trước 24 giờ; dễ thêm kênh mới
*   *Mô tả:* Service gửi mail qua Nodemailer/Mailhog và cron nhắc nhở 24h.
*   *File code triển khai:* 
    *   Mailer: [mail.service.ts](file:///home/pognova/TicketBox/apps/be/src/common/mail/mail.service.ts)
    *   Remind Cron: [concert-reminder.job.ts](file:///home/pognova/TicketBox/apps/be/src/routes/notifications/concert-reminder.job.ts)
    *   Notification Worker: [notifications.processor.ts](file:///home/pognova/TicketBox/apps/be/src/routes/notifications/notifications.processor.ts)
*   *GitHub Link:* `https://github.com/pogdepZ/TicketBox/blob/main/apps/be/src/routes/notifications/concert-reminder.job.ts`

### `IM05` — Admin tạo/sửa/hủy concert, cấu hình loại vé và xem doanh thu/lượng bán
*   *Mô tả:* Trang quản trị concert, form thiết lập loại vé và Dashboard thống kê.
*   *File code triển khai:*
    *   Form quản trị concert: [page.tsx](file:///home/pognova/TicketBox/apps/fe/app/admin/concerts/%5Bid%5D/page.tsx)
    *   Dashboard doanh thu: [dashboard/page.tsx](file:///home/pognova/TicketBox/apps/fe/app/admin/dashboard/page.tsx)
*   *GitHub Link:* `https://github.com/pogdepZ/TicketBox/blob/main/apps/fe/app/admin/dashboard/page.tsx`

### `IM06` — RBAC được cài thật ở API, trang admin và app soát vé
*   *Mô tả:* JwtAuthGuard, RolesGuard và PermissionGuard bảo vệ tài nguyên.
*   *File code triển khai:* [permission.guard.ts](file:///home/pognova/TicketBox/apps/be/src/routes/auth/guard/permission.guard.ts) và [roles.guard.ts](file:///home/pognova/TicketBox/apps/be/src/routes/auth/guard/roles.guard.ts).
*   *GitHub Link:* `https://github.com/pogdepZ/TicketBox/blob/main/apps/be/src/routes/auth/guard/permission.guard.ts`

### `IM07` — Mobile app quét QR và xác nhận vé tại cổng
*   *Mô tả:* Nhận dạng QR và kiểm tra chữ ký online/offline, hiển thị màu Acceptance/Failure.
*   *File code triển khai:* [ScannerScreen.tsx](file:///home/pognova/TicketBox/apps/checkin-mobile/src/screens/ScannerScreen.tsx).
*   *GitHub Link:* `https://github.com/pogdepZ/TicketBox/blob/main/apps/checkin-mobile/src/screens/ScannerScreen.tsx`

### `IM08` — Soát vé offline, lưu tạm, đồng bộ khi có mạng, không mất dữ liệu/không vào hai lần
*   *Mô tả:* Sử dụng SQLite lưu trữ snapshot offline, verify chữ ký offline bằng public key local, batch sync logs lên backend.
*   *File code triển khai:* 
    *   SQLite Setup: [db.ts](file:///home/pognova/TicketBox/apps/checkin-mobile/src/services/db.ts)
    *   Offline Verify: [ScannerScreen.tsx](file:///home/pognova/TicketBox/apps/checkin-mobile/src/screens/ScannerScreen.tsx#L140-L162)
    *   Bulk Sync Queue: [OfflineQueueScreen.tsx](file:///home/pognova/TicketBox/apps/checkin-mobile/src/screens/OfflineQueueScreen.tsx)
*   *GitHub Link:* `https://github.com/pogdepZ/TicketBox/blob/main/apps/checkin-mobile/src/screens/OfflineQueueScreen.tsx`

### `IM09` — AI Artist Bio: upload PDF, tách/làm sạch text, gọi AI và tạo bio ngắn
*   *Mô tả:* Pipeline parsing PDF, gửi prompt summary LLM, cập nhật DB và invalidate cache.
*   *File code triển khai:* [ai-bio.processor.ts](file:///home/pognova/TicketBox/apps/be/src/routes/ai-bio/ai-bio.processor.ts).
*   *GitHub Link:* `https://github.com/pogdepZ/TicketBox/blob/main/apps/be/src/routes/ai-bio/ai-bio.processor.ts`

### `IM10` — Định kỳ nhập Guest List CSV; xử lý file lỗi, trùng và không làm gián đoạn hệ thống
*   *Mô tả:* Import guest list qua BullMQ worker, staging table, và cron job quét tự động.
*   *File code triển khai:* 
    *   BullMQ Parser: [guest-list.processor.ts](file:///home/pognova/TicketBox/apps/be/src/routes/guest-list/guest-list.processor.ts)
    *   Cron Quét Folder: [guest-list-import.job.ts](file:///home/pognova/TicketBox/apps/be/src/routes/guest-list/guest-list-import.job.ts)
*   *GitHub Link:* `https://github.com/pogdepZ/TicketBox/blob/main/apps/be/src/routes/guest-list/guest-list-import.job.ts`

### `IM11` — Không oversell vé cuối cùng khi nhiều người mua đồng thời
*   *Mô tả:* Khóa hàng bằng `SELECT FOR UPDATE` trên bảng `TicketType` trong transaction.
*   *File code triển khai:* [orders.service.ts](file:///home/pognova/TicketBox/apps/be/src/routes/orders/orders.service.ts).
*   *GitHub Link:* `https://github.com/pogdepZ/TicketBox/blob/main/apps/be/src/routes/orders/orders.service.ts`

### `IM12` — Cơ chế bảo vệ tải đột biến/rate limiting/bot-fairness cài trong code
*   *Mô tả:* Token Bucket Rate Limiting bằng Lua script nguyên tử trên Redis.
*   *File code triển khai:*
    *   Lua Script: [redis.service.ts](file:///home/pognova/TicketBox/apps/be/src/common/redis/redis.service.ts#L139)
    *   Order Check: [orders.service.ts](file:///home/pognova/TicketBox/apps/be/src/routes/orders/orders.service.ts#L82)
*   *GitHub Link:* `https://github.com/pogdepZ/TicketBox/blob/main/apps/be/src/routes/orders/orders.service.ts`

### `IM13` — Circuit Breaker và graceful degradation cài thật
*   *Mô tả:* Circuit breaker ngắt kết nối VNPay/MoMo và phản hồi lỗi 503 nhanh nếu có lỗi liên tiếp xảy ra.
*   *File code triển khai:* [payment-circuit-breaker.service.ts](file:///home/pognova/TicketBox/apps/be/src/routes/payments/payment-circuit-breaker.service.ts).
*   *GitHub Link:* `https://github.com/pogdepZ/TicketBox/blob/main/apps/be/src/routes/payments/payment-circuit-breaker.service.ts`

### `IM14` — Idempotency cài thật, cùng request không tạo/trừ tiền hai lần
*   *Mô tả:* Bắt buộc idempotency key cho orders và xử lý webhook thanh toán idempotent.
*   *File code triển khai:* [orders.service.ts](file:///home/pognova/TicketBox/apps/be/src/routes/orders/orders.service.ts) (phần check key/hash).
*   *GitHub Link:* `https://github.com/pogdepZ/TicketBox/blob/main/apps/be/src/routes/orders/orders.service.ts`

### `IM15` — Caching cài thật, có TTL/invalidation phù hợp
*   *Mô tả:* Cache-aside pattern với Redis cho list/detail concert, invalidation khi admin edit dữ liệu.
*   *File code triển khai:* [concert.service.ts](file:///home/pognova/TicketBox/apps/be/src/routes/concert/concert.service.ts#L1166).
*   *GitHub Link:* `https://github.com/pogdepZ/TicketBox/blob/main/apps/be/src/routes/concert/concert.service.ts`

### `IM16` — README đủ để clone và chạy không cần hỏi thêm
*   *Mô tả:* Hướng dẫn môi trường, ports, Docker compose, seeding, troubleshooting.
*   *File code triển khai:* [README.md](file:///home/pognova/TicketBox/README.md) (tại root thư mục).
*   *GitHub Link:* `https://github.com/pogdepZ/TicketBox/blob/main/README.md`

### `IM17` — Seed data/script có 4 concert mẫu, loại vé, giá và sơ đồ chỗ ngồi
*   *Mô tả:* Script prisma/seed.ts khởi tạo dữ liệu concert, ticketType, seatZone đầy đủ.
*   *File code triển khai:* [seed.ts](file:///home/pognova/TicketBox/apps/be/prisma/seed.ts).
*   *GitHub Link:* `https://github.com/pogdepZ/TicketBox/blob/main/apps/be/prisma/seed.ts`

### `IM18` — Toàn bộ hệ thống có thể khởi chạy và demo theo Blueprint
*   *Mô tả:* Docker compose setup PostgreSQL, Redis, MinIO, Mailhog.
*   *File code triển khai:* [docker-compose.yml](file:///home/pognova/TicketBox/docker-compose.yml) và scripts khởi chạy dev.
*   *GitHub Link:* `https://github.com/pogdepZ/TicketBox/blob/main/docker-compose.yml`

---

## III. NHÓM NỘP BÀI & ĐÓNG GÓI — THỰC HIỆN THỦ CÔNG KHI HOÀN TẤT ĐỒ ÁN

Các yêu cầu này liên quan đến định dạng nộp bài cuối cùng của nhóm trên hệ thống nộp bài (Google Drive, clips demo,...).

| ID | Yêu cầu cần chứng minh | Minh chứng mong đợi | Trạng thái thực tế | Hướng dẫn thực hiện |
| :--- | :--- | :--- | :---: | :--- |
| **`SB01`** | Google Drive public và chấm mở được bằng tài khoản khác/ẩn danh. | Link Drive + ảnh kiểm tra quyền | **Chưa nộp** | Cần upload thư mục nộp bài lên Google Drive và cấu hình chia sẻ "Anyone with link can view". |
| **`SB02`** | Drive có blueprint.pdf hoặc thư mục blueprint/ đầy đủ. | Link trực tiếp tới Blueprint | **Chưa nộp** | Đóng gói thư mục [blueprint/](file:///home/pognova/TicketBox/blueprint) hoặc xuất file PDF từ đó để đưa lên Drive. |
| **`SB03`** | Drive có src/, data/ và README.md. | Link trực tiếp tới source + kiểm tra cấu trúc | **Chưa nộp** | Đóng gói nén mã nguồn dự án thành file zip và upload lên Drive. |
| **`SB04`** | Drive có clips/ video MP4 1080p, khoảng 720 kbps, camera + demo code/app. | Link video + kiểm tra phát được | **Chưa nộp** | Quay các clip demo thực tế chạy chức năng có kèm camera hiển thị mặt của từng thành viên. |
| **`SB05`** | File text tên mã-nhóm_mssv1_...txt; nội dung là link Drive public. | Tên file và nội dung file text | **Chưa nộp** | Tạo file text ghi thông tin MSSV của nhóm và dán link Drive public vào đó làm file nộp bài chính. |
