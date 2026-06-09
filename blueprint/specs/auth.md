# Đặc tả: Auth & Access Control

## 1. Mô tả

Tính năng Auth & Access Control quản lý đăng ký, đăng nhập, xác thực JWT và phân quyền người dùng theo mô hình RBAC (Role-Based Access Control) đơn giản.

## 2. Role

Hệ thống TicketBox sử dụng RBAC đơn giản với 3 role chính:

- `customer`: Khán giả. Có quyền xem concert, tạo order, thanh toán, xem vé của chính mình.
- `admin`: Ban tổ chức / quản trị viên nội bộ. Có quyền quản lý concert, loại vé, doanh thu, khách mời, AI artist bio và tài khoản nhân sự.
- `checker`: Nhân sự soát vé. Có quyền xác thực QR, quét vé online và đồng bộ dữ liệu check-in offline.

## 3. Luồng chính

### Đăng nhập

1. User nhập email/password.
2. Backend xác thực thông tin.
3. Backend trả access token và refresh token.
4. Frontend lưu access token trong memory/local storage tùy thiết kế.
5. Refresh token lưu trong httpOnly cookie nếu làm web app.

### Kiểm tra quyền API

1. Request đi qua `JwtAuthGuard`.
2. `JwtAuthGuard` verify access token và gắn `request.user`.
3. `PermissionsGuard` đọc metadata từ decorator `@RequirePermissions(...)`.
4. Backend so sánh permission yêu cầu của endpoint với danh sách permission của user.
5. Nếu user thiếu permission, trả `403 Forbidden`.

Với dữ liệu cá nhân như order/ticket, service phải kiểm tra ownership:
- Customer chỉ được xem order/ticket có `userId = request.user.id`.
- Admin được xem toàn bộ.
- Checker không được truy cập order/payment API.

## 4. Kịch bản lỗi

| Lỗi | Hành vi |
|---|---|
| Token hết hạn | Trả 401, frontend refresh token |
| Không có permission | Trả 403 |
| Khách hàng truy cập order của người khác | Trả 403 |
| Checker quét sai concert | Reject check-in |

## 5. Ràng buộc

- Backend phải enforce quyền, không tin frontend.
- JWT phải có thời gian hết hạn ngắn.
- Refresh token có thể revoke.
- Admin action phải ghi audit log.

## 6. Tiêu chí chấp nhận

- Customer không vào được trang quản lý admin.
- Admin có thể tạo, chỉnh sửa concert và cấu hình vé.
- Checker thực hiện quét vé và đồng bộ offline thành công.
- Admin xem được audit log và quản lý role.
