Viewed ai-artist-bio.md:32-66

Để bạn dễ dàng kiểm tra, nghiệm thu (UAT) và bàn giao lại cho nhóm, tôi đã chuẩn bị một Checklist Test cực kỳ rõ ràng. Bạn có thể tự mình chạy theo các bước này, hoặc copy nguyên phần này gửi cho QC/Tester của team:

### 🌟 CHECKLIST NGHIỆM THU TÍNH NĂNG (USER D)

**Phần 1: Chuẩn bị môi trường & Dữ liệu**
- [x] Backend: Chạy `npx prisma db push` để đảm bảo các bảng `CheckinEvent`, `Ticket`, `GuestList`, `ArtistAsset`... được cập nhật mới nhất.
- [x] Backend: Chạy backend (`npm run start:dev` ở `apps/be`).
- [x] Dữ liệu mẫu: Tạo 1 User staff, 1 Concert, và 2 Ticket (1 cái status `ACTIVE`, 1 cái `USED`). *(Bạn có thể copy đoạn script tạo data từ mục 1 trong file `demo-mobile.md` chạy trên database).*
- [x] Mobile: Chạy app check-in (`npx expo start` ở `apps/checkin-mobile`).

---

**Phần 2: Ứng dụng Check-in Mobile (Quét Online)**
- [x] **Test Đăng nhập (D1)**: Nhập email/password của staff vừa tạo. Nhấn Bắt đầu ca trực.
  * _Kỳ vọng:_ App gọi API `/auth/login`, nhận được token, lưu vào `AsyncStorage` và tự động chuyển hướng vào màn hình Scanner.
- [ ] **Test Quét Vé Hợp Lệ (D2, D3)**: Bấm nút giả lập quét vé hợp lệ (mã vé đang ở trạng thái `ACTIVE`).
  * _Kỳ vọng:_ Màn hình chuyển sang Result xanh lá (ACCEPTED). Kiểm tra database bảng `tickets`, vé đã chuyển sang `USED`. Bảng `checkin_events` có 1 record `ACCEPTED`.
- [ ] **Test Quét Vé Trùng lặp (D2, D3)**: Quét lại đúng mã vé vừa nãy.
  * _Kỳ vọng:_ Màn hình Result hiện màu Cam/Đỏ (DUPLICATE - Vé đã được check-in).
- [ ] **Test Quét Vé Sai (D2, D3)**: Bấm nút giả lập mã vé không có trong DB.
  * _Kỳ vọng:_ Màn hình Result hiện màu Đỏ (NOT_FOUND - Sai sự kiện hoặc không tồn tại).

---

**Phần 3: Ứng dụng Check-in Mobile (Chế độ Offline)**
- [ ] **Kích hoạt Offline (D4)**: Tắt mạng WiFi/4G trên máy ảo/điện thoại (hoặc tắt server backend).
- [ ] **Quét vé khi rớt mạng (D4)**: Bấm giả lập quét 1 mã vé Hợp lệ.
  * _Kỳ vọng:_ Giao diện **vẫn cho phép khách qua cổng** (SUCCESS nhưng có badge Offline). Lịch sử vé này bị đẩy vào hàng đợi Local Queue (AsyncStorage).
- [ ] **Đồng bộ dữ liệu (D5)**: Bật lại mạng. Ở màn hình Mobile, chuyển sang tab **Queue (Danh sách Offline)**.
  * _Kỳ vọng:_ Nhìn thấy vé ban nãy đang có trạng thái màu Vàng (Chờ Sync).
- [ ] **Test Sync (D5)**: Nhấn nút Sync.
  * _Kỳ vọng:_ App đẩy batch danh sách lên backend `/checkin/sync`. Sau 1 giây, trạng thái vé trong danh sách Queue chuyển sang màu Xanh (SYNCED). Vé trên DB server chính thức thành `USED`.

---

**Phần 4: Backend Integration Skeletons (API)**
Dùng Postman hoặc CURL để bắn trực tiếp vào các cổng API của Backend (Server đang chạy ở port mặc định, ví dụ `localhost:3000`):
- [ ] **Test AI Artist Bio (D7)**: Gửi request `POST /ai-bio/upload` (multipart form-data với file PDF).
  * _Kỳ vọng:_ API trả về success. Mở DB bảng `artist_assets`, thấy record ban đầu là `PROCESSING`, chờ 2 giây refresh lại thấy chuyển thành `DONE` và cột text được điền đoạn chữ mẫu từ AI.
- [ ] **Test CSV Guest List (D8)**: Gửi request `POST /guest-list/import` (multipart form-data).
  * _Kỳ vọng:_ API trả về số lượng file đã import (ví dụ: `imported: 2`). Mở DB bảng `guest_import_batches` thấy trạng thái `COMPLETED`. Mở bảng `guest_list` thấy có 2 record được chèn vào thành công.
- [ ] **Test Notification (D6)**: Mở source code `notifications.service.ts` kiểm tra code. (Có thể test bằng cách viết 1 controller nhỏ gọi hàm này).
  * _Kỳ vọng:_ Hàm `sendNotification` tạo thành công 1 bản ghi vào bảng `notifications` với status `SENT`.

> **Lưu ý Bàn Giao:** Toàn bộ flow kịch bản (kèm script copy-paste gen data) đã được tôi ghi chú rất rõ trong file **`demo-mobile.md`**. Bạn chỉ cần báo QA/Tester hoặc Manager mở file này ra đọc là có thể nghiệm thu ngay lập tức. Cần hỗ trợ thêm gì không bạn?