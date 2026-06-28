# Đặc tả: CSV Guest List Import

## 1. Mô tả

Một số concert có danh sách khách mời VIP từ nhãn hàng. Vì hệ thống nhãn hàng không có API, TicketBox chỉ nhận CSV theo lịch cố định.

## 2. Luồng chính

1. Worker kiểm tra thư mục/email/S3 định kỳ.
2. Khi có file mới, tạo `csv_import_batches`.
3. Đưa từng dòng vào `guest_list_staging`.
4. Validate dữ liệu.
5. Dòng hợp lệ được upsert vào `guest_list`.
6. Dòng lỗi ghi `error_message`.
7. Xuất error report.
8. Admin xem trạng thái import.

## 3. Format CSV đề xuất

```csv
full_name,email,phone,guest_type,guest_code
Nguyen Van A,a@example.com,0900000001,VIP,VIP001
Tran Thi B,b@example.com,0900000002,Sponsor,VIP002
```

## 4. Kịch bản lỗi

| Lỗi | Xử lý |
|---|---|
| File sai format | Batch failed, không ảnh hưởng dữ liệu chính |
| Thiếu tên | Dòng invalid |
| Thiếu cả email và phone | Dòng invalid |
| guest_code trùng | Upsert hoặc reject tùy cấu hình |
| Một phần dòng lỗi | Batch partial, dòng hợp lệ vẫn import |

## 5. Ràng buộc

- Không import thẳng vào bảng chính.
- Luôn qua staging trước.
- Có error report.
- Có audit log cho mỗi batch.
- Import idempotent theo batch/file hash.

## 6. Tiêu chí chấp nhận

- File lỗi không làm gián đoạn hệ thống.
- File có 100 dòng, 90 dòng hợp lệ, 10 dòng lỗi thì 90 dòng vẫn được import.
- Import lại cùng file không tạo duplicate.

## 7. API Endpoints

### `POST /admin/concerts/:id/guest-list/import`
- **Mô tả:** Import danh sách khách mời từ file CSV.
- **Request:** `multipart/form-data`
  - Param `:id`: concertId (UUID)
  - `file`: CSV file
- **Response:**
  ```json
  {
    "success": true,
    "data": { "imported": 10, "duplicates": 0, "errors": 0 },
    "message": "Imported successfully"
  }
  ```
