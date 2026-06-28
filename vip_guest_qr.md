# VIP Guest QR Code

Bạn có thể scan mã QR dưới đây để test chức năng Guest List (Cổng VIP).

Mã này chứa chuỗi text đơn giản: `VIP-GUEST-001` (Không phải JWT, vì file CSV upload lên từ BTC thường chỉ chứa mã text đơn giản của khách mời).

Khách mời này đã được cấu hình:
- Trạng thái: `ACTIVE`
- Cổng hợp lệ: `Gate VVIP`

![QR Code VIP GUEST](https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=VIP-GUEST-001)

### Cách test
1. Bấm **Download Snapshot** lại để app cập nhật danh sách Guest mới nhất vào SQLite.
2. Quay lại màn hình **Scanner**.
3. Chọn cổng **Gate VVIP** (nếu không có thì bạn có thể chọn bất kỳ cổng nào để xem nó báo lỗi "Sai khu vực").
4. Đưa camera điện thoại scan mã QR ở trên màn hình này.
5. Bạn có thể test cả 2 trường hợp **Online** (Bật mạng) và **Offline** (Tắt mạng - ngắt Wifi/4G). App sẽ tra cứu và cho ra màn hình xanh lá: "Check-in thành công - NGUYEN VAN A VIP - Cổng Gate VVIP".
