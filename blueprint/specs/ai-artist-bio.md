# Đặc tả: AI Artist Bio

## 1. Mô tả

Ban tổ chức có thể upload PDF hồ sơ nghệ sĩ hoặc press kit. Hệ thống xử lý file và dùng AI để tạo phần giới thiệu ngắn gọn hiển thị trên trang concert.

## 2. Luồng chính

1. Admin upload PDF.
2. Backend yêu cầu `Idempotency-Key`; nếu cùng key đang xử lý thì trả 409 để tránh tạo thêm job tốn token.
3. File lưu vào MinIO/S3.
4. Backend tạo job `generate_artist_bio` và chờ worker trả kết quả khi queue hoạt động.
5. Worker tải file.
6. Worker extract text từ PDF.
7. Làm sạch text.
8. Gửi prompt sang AI model.
9. Lưu kết quả vào `concerts.artist_bio`.
10. Update `artist_bio_status = done` và trả bio về cho admin.

## 3. Kịch bản lỗi

| Lỗi                                 | Xử lý                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------- |
| PDF không đọc được                  | status = failed                                                           |
| AI timeout                          | retry                                                                     |
| AI trả nội dung quá dài             | cắt/tóm tắt lại                                                           |
| File quá lớn                        | Reject upload hoặc xử lý giới hạn page                                    |
| Gemini lỗi sau retry                | Trả lỗi về user, `artist_bio_status = failed`, xóa `artist_asset` vừa tạo |
| Upload lặp khi request cũ chưa xong | Trả 409 theo `Idempotency-Key`, không tạo asset/job mới                   |

## 4. Giới hạn xử lý

- Chỉ chấp nhận file định dạng **PDF**.
- Dung lượng tối đa: **10 MB**.
- Số trang xử lý tối đa: **20 trang đầu** (các trang sau bị bỏ qua).
- AI retry tối đa **3 lần** với exponential backoff (1s → 2s → 4s).
- Nếu AI lỗi sau 3 lần, `artist_bio_status = failed`.
- Admin có thể nhập/sửa artist bio thủ công bất kỳ lúc nào (kể cả khi status là `failed` hoặc `done`).

## 5. Ràng buộc

- Upload PDF không bị block bởi AI processing.
- Có trạng thái `processing` / `done` / `failed`.
- Admin có thể sửa artist bio thủ công sau khi AI sinh.

## 6. Tiêu chí chấp nhận

- Upload PDF xong thấy trạng thái `processing`.
- Worker sinh bio và lưu vào concert detail.
- File quá 10 MB hoặc không phải PDF bị reject ngay tại bước upload.
- AI lỗi sau 3 lần retry → status chuyển `failed`, concert không bị ảnh hưởng.
- Admin sửa bio thủ công thành công.
- Admin có thể xóa bio AI/thủ công vừa tạo; hệ thống đưa `artist_bio_status` về `EMPTY`.

## 7. API Endpoints

### `POST /ai-bio/upload`

- **Mô tả:** Upload PDF để trích xuất tiểu sử nghệ sĩ.
- **Request:** `multipart/form-data`
  - Header `Idempotency-Key`: chuỗi duy nhất cho mỗi lần admin bấm tạo bio
  - `concertId`: UUID
  - `file`: PDF file
- **Response:**
  ```json
  {
    "success": true,
    "data": { "bio": "..." },
    "message": "Processed successfully"
  }
  ```

### `DELETE /admin/concerts/:id/artist-bio`

- **Mô tả:** Admin xóa bio hiện tại của concert.
- **Response:**
  ```json
  { "success": true }
  ```
