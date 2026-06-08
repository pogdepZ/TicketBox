# Đặc tả: Guest List — Import danh sách khách mời từ CSV

## 1. Tổng quan

Module cho phép Admin/Organizer upload file CSV chứa danh sách khách mời (từ nhãn hàng, sponsor). Hệ thống parse, validate từng dòng, lưu vào database, và báo cáo kết quả import. Hỗ trợ cả manual trigger lẫn cron job tự động.

---

## 2. Luồng xử lý

```
Admin/Organizer upload CSV cho concert
  → Frontend gửi: POST /admin/concerts/:id/guest-list/import
      - Content-Type: multipart/form-data
      - field: file (CSV)
  → Backend nhận file:
      1. Validate file (type: CSV, size: max 5MB)
      2. Lưu file lên Object Storage (S3/MinIO) để audit
      3. Tạo bản ghi csv_import_batches (status: 'processing')
      4. Parse CSV → Insert vào guest_list_staging
      5. Validate từng dòng:
          a. name: bắt buộc
          b. email hoặc phone: ít nhất 1 trong 2
          c. ticketType: hợp lệ (VIP, SVIP, GA, ...)
          d. Trùng lặp: email + concertId → skip
      6. Dòng hợp lệ → Upsert vào guest_list
      7. Dòng lỗi → Giữ trong staging, ghi error
      8. Cập nhật csv_import_batches:
          - total_rows, valid_rows, invalid_rows
          - status: 'completed' | 'partial' | 'failed'
      9. Tạo error report (nếu có lỗi)
      10. Trả response
  → Frontend hiển thị kết quả import
```

---

## 3. CSV Format

### Header (dòng đầu tiên):

```csv
name,email,phone,ticketType,sponsorName
```

### Dữ liệu mẫu:

```csv
name,email,phone,ticketType,sponsorName
Nguyễn Văn An,an@example.com,0901234567,VIP,Sponsor ABC
Trần Thị Bình,binh@example.com,,SVIP,Sponsor XYZ
Lê Hoàng Cường,,0909876543,GA,Sponsor ABC
,invalid@example.com,0901111111,VIP,Sponsor DEF
```

### Field Rules

| Field | Bắt buộc | Validation |
|---|---|---|
| `name` | ✅ | Không rỗng, max 100 ký tự |
| `email` | ⚠️ Ít nhất 1 | Đúng format email |
| `phone` | ⚠️ trong 2 | Đúng format VN (10-11 số) |
| `ticketType` | ❌ | Nếu có: phải thuộc ticket_types của concert |
| `sponsorName` | ❌ | Max 200 ký tự |

---

## 4. API Contract

### `POST /admin/concerts/:id/guest-list/import`

**Auth**: Bearer JWT (Role: `ORGANIZER` hoặc `ADMIN`)

**Request**:
```
Content-Type: multipart/form-data

Field: file (CSV file)
Max size: 5MB
Accepted types: text/csv, application/vnd.ms-excel
```

**Response thành công (200)**:
```json
{
  "success": true,
  "data": {
    "imported": 10,
    "duplicates": 2,
    "errors": 1
  },
  "message": "Imported 10 guests, 2 duplicates skipped"
}
```

**Response chi tiết (khi có lỗi)**:
```json
{
  "success": true,
  "data": {
    "imported": 8,
    "duplicates": 2,
    "errors": 3,
    "errorDetails": [
      { "row": 4, "field": "name", "message": "Name is required" },
      { "row": 7, "field": "email", "message": "Invalid email format" },
      { "row": 12, "field": "phone", "message": "Invalid phone number" }
    ]
  },
  "message": "Import completed with errors"
}
```

---

## 5. Xử lý trùng lặp

### Quy tắc duplicate

```
Kiểm tra trùng dựa trên: email + concertId (hoặc phone + concertId)

Với mỗi dòng CSV:
  → Query: SELECT * FROM guest_list
            WHERE concert_id = :concertId
              AND (email = :email OR (email IS NULL AND phone = :phone))
  → Nếu tìm thấy:
      → Skip dòng này
      → Tăng counter duplicates
      → Ghi vào staging: validation_status = 'duplicate'
  → Nếu không tìm thấy:
      → Insert vào guest_list
      → Tăng counter imported
```

### Xử lý lỗi từng dòng

```
Dòng lỗi KHÔNG dừng import toàn bộ file.

Ví dụ: File 20 dòng, 3 dòng lỗi
  → 17 dòng import thành công
  → 3 dòng giữ trong staging với error message
  → Batch status = 'partial'
  → Admin có thể tải error report để sửa file
```

---

## 6. Database Schema

### Bảng `csv_import_batches` (đã có)

```sql
-- Theo dõi mỗi lần import
CREATE TABLE csv_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concert_id UUID REFERENCES concerts(id),
  file_url VARCHAR(500) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
    -- pending, processing, completed, failed, partial
  total_rows INT DEFAULT 0,
  valid_rows INT DEFAULT 0,
  invalid_rows INT DEFAULT 0,
  error_report_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### Bảng `guest_list_staging` (đã có)

```sql
-- Dữ liệu tạm khi parse CSV
CREATE TABLE guest_list_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES csv_import_batches(id) ON DELETE CASCADE,
  row_number INT NOT NULL,
  full_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  guest_type VARCHAR(50),
  guest_code VARCHAR(50),
  validation_status VARCHAR(20) DEFAULT 'pending',
    -- pending, valid, invalid, duplicate
  error_message TEXT
);
```

### Bảng `guest_list` (đã có)

```sql
-- Danh sách khách mời chính thức
CREATE TABLE guest_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concert_id UUID REFERENCES concerts(id),
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  guest_type VARCHAR(50),
  guest_code VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
    -- active, checked_in, cancelled
  csv_batch_id UUID REFERENCES csv_import_batches(id),
  scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(concert_id, guest_code)
);
```

---

## 7. Cron Job / Manual Trigger

### Manual Trigger

- Admin upload CSV trực tiếp từ giao diện web
- Xử lý đồng bộ (synchronous) nếu file nhỏ (<500 rows)
- Xử lý bất đồng bộ (BullMQ job) nếu file lớn (>500 rows)

### Cron Job (tự động)

```
Kịch bản: Nhãn hàng gửi CSV vào thư mục S3 theo lịch

CsvImportWorker (Cron: mỗi 15 phút)
  → Scan thư mục S3: s3://ticketbox/guest-imports/
  → Tìm file mới (chưa xử lý)
  → Với mỗi file:
      1. Tạo csv_import_batches
      2. Parse + validate + import
      3. Di chuyển file sang thư mục "processed"
      4. Gửi notification cho admin: kết quả import
```

---

## 8. Error Handling

| Tình huống | HTTP Status | Xử lý |
|---|---|---|
| File không phải CSV | 400 | Trả lỗi ngay |
| File quá lớn (>5MB) | 400 | Trả lỗi ngay |
| File rỗng | 400 | Trả "CSV file is empty" |
| Header không đúng format | 400 | Trả "Invalid CSV header" |
| Dòng lỗi (validation) | 200 | Import dòng khác, báo cáo lỗi |
| Concert không tồn tại | 404 | Trả "Concert not found" |
| Không có quyền | 403 | Trả "Forbidden" |
| Database error | 500 | Rollback, trả "Internal server error" |

---

## 9. Tiêu chí chấp nhận

- Upload CSV và import thành công
- Trùng (email + concertId) thì skip, không tạo duplicate
- Dòng lỗi báo lỗi nhưng không ảnh hưởng dòng khác
- Response trả đúng format { success, data: { imported, duplicates, errors } }
- File validation hoạt động (type, size, header)
- Chỉ ORGANIZER và ADMIN mới có quyền import
- Hỗ trợ cả manual upload và cron job
