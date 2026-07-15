# TỔNG HỢP CHI TIẾT MINH CHỨNG HOÀN THÀNH CÁC TÍNH NĂNG (TICKETBOX)

Bản tài liệu này tổng hợp chi tiết các file code, đường dẫn link GitHub, phần trăm hoàn thành (% HT) và giải thích đóng góp kỹ thuật cho từng tính năng tương ứng trên hệ thống Google Sheets để bạn và thầy giáo dễ dàng theo dõi, kiểm tra trực tiếp.

---

## 1. Task ID: `A-W2-04` (Backend) — Scheduled CSV import từ thư mục `/data`

*   **Phân hệ:** Backend Worker
*   **Trạng thái thực tế:** **Hoàn thành 100%**
*   **Điểm chất lượng đề xuất:** `5`
*   **File triển khai thực tế:**
    1.  [guest-list-import.job.ts](file:///home/pognova/TicketBox/apps/be/src/routes/guest-list/guest-list-import.job.ts) (Lớp triển khai Job chạy ngầm)
    2.  [worker.module.ts](file:///home/pognova/TicketBox/apps/be/src/worker.module.ts) (Đăng ký Job vào Worker Module)
*   **Link GitHub minh chứng:**
    *   `https://github.com/pogdepZ/TicketBox/blob/main/apps/be/src/routes/guest-list/guest-list-import.job.ts`
    *   `https://github.com/pogdepZ/TicketBox/blob/main/apps/be/src/worker.module.ts`
*   **Chi tiết kỹ thuật & Đóng góp:**
    *   Xây dựng lớp `GuestListImportJob` với decorator `@Cron('*/30 * * * * *')` tự động quét thư mục local `/data/guest-lists/` định kỳ mỗi 30 giây.
    *   Tự động trích xuất `concertId` từ tên file CSV (định dạng UUID).
    *   Đọc buffer, chuyển đổi thành `UploadedFileDto` và gọi hàm `importFromCsv` thuộc `GuestListService`.
    *   Sau khi xử lý thành công, tự động đổi đuôi file để tránh xử lý lặp lại:
        *   Thành công: đổi đuôi thành `.csv.processed`.
        *   Trùng lặp (file đã import): đổi đuôi thành `.csv.duplicate`.
        *   Lỗi nghiệp vụ/DB/Định dạng: đổi đuôi thành `.csv.failed`.
        *   Tên file sai định dạng UUID: đổi đuôi thành `.csv.invalid_name`.
    *   Đảm bảo cơ chế tự động tạo thư mục `/data/guest-lists/` nếu thư mục này chưa tồn tại để hệ thống không bị crash.

---

## 2. Task ID: `C-W1-05` (Frontend) — Admin UI quản lý TicketType

*   **Phân hệ:** Frontend Web (Admin Portal)
*   **Trạng thái thực tế:** **Hoàn thành 100%**
*   **Điểm chất lượng đề xuất:** `5`
*   **File triển khai thực tế:**
    *   [page.tsx](file:///home/pognova/TicketBox/apps/fe/app/admin/concerts/%5Bid%5D/page.tsx) (Giao diện chi tiết concert & Form quản lý hạng vé)
*   **Link GitHub minh chứng:**
    *   `https://github.com/pogdepZ/TicketBox/blob/main/apps/fe/app/admin/concerts/%5Bid%5D/page.tsx`
*   **Chi tiết kỹ thuật & Đóng góp:**
    *   Thiết kế giao diện quản lý danh sách hạng vé (TicketType) đi kèm theo từng khu vực ghế (SeatZone).
    *   Triển khai form tương tác cao cấp cho phép: Tạo mới hạng vé, Chỉnh sửa thông số hạng vé (Tên, Giá, Tổng số lượng, Số lượng tối đa mỗi user, Thời gian mở bán/kết thúc bán), và Xóa hạng vé.
    *   Gắn các hàm tích hợp API thật từ client: `createTicketType`, `updateTicketType`, `deleteTicketType`.
    *   Validate dữ liệu nhập liệu ở client (ví dụ: price >= 0, quantity > 0) trước khi gửi request lên backend.

---

## 3. Task ID: `C-W2-01` (Frontend) — Revenue dashboard dùng API thật

*   **Phân hệ:** Frontend Web (Admin Portal)
*   **Trạng thái thực tế:** **Hoàn thành 100%**
*   **Điểm chất lượng đề xuất:** `5`
*   **File triển khai thực tế:**
    *   [dashboard/page.tsx](file:///home/pognova/TicketBox/apps/fe/app/admin/dashboard/page.tsx) (Trang Dashboard chính cho Admin)
*   **Link GitHub minh chứng:**
    *   `https://github.com/pogdepZ/TicketBox/blob/main/apps/fe/app/admin/dashboard/page.tsx`
*   **Chi tiết kỹ thuật & Đóng góp:**
    *   Tích hợp bộ chọn khoảng thời gian (`DateRangePicker`) tự động reload lại dữ liệu phân tích doanh thu.
    *   Gọi API thật `getRevenueSummary` và `getDashboardRevenueAnalyticsAdmin` lấy dữ liệu doanh thu thực từ cơ sở dữ liệu.
    *   Hiển thị các thẻ chỉ số trực quan (Tổng doanh thu, Tổng số vé bán ra, Số lượng concert đang chạy).
    *   Vẽ biểu đồ cột tùy chỉnh (`DailySalesChart`) biểu diễn doanh thu và lượng vé bán theo từng ngày cực kỳ trực quan mà không bị lệch layout.
    *   Hiển thị danh sách bảng phân tích số lượng vé đã bán theo từng hạng vé và tình trạng các đơn hàng (`PAID`, `PENDING_PAYMENT`, `EXPIRED`).

---

## 4. Task ID: `C-W2-02` (Frontend) — UI upload CSV + report dòng lỗi

*   **Phân hệ:** Frontend Web (Admin Portal - Tab Khách Mời)
*   **Trạng thái thực tế:** **Hoàn thành 100%**
*   **Điểm chất lượng đề xuất:** `5`
*   **File triển khai thực tế:**
    *   [page.tsx](file:///home/pognova/TicketBox/apps/fe/app/admin/concerts/%5Bid%5D/page.tsx#L1311) (Khu vực tab 'guests' quản lý khách mời)
*   **Link GitHub minh chứng:**
    *   `https://github.com/pogdepZ/TicketBox/blob/main/apps/fe/app/admin/concerts/%5Bid%5D/page.tsx#L1311`
*   **Chi tiết kỹ thuật & Đóng góp:**
    *   Triển khai tab **Khách mời (CSV)** trong giao diện quản trị chi tiết concert.
    *   Tạo khung kéo thả và chọn file CSV, kiểm tra định dạng file phía client, hiển thị lỗi nếu chọn sai định dạng.
    *   Gọi API thật `importGuestList` gửi file CSV thông qua payload `multipart/form-data`.
    *   Hiển thị banner kết quả import gần nhất chứa các thông số: Số lượng dòng thêm mới thành công, số dòng bị trùng lặp, số dòng lỗi chi tiết.
    *   Liệt kê bảng danh sách khách mời thời gian thực lấy từ backend gồm: Họ tên, Email, Số điện thoại, Phân loại (VIP/Sponsor), Mã vé mời và Trạng thái check-in.

---

## 5. Task ID: `C-W2-03` (Frontend) — UI upload PDF + chỉnh sửa bio

*   **Phân hệ:** Frontend Web (Admin Portal - Tab Tiểu Sử AI)
*   **Trạng thái thực tế:** **Hoàn thành 100%**
*   **Điểm chất lượng đề xuất:** `5`
*   **File triển khai thực tế:**
    *   [page.tsx](file:///home/pognova/TicketBox/apps/fe/app/admin/concerts/%5Bid%5D/page.tsx#L1192) (Khu vực tab 'bio' quản lý nghệ sĩ)
*   **Link GitHub minh chứng:**
    *   `https://github.com/pogdepZ/TicketBox/blob/main/apps/fe/app/admin/concerts/%5Bid%5D/page.tsx#L1192`
*   **Chi tiết kỹ thuật & Đóng góp:**
    *   Triển khai khu vực upload tài liệu PDF giới thiệu nghệ sĩ (< 10MB).
    *   Gắn kết nối API `uploadArtistBioPdf` gửi file lên hệ thống worker.
    *   Thiết kế cơ chế tự động gửi request liên tục (Polling) sau mỗi 2 giây đến API `getAiBioStatus` để cập nhật trạng thái xử lý AI (`PROCESSING` -> `DONE` hoặc `FAILED`).
    *   Hiển thị trực quan đoạn văn bản tiểu sử nghệ sĩ được tạo bởi AI.
    *   Tích hợp sẵn khung editor văn bản cho phép Admin tự tay chỉnh sửa thủ công và lưu lại thay đổi thông qua API `updateConcertBio`.
