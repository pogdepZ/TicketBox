# TicketBox — Project Proposal

## Vấn đề
Thị trường tổ chức sự kiện giải trí và concert âm nhạc tại Việt Nam đang bùng nổ mạnh mẽ với sự xuất hiện của các chương trình quy mô lớn thu hút hàng chục nghìn khán giả như *Anh Trai Say Hi*, *Anh Trai Vượt Ngàn Chông Gai*, *Chị Đẹp Đạp Gió Rẽ Sóng*,... Khi ban tổ chức (BTC) mở bán vé, nhu cầu mua vé cực kỳ lớn dồn vào một thời điểm ngắn gây ra các vấn đề nghiêm trọng:
1. **Quá tải và sập hệ thống (System Down):** Lưu lượng truy cập đồng thời (traffic spike) tăng đột biến lên hàng trăm nghìn request/giây làm cạn kiệt tài nguyên máy chủ backend và treo cơ sở dữ liệu, dẫn đến website sập ngay trong những phút đầu tiên.
2. **Mất nhất quán thanh toán (Payment Inconsistency):** Khán giả đã bị trừ tiền trong tài khoản ngân hàng hoặc ví điện tử (VNPAY/MoMo) nhưng không nhận được vé (e-ticket), hoặc ngược lại. Điều này dẫn đến khiếu nại, tranh chấp pháp lý và làm giảm uy tín của BTC.
3. **Nạn vé chợ đen và Bots đầu cơ (Scalpers & Bots):** Các đối tượng trung gian sử dụng bot tự động gửi hàng loạt request mua vé trong vài giây đầu, gom hết các vé hạng đẹp (SVIP, VIP) rồi bán lại với giá gấp nhiều lần, tước đi cơ hội của những khán giả chân chính.
4. **Quy trình thủ công thiếu chuyên nghiệp:** Nhiều sự kiện nhỏ hơn vẫn sử dụng các kênh phân phối rời rạc (Zalo OA, Google Form, chuyển khoản ngân hàng thủ công). Cách làm này tốn nhiều nhân lực đối soát, dễ xảy ra gian lận, nhầm lẫn thông tin và không thể kiểm soát số lượng vé bán ra theo thời gian thực.
5. **Khó khăn khi soát vé tại sự kiện (Offline Check-in):** Tại các địa điểm biểu diễn lớn như Sân vận động Mỹ Đình, Nhà thi đấu Quân khu 7,... kết nối mạng 3G/4G/Wifi thường bị nghẽn nghiêm trọng khi hàng chục nghìn người tập trung. Việc soát vé trực tuyến bằng API truyền thống sẽ bị tê liệt, gây ùn tắc kéo dài tại cổng vào.

Hệ thống **TicketBox** ra đời nhằm số hóa toàn bộ quy trình phân phối và kiểm soát vé một cách công bằng, an toàn và có khả năng chịu tải cao.

---

## Mục tiêu
Dự án hướng tới xây dựng một hệ thống bán vé ổn định, nhất quán và bảo mật cao với các mục tiêu cụ thể sau:
*   **Khả năng chịu tải đột biến cao:** Hệ thống có khả năng hỗ trợ tối thiểu **80.000 người dùng truy cập đồng thời** trong 5 phút đầu tiên mở bán, với **70% lượng truy cập dồn vào phút đầu tiên** (khoảng 56.000 users/phút) mà không bị sập hay gián đoạn dịch vụ.
*   **Chống bán vượt số lượng (Zero Oversell):** Đảm bảo tính nhất quán tuyệt đối về số lượng vé còn lại của từng khu vực ghế (GA, SVIP, VIP...). Không cho phép tình trạng hai khán giả khác nhau cùng mua và nhận được chiếc vé cuối cùng của một hạng vé.
*   **Enforce giới hạn vé per-user chính xác:** Áp dụng nghiêm ngặt giới hạn số lượng vé tối đa được mua trên mỗi tài khoản (ví dụ: tối đa 2 vé SVIP/tài khoản) ngay cả dưới tải cực cao với các request gửi đồng thời.
*   **Trải nghiệm thanh toán an toàn:** Giảm thiểu tối đa lỗi trừ tiền trùng lặp (double charging) bằng cơ chế Idempotency. Nếu cổng thanh toán gặp sự cố kéo dài, hệ thống vẫn phải duy trì các tính năng đọc thông tin concert bình thường (Graceful Degradation).
*   **Soát vé ngoại tuyến đáng tin cậy:** Đảm bảo nhân sự soát vé có thể làm việc mượt mà ngay cả khi không có kết nối mạng (offline-first) với thời gian phản hồi dưới 1 giây/vé và đồng bộ dữ liệu chuẩn xác lên máy chủ khi có mạng trở lại.

---

## Người dùng và nhu cầu

| Nhóm người dùng | Nhu cầu chính | Điều quan trọng nhất |
| :--- | :--- | :--- |
| **Khán giả (Customer)** | - Xem danh sách concert, thông tin nghệ sĩ.<br>- Xem sơ đồ ghế SVG và trạng thái vé còn lại theo thời gian thực.<br>- Đặt chỗ, giữ vé tạm thời và thanh toán nhanh chóng.<br>- Nhận e-ticket QR Code qua ứng dụng và email.<br>- Check-in nhanh tại cổng sự kiện. | - Trải nghiệm mua vé công bằng (không bị bot vét trước).<br>- Không bị mất tiền oan (trừ tiền nhưng không ra vé).<br>- Mua vé nhanh chóng, không bị lag. |
| **Ban tổ chức (Admin)** | - Tạo mới, cập nhật hoặc hủy concert.<br>- Cấu hình các hạng vé (số lượng, giá tiền, thời gian mở bán, giới hạn quota).<br>- Tải hồ sơ nghệ sĩ (PDF) để AI tự động trích xuất Bio.<br>- Import danh sách khách mời tài trợ (VIP Guest List) từ file CSV.<br>- Xem thống kê doanh thu và tiến độ bán vé. | - Kiểm soát truy cập chặt chẽ (hạn chế quyền nhân viên).<br>- Hệ thống hoạt động liên tục lúc mở bán.<br>- Quản lý danh sách khách mời an toàn, chính xác. |
| **Nhân sự soát vé (Checker)** | - Quét mã QR trên vé điện tử tại cổng vào sự kiện.<br>- Xác thực thông tin vé hợp lệ/không hợp lệ/sai sự kiện.<br>- Ghi nhận lịch sử check-in offline khi mất mạng và đồng bộ tự động lên server khi có mạng lại. | - Tốc độ quét cực nhanh (tránh ùn tắc cổng sự kiện).<br>- Hoạt động ổn định khi không có mạng.<br>- Phát hiện chính xác vé giả hoặc vé quét trùng lặp (double check-in). |

---

## Phạm vi

### Trong phạm vi dự án
*   **Ứng dụng Frontend (Web App):** Trang chủ duyệt concert, trang chi tiết concert với seat map SVG tương tác, luồng đặt vé và giữ vé tạm thời (Reservation), trang checkout thanh toán giả lập và trang nhận vé điện tử kèm mã QR.
*   **Ứng dụng Mobile Check-in (Client App):** Giao diện quét QR dành cho Checker, hỗ trợ cơ chế lưu log check-in offline vào SQLite và cơ chế tự động đồng bộ hàng loạt (Bulk Sync) lên Backend.
*   **Hệ thống Backend (API Server):**
    *   Quản lý Auth và Phân quyền dựa trên vai trò (RBAC).
    *   Nghiệp vụ Concert & Vé: Đặt vé, cập nhật tồn kho, thanh toán, quản lý quota per-user.
    *   Bảo vệ hệ thống: Rate Limiting (Token Bucket), Idempotency xử lý giao dịch, Redis cache. Waiting Room (phòng chờ ảo) là cơ chế mở rộng, triển khai nếu còn thời gian.
    *   Xử lý file: Tải lên PDF nghệ sĩ và gọi AI tạo Bio, tải CSV khách mời VIP bất đồng bộ.
*   **Hạ tầng Cơ sở dữ liệu:** Cơ sở dữ liệu PostgreSQL lưu trữ dữ liệu nghiệp vụ chính và Redis phục vụ Caching, Queue và Rate Limiting.

### Ngoài phạm vi dự án
*   **Tích hợp cổng thanh toán thật:** Dự án chỉ sử dụng mock cổng thanh toán (giả lập các request/response và webhook từ VNPAY/MoMo) để kiểm thử luồng nghiệp vụ và Circuit Breaker, không kết nối tài khoản doanh nghiệp thật.
*   **Hạ tầng sản xuất (Production Infrastructure):** Không bao gồm việc thiết kế hạ tầng Kubernetes cluster thực tế, CDN phân tán toàn cầu, hay cài đặt hệ thống Load Balancer vật lý (các thành phần này sẽ được giả định ở mức kiến trúc logic).
*   **Gửi Email/SMS qua dịch vụ thật:** Các thông báo gửi đi sẽ được đưa vào Queue và lưu log/gửi giả lập (Mock Mail Service) thay vì trả phí tích hợp Twilio, SendGrid thật.

---

## Rủi ro và ràng buộc
1.  **Tranh chấp tài nguyên (Race Condition):** Dưới lưu lượng truy cập khổng lồ, việc kiểm tra tồn kho vé và thực hiện trừ số lượng dễ bị xung đột dữ liệu dẫn đến oversell. Ràng buộc là phải xử lý ở tầng Database Transaction với Row Lock và đảm bảo không gây ra Deadlock hệ thống.
2.  **Đồng bộ dữ liệu check-in offline bị xung đột (Sync Conflict):** Khi nhiều thiết bị soát vé offline cùng hoạt động, có khả năng một chiếc vé điện tử (hoặc mã QR bị sao chép) được quét thành công ở hai cổng soát vé khác nhau cùng một thời điểm. Khi đồng bộ lên server, hệ thống phải phát hiện ra lỗi conflict và ghi nhận cảnh báo gian lận.
3.  **Tác vụ nặng gây nghẽn tiến trình chính (Blocking Event Loop):** Việc xử lý tệp tin CSV danh sách khách mời lớn (hàng nghìn dòng) và xử lý file PDF thông tin nghệ sĩ bằng AI là những tác vụ tốn tài nguyên. Nếu thực hiện đồng bộ trên luồng xử lý chính của Node.js, nó sẽ kéo sập hiệu năng của luồng mua vé. Bắt buộc phải xử lý bất đồng bộ (Background Workers/Queue).
4.  **Cổng thanh toán bên thứ ba không ổn định:** Thời gian phản hồi webhook của VNPAY/MoMo có thể kéo dài hoặc bị gián đoạn. Thiết kế hệ thống phải có cơ chế Circuit Breaker để bảo vệ hệ thống không bị treo luồng khi chờ đợi kết quả thanh toán.
