# CHECKLIST ĐỐI CHIẾU YÊU CẦU ĐỒ ÁN TICKETBOX

> Điền theo sản phẩm thực tế. "Tiến độ tự khai" là trung bình cột % HT. "Hoàn thành đủ minh chứng" chỉ tính mục có trạng thái Hoàn thành, tự kiểm tra Đạt và có link/path minh chứng. Mục "Không áp dụng" được loại khỏi mẫu số.

| Tiến độ tự khai | Hoàn thành 100% | Tự kiểm tra Đạt | Có minh chứng | Hoàn thành đủ minh chứng |
|:---:|:---:|:---:|:---:|:---:|
| 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |

> Xem chi tiết tại 08_TongHopGV

---

## Blueprint

| ID | Mức độ | Yêu cầu cần chứng minh | Minh chứng mong đợi | Owner | Trạng thái | % HT | Link/Path minh chứng | Kết quả tự kiểm tra | Ghi chú/lỗi còn lại |
|:---|:---|:---|:---|:---|:---:|:---:|:---|:---|:---|
| BP01 | Bắt buộc | Tài liệu mô tả kiến trúc tổng thể, thành phần, giao tiếp, ảnh hưởng khi một phần lỗi. | design.md/blueprint.pdf; lập luận lựa chọn kiến trúc | | Chưa làm | 0% | | Chưa kiểm tra | |
| BP02 | Bắt buộc | C4 Level 1 – System Context: actors và hệ thống ngoài. | Sơ đồ + mô tả Khán giả, Ban tổ chức, Soát vé, VNPAY/MoMo, AI, CSV | | Chưa làm | 0% | | Chưa kiểm tra | |
| BP03 | Bắt buộc | C4 Level 2 – Container: web, mobile, backend, database, broker/cache... | Sơ đồ có công nghệ và giao tiếp giữa container | | Chưa làm | 0% | | Chưa kiểm tra | |
| BP04 | Bắt buộc | High-Level Architecture Diagram, nhấn mạnh payment, AI, CSV và offline check-in. | Sơ đồ luồng dữ liệu/phụ thuộc và failure boundary | | Chưa làm | 0% | | Chưa kiểm tra | |
| BP05 | Bắt buộc | Thiết kế dữ liệu: SQL/NoSQL/kết hợp và schema entity quan trọng. | ERD/schema + giải thích lựa chọn và consistency | | Chưa làm | 0% | | Chưa kiểm tra | |
| BP06 | Chọn ít nhất 2 luồng | Luồng mua vé từ bấm mua đến nhận e-ticket; có xử lý lỗi giữa chừng. | Sequence/activity diagram hoặc mô tả bước + lỗi | | Chưa làm | 0% | | Chưa kiểm tra | |
| BP07 | Chọn ít nhất 2 luồng | Luồng soát vé mất mạng và đồng bộ lại; tránh vé vào hai lần. | Sequence/state diagram + conflict handling | | Chưa làm | 0% | | Chưa kiểm tra | |
| BP08 | Chọn ít nhất 2 luồng | Luồng nhập Guest List CSV; xử lý file lỗi và dữ liệu trùng. | Flow + validation + idempotent import | | Chưa làm | 0% | | Chưa kiểm tra | |
| BP09 | Bắt buộc | Thiết kế kiểm soát truy cập cho Khán giả, Ban tổ chức, Nhân sự soát vé. | Role-permission matrix + enforcement tại endpoint/UI/app | | Chưa làm | 0% | | Chưa kiểm tra | |
| BP10 | Bắt buộc | Giải pháp tải đột biến/rate limiting cho 80.000 người trong 5 phút, 70% ở phút đầu. | Thuật toán, ngưỡng, key giới hạn, hành vi khi vượt ngưỡng | | Chưa làm | 0% | | Chưa kiểm tra | |
| BP11 | Bắt buộc | Circuit Breaker + Graceful Degradation khi VNPAY/MoMo lỗi. | Closed/Open/Half-Open, threshold, fallback | | Chưa làm | 0% | | Chưa kiểm tra | |
| BP12 | Bắt buộc | Idempotency Key chống trừ tiền hai lần. | Cách sinh/lưu/check key, TTL, response khi lặp | | Chưa làm | 0% | | Chưa kiểm tra | |
| BP13 | Bắt buộc | Caching cho danh sách/chi tiết concert và số vé còn lại. | Cache-aside, TTL từng loại, invalidation | | Chưa làm | 0% | | Chưa kiểm tra | |
| BP14 | Khuyến nghị | ADR cho các quyết định lớn và đánh đổi. | ADR SQL/NoSQL, JWT/session, broker, locking... | | Chưa làm | 0% | | Chưa kiểm tra | |
| BP15 | Bắt buộc | Tổ chức proposal.md, design.md và specs/[feature].md hoặc blueprint.pdf tương đương. | Cấu trúc file đầy đủ, acceptance criteria và error scenarios | | Chưa làm | 0% | | Chưa kiểm tra | |

---

## Cài đặt

| ID | Mức độ | Yêu cầu cần chứng minh | Minh chứng mong đợi | Owner | Trạng thái | % HT | Link/Path minh chứng | Kết quả tự kiểm tra | Ghi chú/lỗi còn lại |
|:---|:---|:---|:---|:---|:---:|:---:|:---|:---|:---|
| IM01 | Bắt buộc | Xem danh sách/chi tiết concert, nghệ sĩ, địa điểm, sơ đồ SVG theo khu và vé còn lại. | Demo UI + API + dữ liệu thật/seed | | Chưa làm | 0% | | Chưa kiểm tra | |
| IM02 | Bắt buộc | Chọn loại/số lượng vé, thanh toán và sinh e-ticket QR. | Demo end-to-end + order/payment/ticket records | | Chưa làm | 0% | | Chưa kiểm tra | |
| IM03 | Bắt buộc | Enforce giới hạn vé/tài khoản trên toàn bộ đơn thành công, kể cả request đồng thời. | Test concurrent + constraint/transaction/lock | | Chưa làm | 0% | | Chưa kiểm tra | |
| IM04 | Bắt buộc | Thông báo app/email sau mua và nhắc trước 24 giờ; dễ thêm kênh mới. | Code notification abstraction + scheduler/job + demo | | Chưa làm | 0% | | Chưa kiểm tra | |
| IM05 | Bắt buộc | Admin tạo/sửa/hủy concert, cấu hình loại vé và xem doanh thu/lượng bán. | Demo role admin + API/UI + dữ liệu thống kê | | Chưa làm | 0% | | Chưa kiểm tra | |
| IM06 | Bắt buộc | RBAC được cài thật ở API, trang admin và app soát vé. | Middleware/policy + test quyền sai/đúng | | Chưa làm | 0% | | Chưa kiểm tra | |
| IM07 | Bắt buộc | Mobile app quét QR và xác nhận vé tại cổng. | Demo scan + validation + check-in record | | Chưa làm | 0% | | Chưa kiểm tra | |
| IM08 | Bắt buộc | Soát vé offline, lưu tạm, đồng bộ khi có mạng, không mất dữ liệu/không vào hai lần. | Demo bật/tắt mạng + sync/conflict test | | Chưa làm | 0% | | Chưa kiểm tra | |
| IM09 | Bắt buộc | AI Artist Bio: upload PDF, tách/làm sạch text, gọi AI và tạo bio ngắn. | PDF mẫu + pipeline + output + xử lý lỗi | | Chưa làm | 0% | | Chưa kiểm tra | |
| IM10 | Bắt buộc | Định kỳ nhập Guest List CSV; xử lý file lỗi, trùng và không làm gián đoạn hệ thống. | Job/scheduler + validation + duplicate report | | Chưa làm | 0% | | Chưa kiểm tra | |
| IM11 | Bắt buộc | Không oversell vé cuối cùng khi nhiều người mua đồng thời. | Concurrency test + transaction/locking/atomic update | | Chưa làm | 0% | | Chưa kiểm tra | |
| IM12 | Bắt buộc | Cơ chế bảo vệ tải đột biến/rate limiting/bot-fairness cài trong code. | Middleware/config + test vượt ngưỡng/load test | | Chưa làm | 0% | | Chưa kiểm tra | |
| IM13 | Bắt buộc | Circuit breaker và graceful degradation cài thật. | Test payment lỗi liên tiếp; trang concert vẫn hoạt động | | Chưa làm | 0% | | Chưa kiểm tra | |
| IM14 | Bắt buộc | Idempotency cài thật, cùng request không tạo/trừ tiền hai lần. | Test retry/same key/concurrent retry | | Chưa làm | 0% | | Chưa kiểm tra | |
| IM15 | Bắt buộc | Caching cài thật, có TTL/invalidation phù hợp. | Redis/cache code + hit/miss logs + consistency test | | Chưa làm | 0% | | Chưa kiểm tra | |
| IM16 | Bắt buộc | README đủ để clone và chạy không cần hỏi thêm. | Prerequisites, env, commands, ports, accounts, troubleshooting | | Chưa làm | 0% | | Chưa kiểm tra | |
| IM17 | Bắt buộc | Seed data/script có 4 concert mẫu, loại vé, giá và sơ đồ chỗ ngồi. | data/ + migration/seed script + ảnh chạy thành công | | Chưa làm | 0% | | Chưa kiểm tra | |
| IM18 | Bắt buộc | Toàn bộ hệ thống có thể khởi chạy và demo theo Blueprint. | Script/docker compose + smoke test end-to-end | | Chưa làm | 0% | | Chưa kiểm tra | |

---

## Nộp bài

| ID | Mức độ | Yêu cầu cần chứng minh | Minh chứng mong đợi | Owner | Trạng thái | % HT | Link/Path minh chứng | Kết quả tự kiểm tra | Ghi chú/lỗi còn lại |
|:---|:---|:---|:---|:---|:---:|:---:|:---|:---|:---|
| SB01 | Bắt buộc | Google Drive public và người chấm mở được bằng tài khoản khác/ẩn danh. | Link Drive + ảnh kiểm tra quyền | | Chưa làm | 0% | | Chưa kiểm tra | |
| SB02 | Bắt buộc | Drive có blueprint.pdf hoặc thư mục blueprint/ đầy đủ. | Link trực tiếp tới Blueprint | | Chưa làm | 0% | | Chưa kiểm tra | |
| SB03 | Bắt buộc | Drive có src/, data/ và README.md. | Link trực tiếp tới source + kiểm tra cấu trúc | | Chưa làm | 0% | | Chưa kiểm tra | |
| SB04 | Bắt buộc | Drive có clips/ video MP4 1080p, khoảng 720 kbps, camera + demo code/app. | Link video + kiểm tra phát được | | Chưa làm | 0% | | Chưa kiểm tra | |
| SB05 | Bắt buộc | File text tên mã-nhóm_mssv1_...txt; nội dung là link Drive public. | Tên file và nội dung file text | | Chưa làm | 0% | | Chưa kiểm tra | |