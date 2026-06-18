---
name: backend-rules
description: Áp dụng phong cách viết mã (style flow) tiêu chuẩn và các quy tắc an toàn bảo mật (SQL Injection, Deadlocks, Idempotency) cho NestJS Backend.
---

# Quy tắc Phát triển Backend TicketBox (NestJS)

Khi triển khai các API routes, cập nhật module hoặc tối ưu dịch vụ tại thư mục `apps/be/src/`, bạn phải tuân thủ nghiêm ngặt các quy tắc dưới đây.

## 1. Cấu trúc Module tiêu chuẩn (Theo mẫu Concert Module)
Mỗi Route module mới phải được tổ chức tách biệt tại thư mục `routes/` theo chuẩn sau:
- `<name>.controller.ts`: Chỉ làm nhiệm vụ định tuyến (HTTP Routing), gắn Guard, kiểm soát Permission qua decorator `@RequirePermissions()`, nhận DTO và chuyển tiếp cuộc gọi đến Service.
- `<name>.service.ts`: Xử lý toàn bộ logic nghiệp vụ chính, tương tác với Database và Cache.
- `<name>.module.ts`: Khai báo NestJS Module.
- Thư mục `dto/`: Chứa các DTO đầu vào và đầu ra để định kiểu dữ liệu rõ ràng:
  - `create-<name>.dto.ts`
  - `update-<name>.dto.ts`
  - `query-<name>.dto.ts` (cho phân trang/lọc)
  - `<name>-response.dto.ts` (DTO trả về, tránh trả trực tiếp Prisma entity thô từ Service). Map bằng hàm private `toResponse(entity)`.

## 2. Phân tách logic & Tách hàm Helper Private
- Không viết code nghiệp vụ quá dài trong một hàm chính.
- Tách biệt logic xác thực (assertions), kiểm tra trạng thái và phân tích cú pháp (parsing) thành các hàm helper `private` (ví dụ: `validatePublishable()`, `assertCanUpdate()`, `parseDate()`).
- Sử dụng hàm dùng chung `find<Resource>OrThrow(id)` để tìm bản ghi hoặc ném lỗi `NotFoundException` lập tức nếu không tồn tại.
- Khi truy vấn phân trang, dùng `this.prismaService.$transaction([itemsQuery, countQuery])` để thực hiện song song việc đếm tổng số bản ghi và lấy danh sách bản ghi nhằm tối ưu hiệu năng.

## 3. Chiến lược Cache-Aside và Invalidation
- Định nghĩa Cache Keys và Cache TTL dưới dạng hằng số ở đầu file Service.
- Bọc toàn bộ lệnh đọc/ghi Redis (`redisService.getJson`, `redisService.setJson`) trong khối `try-catch` với log cảnh báo (`logger.warn`) để hệ thống không bị crash nếu Redis ngừng hoạt động.
- Khi dữ liệu thay đổi (tạo mới, cập nhật, xóa, thay đổi trạng thái), bắt buộc phải xóa cache (invalidation) đồng thời cho cả cache chi tiết và cache danh sách bằng pattern:
  ```typescript
  await Promise.all([
    this.redisService.delPattern(`${LIST_CACHE_KEY}*`),
    this.redisService.del(this.buildDetailCacheKey(id)),
  ]);
  ```

## 4. An toàn dữ liệu & Phòng chống SQL Injection
- **Tuyệt đối KHÔNG** sử dụng `$queryRawUnsafe` hoặc `$executeRawUnsafe` để tránh nguy cơ SQL Injection.
- Luôn sử dụng tag template `$queryRaw` và `$executeRaw` của Prisma để tự động tham số hóa dữ liệu.
- *Ví dụ:*
  - *Sai:* `tx.$executeRawUnsafe("SELECT id FROM orders WHERE id = '" + orderId + "' FOR UPDATE")`
  - *Đúng:* `tx.$executeRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE``

## 5. Ngăn ngừa Deadlock khi Row Lock
- Khi thực hiện Row-Level Locking (`FOR UPDATE`) trên nhiều bản ghi trong cùng một transaction, **bắt buộc phải sắp xếp danh sách các ID** theo thứ tự tăng dần trước khi truy vấn/lock.
- *Ví dụ:*
  ```typescript
  const sortedIds = [...ticketTypeIds].sort();
  await tx.$queryRaw`SELECT * FROM ticket_types WHERE id = ANY(${sortedIds}::uuid[]) ORDER BY id FOR UPDATE`;
  ```

## 6. Tính Idempotency & Tích hợp Circuit Breaker
- **Check-before-action:** Luôn kiểm tra xem bản ghi đã tồn tại chưa trước khi tạo/sinh dữ liệu (ví dụ: kiểm tra vé đã được phát hành cho đơn hàng chưa trong [TicketsService](file:///home/pognova/TicketBox/apps/be/src/routes/tickets/tickets.service.ts)).
- **Tránh xử lý Webhook song song:** Sử dụng trạng thái xử lý trung gian (như `PROCESSING`) của Webhook/PaymentEvent để chặn xử lý trùng lặp.
- **Circuit Breaker:** Khi giao tiếp với các API bên ngoài (ví dụ: cổng thanh toán), sử dụng dịch vụ Circuit Breaker để kiểm tra tính sẵn sàng (`assertAvailable`) và ghi nhận trạng thái (`recordSuccess`, `recordFailure`).
