### Người D - Mobile Check-in + Integrations

| ID | Nhóm việc | Task cụ thể tuần 2 | Kết quả bàn giao | Tiêu chí xong |
| --- | --- | --- | --- | --- |
| D1 | Checker auth mobile | Login checker, lưu accessToken an toàn, gọi profile. | Mobile auth. | Checker login được trên Expo app. |
| D2 | Check-in scan online | POST /checkin/scan với ticketCode/QR. | CheckinModule thật. | ACCEPTED/DUPLICATE/INVALID hiển thị đúng. |
| D3 | Check-in DB constraints | Đảm bảo ticket chỉ check-in success một lần; tạo CheckinLog. | Check-in logic. | Scan lần 2 bị duplicate. |
| D4 | Offline queue | SQLite hoặc mock local queue: lưu pending scans khi offline. | Offline queue UI. | Tắt mạng/mock offline vẫn lưu scan. |
| D5 | Sync API | POST /checkin/sync gửi batch pending scans. | Sync endpoint + mobile sync. | Online lại sync được, duplicate bị reject. |
| D6 | Notification skeleton | NotificationModule: record notification, mock email/in-app. | Notification skeleton. | Payment success có thể tạo notification mock. |
| D7 | AI Artist Bio upload | Upload file/text, set processing, mock worker set done/failed. | AiBio flow skeleton. | Admin upload, concert có artistBio mock. |
| D8 | Guest List CSV | Import CSV, validate rows, duplicate handling, summary result. | GuestList flow. | CSV lỗi dòng nào báo dòng đó, không crash toàn bộ. |
| D9 | Integration specs | Update specs/checkin.md, notification.md, ai-artist-bio.md, guest-list.md. | Specs cập nhật. | Có flow lỗi mất mạng, duplicate, file sai, AI fail. |
| D10 | Mobile demo script | Chuẩn bị demo scan QR hợp lệ/trùng/sai + sync offline. | demo-mobile.md. | Demo 3 case scan rõ ràng. |