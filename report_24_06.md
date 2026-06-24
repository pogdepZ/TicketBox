# BÁO CÁO CÔNG VIỆC THỰC HIỆN - TICKETBOX

**Ngày báo cáo:** 24/06/2026  
**Dự án:** TicketBox (Monorepo - NestJS Backend & Next.js Frontend)  
**Tác giả:** Antigravity (AI Coding Assistant)  

---

## 1. Nâng Cấp Giao Diện Custom Confirm Modal
Nhằm thay thế các hộp thoại thông báo mặc định của trình duyệt (`window.confirm()`) vốn thô sơ và không nhất quán với nhận diện thương hiệu của ứng dụng, tôi đã thiết kế và triển khai:
*   **Thành phần:** [confirm-modal.tsx](file:///D:/Coding/DA_TKPM/TicketBox/apps/fe/components/confirm-modal.tsx)
*   **Đặc điểm:** 
    *   Hỗ trợ hiệu ứng làm mờ nền (backdrop blur), bo góc tròn mượt mà (`rounded-3xl`), và hiệu ứng chuyển cảnh mềm mại.
    *   Có hai trạng thái hiển thị: `danger` (màu đỏ - dành cho thao tác xóa/hủy) và `info` (màu mặc định).
*   **Tích hợp:**
    *   Trang danh sách sự kiện Admin ([admin/concerts/page.tsx](file:///D:/Coding/DA_TKPM/TicketBox/apps/fe/app/admin/concerts/page.tsx)): Sử dụng khi xác nhận ngưng kích hoạt (hủy) sự kiện.
    *   Trang chi tiết sự kiện Admin ([admin/concerts/[id]/page.tsx](file:///D:/Coding/DA_TKPM/TicketBox/apps/fe/app/admin/concerts/%5Bid%5D/page.tsx)): Sử dụng khi xác nhận xóa hạng vé khỏi sự kiện.

---

## 2. Giải Quyết Triệt Để Lỗi Nhảy Trang (Layout Shift)
*   **Vấn đề:** Khi nhấn lưu thông tin ở các biểu mẫu (Chi tiết sự kiện, Hạng vé, Tiểu sử AI, Khách mời CSV), các hộp thoại thông báo màu xanh lá (success alert) hiển thị nội tuyến đột ngột chèn vào, làm thay đổi chiều cao của form và đẩy các nút bấm hành động xuống dưới, gây ra trải nghiệm giật lag.
*   **Giải pháp:**
    *   Loại bỏ hoàn toàn các khối JSX hiển thị thông báo thành công nội tuyến (`editSuccess`, `success`, `bioSuccess`, `guestSuccess`) khỏi mã nguồn trang chi tiết.
    *   Chuyển toàn bộ các thông báo thành công sang hệ thống thông báo trượt toàn cục (**Toast Notification**) bằng cách gửi sự kiện tùy chỉnh `ticketbox-toast` tới `window.dispatchEvent`.
    *   Giờ đây, khi lưu thay đổi, biểu mẫu đứng yên cố định và một thông báo dạng trượt (toast) tinh tế xuất hiện ở góc trên bên phải để phản hồi nhanh cho người dùng.

---

## 3. Thiết Kế & Xây Dựng Bộ Chọn Ngày/Giờ Custom Cao Cấp
Thay thế hoàn toàn ô nhập ngày/giờ mặc định của trình duyệt bằng bộ chọn được thiết kế tùy biến chuyên nghiệp:
*   **Thành phần:** [date-time-picker.tsx](file:///D:/Coding/DA_TKPM/TicketBox/apps/fe/components/date-time-picker.tsx)
*   **Các bộ chọn cung cấp:**
    1.  **`DatePicker`**: Mở ra một lịch tháng nhỏ gọn, cho phép chuyển đổi tháng, bo góc hiện đại và highlight ngày được chọn.
    2.  **`TimePicker`**: Hiển thị hai cột cuộn riêng biệt cho Giờ (00-23) và Phút (bước nhảy 5 phút). Tự động cuộn giá trị đang chọn vào giữa vùng nhìn khi mở.
    3.  **`DateTimePicker`**: Tích hợp cả lịch và bộ cuộn giờ/phút trong một Popover rộng hơn, có nút "Xác nhận" để áp dụng cho định dạng `datetime-local`.
*   **Tính năng bổ sung:**
    *   Tự động phát hiện click bên ngoài (click-outside) để ẩn popup.
    *   Tương thích hoàn toàn với chế độ Light/Dark Mode (tự động đảo màu icon chỉ báo lịch/đồng hồ).
    *   Thêm cơ chế kích hoạt click mở nhanh thông qua `showPicker()` và đặt con trỏ dạng `cursor-pointer`.
*   **Tích hợp:** Thay thế toàn bộ các đầu vào ngày/giờ ở cả trang tạo mới sự kiện ([create-concert/page.tsx](file:///D:/Coding/DA_TKPM/TicketBox/apps/fe/app/admin/create-concert/page.tsx)) và trang chi tiết sự kiện ([concerts/[id]/page.tsx](file:///D:/Coding/DA_TKPM/TicketBox/apps/fe/app/admin/concerts/%5Bid%5D/page.tsx)).

---

## 4. Xử Lý Ràng Buộc Trạng Thái Sự Kiện & Phân Quyền
Đồng bộ hóa hành vi của Frontend để tuân thủ nghiêm ngặt các quy tắc xác thực dữ liệu của Backend đối với các trạng thái sự kiện:
*   **Bổ sung Badge Trạng thái:** Hiển thị huy hiệu trạng thái rõ ràng ở đầu trang chi tiết sự kiện (**Bản nháp**, **Đã xuất bản**, **Đã hủy**, hoặc **Đã hoàn thành**).
*   **Khóa các trường cơ bản khi đã xuất bản:**
    *   Khi sự kiện ở trạng thái **Đã xuất bản (PUBLISHED)**: Vô hiệu hóa (disable) các trường thông tin cốt lõi (Tên sự kiện, nghệ sĩ, địa điểm, thời gian diễn ra) để tránh việc thay đổi làm ảnh hưởng tới vé đã bán.
    *   Khi lưu thông tin, Frontend sẽ lọc và **chỉ gửi các trường được phép sửa** (`description`, `posterUrl`, `seatMapSvg`) trong payload, giải quyết triệt để lỗi trả về lỗi 403 (Bạn không có quyền thực hiện thao tác này).
*   **Khóa toàn bộ form khi đã hủy/hoàn thành:** Vô hiệu hóa toàn bộ ô nhập liệu và ẩn nút "Lưu thay đổi" khi sự kiện ở trạng thái **CANCELLED** hoặc **COMPLETED**.
*   **Dịch thông báo lỗi thân thiện:**
    *   Cập nhật hàm `getFriendlyErrorMessage` trong [api.ts](file:///D:/Coding/DA_TKPM/TicketBox/apps/fe/lib/api.ts) để phát hiện và dịch chính xác các thông báo lỗi Zod/Forbidden từ Backend:
        *   *Invalid fields after publish:* Dịch thành `"Không thể thay đổi thông tin này sau khi sự kiện đã xuất bản (đang mở bán)."`
        *   *Cancelled/completed update:* Dịch thành `"Không thể chỉnh sửa sự kiện đã hủy hoặc đã hoàn thành."`

---

## 5. Khảo Sát & Giải Thích Cơ Chế Đồng Bộ Hóa SQL (Redis Caching)
*   **Vấn đề:** Khi thay đổi trực tiếp trạng thái của sự kiện bằng lệnh SQL trong Database, giao diện người dùng và trang Admin vẫn hiển thị trạng thái cũ.
*   **Phát hiện:** Backend NestJS sử dụng Redis để lưu cache danh sách và chi tiết sự kiện với thời gian hết hạn (TTL) là **5 phút (300 giây)**. Các thao tác SQL trực tiếp đi tắt qua Database, do đó Redis không nhận được lệnh xóa cache dẫn đến tình trạng stale dữ liệu.
*   **Hướng dẫn xử lý:** Người dùng cần chạy lệnh `redis-cli flushall` trong container Redis để xóa cache ngay lập tức khi chỉnh sửa dữ liệu thủ công qua SQL, hoặc điều chỉnh hằng số `CONCERT_CACHE_TTL_SECONDS` trong file [concert.service.ts](file:///D:/Coding/DA_TKPM/TicketBox/apps/be/src/routes/concert/concert.service.ts) xuống thấp hơn trong môi trường phát triển local.

---

## 6. Kiểm Thử & Kiểm Tra Biên Dịch
Tất cả các thay đổi trên Frontend đã được kiểm tra biên dịch kỹ lưỡng thông qua lệnh:
```bash
pnpm --filter @repo/fe build
```
Kết quả: Dự án Next.js build thành công 100%, không phát sinh bất kỳ lỗi TypeScript hay xung đột khai báo biến nào. Giao diện hoạt động trơn tru với đầy đủ các hiệu ứng chuyển động cao cấp.
