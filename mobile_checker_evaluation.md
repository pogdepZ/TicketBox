# Đánh giá hoàn thành Checklist - Mobile Checker App

Dựa trên bảng yêu cầu `mobile_checker_checklist.md` và mã nguồn hiện tại của dự án TicketBox, dưới đây là đánh giá chi tiết về mức độ hoàn thành và những điểm còn thiếu sót của phân hệ Mobile Checker (App Soát vé).

## 1. Đánh giá tổng quan (Tỷ lệ hoàn thành: ~80%)
- **Phần Cài đặt (Code & Logic):** Đạt 100%. Tất cả các tính năng cốt lõi và kịch bản demo đều đã có thể chạy thực tế và hoạt động đúng logic.
- **Phần Thiết kế / Tài liệu (Blueprint):** Đạt 0%. Vẫn đang thiếu các sơ đồ phân tích thiết kế hệ thống quan trọng theo yêu cầu của đồ án.

---

## 2. Chi tiết mức độ hoàn thành theo từng tiêu chí

### A. Nhóm yêu cầu về Thiết kế hệ thống (Blueprint) - ĐANG THIẾU ❌
Nhóm yêu cầu này đòi hỏi các minh chứng bằng tài liệu (diagrams, tables), hiện tại chưa có trong thư mục tài liệu của dự án.

| ID | Yêu cầu | Tình trạng | Chi tiết thiếu sót |
|:---|:---|:---|:---|
| **BP07** | Chọn ít nhất 2 luồng: Luồng soát vé mất mạng & đồng bộ lại; tránh vé vào hai lần. | ❌ Chưa làm | Cần vẽ **Sequence Diagram** (Sơ đồ tuần tự) mô tả cách App tải Snapshot, cách check vé offline lưu vào SQLite, và cách gọi API Sync để giải quyết conflict. Kèm theo **State Diagram** của vé (Unused -> Temp Accepted -> Synced/Conflict). |
| **BP09** | Thiết kế kiểm soát truy cập cho Khán giả, BTC, Nhân sự soát vé. | ❌ Chưa làm | Cần tạo **Role-Permission Matrix** (Bảng ma trận phân quyền) liệt kê các API/Tính năng và đánh dấu tick (v) cho Admin, Staff, User. |

### B. Nhóm yêu cầu về Cài đặt mã nguồn (Implementation) - ĐÃ HOÀN THÀNH ✅
Phần mềm đã đáp ứng đầy đủ các tính năng được yêu cầu.

| ID | Yêu cầu | Tình trạng | Chi tiết hoàn thành |
|:---|:---|:---|:---|
| **IM06** | RBAC được cài thật ở API, trang admin và app soát vé. | ✅ 100% | Đã tích hợp màn hình `LoginScreen`, kiểm tra JWT. Chỉ tài khoản có `role = STAFF` hoặc `ADMIN` mới được phép đăng nhập và sử dụng App soát vé. Middleware Backend đã khóa các endpoint bảo mật. |
| **IM07** | Mobile app quét QR và xác nhận vé tại cổng. | ✅ 100% | Màn hình `ScannerScreen` quét QR (Camera/Mock). Gọi API `/checkin/scan`. Màn hình `ResultScreen` đã xử lý đầy đủ các trạng thái giao diện: Hợp lệ (Xanh lá), Trùng lặp (Vàng), Không hợp lệ / Sai sự kiện (Đỏ). |
| **IM08** | Soát vé offline, lưu tạm, đồng bộ khi có mạng. | ✅ 100% | Đã thiết kế màn hình `SnapshotScreen` tải trước data vào SQLite (Expo SQLite). Khi mất mạng, quét QR sẽ đối chiếu DB local (`ticket_snapshot`). Kết quả lưu vào queue nội bộ (`checkin_log`). Màn hình `OfflineQueueScreen` đảm nhận việc đồng bộ (Sync) hàng loạt lên server khi có mạng và xử lý thông minh trạng thái CONFLICT (nếu thiết bị khác đã đồng bộ trước). |
| **IM10** | Xử lý Guest List (Khách mời) không dùng chuẩn mã hoá JWT. | ✅ 100% | Khi quét mã QR văn bản thường (vd: mã vé mời), App sẽ tự động bắt lỗi `Invalid JWT` và tự fallback sang cơ chế tra cứu trong `guest_snapshot` (nếu offline) hoặc API cho khách mời (nếu online). Trả về đúng trạng thái `ACCEPTED_GUEST` hoặc `INVALID_GUEST`. |

---

## 3. Các kịch bản Demo đã sẵn sàng (Ready for Demo)
Bạn hoàn toàn có thể tự tin sử dụng App hiện tại để trình diễn trước giảng viên theo đúng 3 kịch bản:
1. **Demo Online:** Quét JWT giả lập -> Trả về kết quả Hợp lệ. Quét lại lần nữa -> Báo đã dùng. (Hỗ trợ bắt chính xác lỗi sai sự kiện nếu cầm vé show khác đem đi quét).
2. **Demo Offline:** Tải Snapshot -> Tắt Wifi giả lập offline -> Quét vé -> Báo màu xanh nhưng ghi chú "Recorded Offline" -> Bật Wifi -> Ấn Sync -> Xóa hàng đợi và ghi nhận lên Database gốc.
3. **Demo Guest List:** Quét chuỗi string bất kỳ (không phải định dạng Base64 JWT) -> App tự động fallback tra cứu theo danh sách khách mời.

## 4. Hành động tiếp theo (Next Steps)
Để đạt điểm tối đa cho phần này, bạn cần ưu tiên bổ sung các minh chứng tài liệu:
1. Vẽ **UML Sequence Diagram** cho luồng Đồng bộ Offline (`syncTickets`, `checkin/sync`).
2. Vẽ **UML State Machine Diagram** biểu diễn vòng đời trạng thái của 1 chiếc vé từ lúc bán ra -> soát offline -> đồng bộ lên server.
3. Lập bảng **RBAC Matrix** (Excel/Markdown) liệt kê các Role có trong hệ thống và quyền tương ứng trên Mobile App / Web Admin.
