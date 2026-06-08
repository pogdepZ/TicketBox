# Đặc tả: AI Artist Bio — Sinh tiểu sử nghệ sĩ từ PDF

## 1. Tổng quan

Module cho phép Admin/Organizer upload file PDF press kit của nghệ sĩ. Hệ thống tự động trích xuất văn bản từ PDF, gửi đến AI model để sinh tiểu sử ngắn gọn, và lưu vào database gắn với concert tương ứng.

---

## 2. Luồng xử lý

```
Admin/Organizer truy cập trang quản lý concert
  → Chọn concert cần cập nhật artist bio
  → Upload file PDF (press kit)
  → Frontend gửi: POST /admin/concerts/:id/artist-bio/upload
      - Content-Type: multipart/form-data
      - field: file (PDF)
  → Backend nhận file:
      1. Validate file (type, size)
      2. Lưu file tạm lên Object Storage (MinIO/S3)
      3. Extract text từ PDF (dùng pdf-parse hoặc pdfjs-dist)
      4. Gửi extracted text đến AI Model (LLM API)
          - Prompt: "Tạo tiểu sử nghệ sĩ dựa trên press kit..."
      5. Nhận bio text từ AI
      6. Lưu vào concerts.artist_bio
      7. Cập nhật concerts.artist_bio_status = 'generated'
      8. Trả response
  → Frontend hiển thị bio đã được sinh
```

---

## 3. API Contract

### `POST /admin/concerts/:id/artist-bio/upload`

**Auth**: Bearer JWT (Role: `ORGANIZER` hoặc `ADMIN`)

**Request**:
```
Content-Type: multipart/form-data

Field: file (PDF file)
Max size: 10MB
Accepted types: application/pdf
```

**Response thành công (200)**:
```json
{
  "success": true,
  "data": {
    "bio": "Nghệ sĩ ABC là ca sĩ nổi tiếng Việt Nam với hơn 10 năm hoạt động..."
  },
  "message": "Artist bio generated successfully from PDF"
}
```

**Response lỗi — PDF không đọc được (400)**:
```json
{
  "success": false,
  "data": null,
  "message": "Cannot extract text from the uploaded PDF. File may be corrupted or image-based."
}
```

**Response lỗi — AI timeout (504)**:
```json
{
  "success": false,
  "data": null,
  "message": "AI service timeout. Please try again."
}
```

---

## 4. Xử lý file

### Validation rules

| Rule | Giá trị | Lỗi |
|---|---|---|
| File type | `application/pdf` only | 400: "Invalid file type" |
| File size | Max 10MB | 400: "File too large (max 10MB)" |
| Nội dung | Phải extract được text | 400: "Cannot extract text" |
| Số trang | Max 50 trang | 400: "PDF exceeds 50 pages" |

### File flow

```
Upload → Validate → Save to S3/MinIO
  → Extract text (pdf-parse)
  → Clean text (remove special chars, normalize whitespace)
  → Truncate to max 5000 tokens
  → Send to AI model
  → Save bio to DB
  → Delete temp file (optional, có thể giữ để audit)
```

---

## 5. AI Model Integration

### Prompt Template

```
You are a professional copywriter. Based on the following press kit information,
write a concise artist biography in Vietnamese (200-300 words).
Focus on: career highlights, notable achievements, genre, and upcoming events.

Press Kit Content:
---
{extractedText}
---

Output the biography only, no additional commentary.
```

### Configuration

| Param | Giá trị |
|---|---|
| Model | GPT-4o-mini / Gemini Flash (configurable) |
| Max tokens | 500 |
| Temperature | 0.7 |
| Timeout | 30 giây |
| Retry | 1 lần nếu timeout |

---

## 6. Error Handling

| Tình huống | HTTP Status | Xử lý |
|---|---|---|
| File không phải PDF | 400 | Trả lỗi ngay, không xử lý |
| File quá lớn (>10MB) | 400 | Trả lỗi ngay |
| PDF không extract được text | 400 | Trả lỗi, gợi ý upload PDF khác |
| AI model timeout | 504 | Retry 1 lần → nếu vẫn lỗi → trả 504 |
| AI model trả nội dung rỗng | 500 | Log error, trả lỗi "AI could not generate bio" |
| Concert không tồn tại | 404 | Trả "Concert not found" |
| Không có quyền | 403 | Trả "Forbidden" |

---

## 7. Database Changes

```sql
-- Cập nhật bảng concerts (đã có sẵn trong schema)
-- Các cột liên quan:
-- artist_bio TEXT          -- Nội dung bio được sinh
-- artist_bio_status VARCHAR(20) DEFAULT 'empty'
--   Giá trị: 'empty', 'processing', 'generated', 'failed'
```

### Bio Status Flow

```
empty → (upload) → processing → (AI success) → generated
                              → (AI failed)  → failed
generated → (re-upload) → processing → ...
```

---

## 8. Tiêu chí chấp nhận

- Upload PDF thành công và nhận được bio text
- File validation hoạt động (type, size)
- Error handling đúng HTTP status
- AI timeout được retry 1 lần trước khi trả lỗi
- Bio được lưu vào database gắn với đúng concert
- Chỉ ORGANIZER và ADMIN mới có quyền upload
