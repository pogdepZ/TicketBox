# Checklist Ứng dụng Mobile Checker (Soát vé)

Dưới đây là danh sách các yêu cầu của đồ án liên quan trực tiếp đến ứng dụng Mobile Checker, được trích xuất từ file `02_ChecklistYeuCau.md`. Các mục về "Cài đặt" đã được hoàn thiện 100% trong mã nguồn.

## 1. Blueprint (Thiết kế hệ thống)

| ID | Mức độ | Yêu cầu cần chứng minh | Minh chứng mong đợi | Trạng thái hiện tại |
|:---|:---|:---|:---|:---|
| **BP07** | Chọn ít nhất 2 luồng | Luồng soát vé mất mạng và đồng bộ lại; tránh vé vào hai lần. | Sequence/state diagram + conflict handling | Cần vẽ sơ đồ UML |
| **BP09** | Bắt buộc | Thiết kế kiểm soát truy cập cho Khán giả, Ban tổ chức, Nhân sự soát vé. | Role-permission matrix + enforcement tại endpoint/UI/app | Cần tạo bảng phân quyền |

---

## 2. Cài đặt (Implementation)

| ID | Mức độ | Yêu cầu cần chứng minh | Minh chứng mong đợi | Trạng thái (Code) |
|:---|:---|:---|:---|:---|
| **IM06** | Bắt buộc | RBAC được cài thật ở API, trang admin và app soát vé. | Middleware/policy + test quyền sai/đúng | **Hoàn thành 100%** |
| **IM07** | Bắt buộc | Mobile app quét QR và xác nhận vé tại cổng. | Demo scan + validation + check-in record | **Hoàn thành 100%** |
| **IM08** | Bắt buộc | Soát vé offline, lưu tạm, đồng bộ khi có mạng, không mất dữ liệu/không vào hai lần. | Demo bật/tắt mạng + sync/conflict test | **Hoàn thành 100%** |
| **IM10** | Bắt buộc | Định kỳ nhập Guest List CSV; xử lý file lỗi, trùng... | Hỗ trợ nhận diện mã Guest List (không phải JWT) offline. | **Hoàn thành 100%** |

---

## 3. Hướng dẫn Kịch bản Demo (Để làm minh chứng)

### Demo Quét vé trực tiếp (Online) - IM07
1. Đăng nhập vào app Mobile bằng tài khoản Staff (Nhân sự soát vé).
2. Dùng điện thoại quét một vé (mã QR/JWT) hợp lệ.
3. App gọi API `/checkin/scan` thành công -> Màn hình hiển thị màu xanh lá (`ACCEPTED`) kèm tên người mua, sự kiện, vị trí ghế.
4. Quét lại chính mã QR đó lần 2 -> App nhận dạng vé đã dùng -> Hiển thị màu vàng (`DUPLICATE`).

### Demo Quét vé ngoại tuyến (Offline) - IM08
1. Ở trạng thái có mạng, nhấn nút **"Tải Snapshot"** (tải toàn bộ data vé và khách mời vào SQLite).
2. **Tắt hoàn toàn Wi-Fi/4G** trên điện thoại (đưa về chế độ máy bay).
3. Dùng app quét một vé mới chưa từng sử dụng.
4. App kiểm tra với SQLite nội bộ và báo Xanh (`TEMP_ACCEPTED`), ghi nhận kết quả vào hàng đợi (Queue - bảng `checkin_log`).
5. **Bật Wi-Fi** trở lại, nhấn nút **"Đồng bộ" (Sync)**.
6. App tự động gom dữ liệu quét offline đẩy lên server API `/checkin/sync`. Server ghi nhận vào DB chính mà không xảy ra conflict. 

### Demo Quét vé Khách mời VIP (Guest List) - IM10
1. Quét một mã QR văn bản thuần (VD: `GUEST-001`), không phải chuẩn mã hóa JWT như vé mua.
2. App bắt lỗi JWT, tự động fallback sang cơ chế tìm kiếm trong bảng `guest_snapshot`.
3. Nhận diện khách mời hợp lệ -> Trả về kết quả Xanh dương (`GUEST ACCEPTED`).
