# Đặc tả: Concert Seat Map SVG Upload

## 1. Mô tả

Khi tạo concert, admin có thể chọn một trong hai cách cấu hình hạng vé và sơ đồ ghế:

- Tạo record concert trước, sau đó upload file `.svg` seat map có metadata zone và seat number trong cùng SVG.
- Không upload SVG và nhập thủ công `ticketTypes` như luồng hiện tại.

Nếu admin upload SVG, backend lấy cả thông tin zone và từng ghế từ SVG để tạo `SeatZone` và `TicketType`. Tổng số vé của từng hạng được tính từ số element ghế có `data-seat-number` thuộc zone đó.

## 2. API tạo concert và upload SVG

### `POST /concerts`

- **Content-Type:** `application/json`.
- **Quyền:** `concert:create`.
- **Các field concert:** `name`, `description`, `artistName`, `venueName`, `venueAddress`, `eventDate`, `posterUrl`, `ticketTypes`.

Luồng:

1. Frontend gửi thông tin cơ bản để backend tạo concert `DRAFT`.
2. Nếu admin không chọn SVG, backend dùng `ticketTypes` trong body để tạo hạng vé thủ công.
3. Nếu admin có chọn SVG, frontend vẫn tạo concert trước, sau đó gọi endpoint upload SVG bên dưới. Hạng vé tạo thủ công trước đó sẽ được thay bằng dữ liệu lấy từ SVG.

### `POST /concerts/:id/seat-map-svg`

- **Content-Type:** `multipart/form-data`.
- **Quyền:** `ticket_type:manage`.
- **Field file bắt buộc:** `file`.
- **Điều kiện:** concert phải ở trạng thái `DRAFT`, chưa có ticket/reservation.

Luồng backend:

1. Validate file `.svg`, kích thước và nội dung nguy hiểm.
2. Parse zone và seat number từ cùng một SVG.
3. Sanitize SVG theo whitelist tag/attribute.
4. Upload bản SVG đã sanitize lên storage.
5. Xóa `SeatZone`/`TicketType` nháp cũ của concert.
6. Tạo `SeatZone` và `TicketType` mới từ metadata SVG.
7. `TicketType.totalQuantity` và `remaining` = số ghế đếm được trong zone.

## 3. Cấu trúc SVG admin cần upload

Một file SVG phải chứa cả hai phần:

- Zone/hạng vé: element nhóm vùng, ví dụ `<g id="zone-vip" ...>`.
- Ghế: từng element ghế trong zone, ví dụ `<circle id="seat-vip-a01" ...>`.

### 3.1 Metadata trên zone

Mỗi hạng ghế/vùng ghế phải là một SVG element có các attribute `data-*` sau:

| Attribute             |    Bắt buộc | Ý nghĩa                                                                           |
| --------------------- | ----------: | --------------------------------------------------------------------------------- |
| `id`                  | Khuyến nghị | ID element dùng để map `SeatZone.svgElementId`                                    |
| `data-zone-code`      |          Có | Mã vùng duy nhất trong concert, ví dụ `svip`, `vip`, `cat-1`                      |
| `data-zone-name`      |       Không | Tên vùng hiển thị trên seat map                                                   |
| `data-ticket-name`    |       Không | Tên hạng vé; nếu thiếu dùng `data-zone-name`, nếu vẫn thiếu dùng `data-zone-code` |
| `data-total-quantity` |       Không | Nếu có thì phải khớp số ghế đếm được trong zone; backend vẫn lấy số lượng từ ghế  |
| `data-price`          |          Có | Giá vé, số >= 0                                                                   |
| `data-max-per-user`   |       Không | Số vé tối đa mỗi user, mặc định `4`                                               |

### 3.2 Metadata trên từng ghế

Mỗi ghế chọn được phải là một element có các attribute sau:

| Attribute          |    Bắt buộc | Ý nghĩa                                                      |
| ------------------ | ----------: | ------------------------------------------------------------ |
| `id`               | Khuyến nghị | ID element để frontend map trạng thái chọn/đã bán            |
| `data-zone-code`   |          Có | Mã zone/hạng vé mà ghế thuộc về; phải trùng zone đã khai báo |
| `data-seat-number` |          Có | Mã ghế duy nhất trong zone, ví dụ `A01`, `B12`, `Q08`        |

Ví dụ SVG hợp lệ:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <ellipse cx="400" cy="70" rx="260" ry="55" fill="#c7c7d2" />
  <text x="400" y="78" text-anchor="middle" fill="#666666">STAGE/SÂN KHẤU</text>

  <g id="zone-svip"
     data-zone-code="svip"
     data-zone-name="SVIP"
     data-ticket-name="SVIP"
     data-total-quantity="4"
     data-price="2500000"
     data-max-per-user="2">
    <path d="M180 150 H620 V280 H180 Z" fill="#ffd1cc" stroke="#ffffff" />
    <text x="400" y="175" text-anchor="middle" fill="#333333">SVIP</text>
    <circle id="seat-svip-a01" data-zone-code="svip" data-seat-number="A01" cx="300" cy="220" r="7" fill="#ffffff" stroke="#999999" />
    <circle id="seat-svip-a02" data-zone-code="svip" data-seat-number="A02" cx="330" cy="220" r="7" fill="#ffffff" stroke="#999999" />
    <circle id="seat-svip-b01" data-zone-code="svip" data-seat-number="B01" cx="300" cy="250" r="7" fill="#ffffff" stroke="#999999" />
    <circle id="seat-svip-b02" data-zone-code="svip" data-seat-number="B02" cx="330" cy="250" r="7" fill="#ffffff" stroke="#999999" />
  </g>

  <g id="zone-vip"
     data-zone-code="vip"
     data-zone-name="VIP"
     data-ticket-name="VIP"
     data-total-quantity="4"
     data-price="1500000"
     data-max-per-user="4">
    <path d="M120 300 H680 V520 H120 Z" fill="#bdeff0" stroke="#ffffff" />
    <text x="400" y="330" text-anchor="middle" fill="#333333">VIP</text>
    <circle id="seat-vip-m01" data-zone-code="vip" data-seat-number="M01" cx="300" cy="390" r="7" fill="#ffffff" stroke="#999999" />
    <circle id="seat-vip-m02" data-zone-code="vip" data-seat-number="M02" cx="330" cy="390" r="7" fill="#ffffff" stroke="#999999" />
    <circle id="seat-vip-n01" data-zone-code="vip" data-seat-number="N01" cx="300" cy="420" r="7" fill="#ffffff" stroke="#999999" />
    <circle id="seat-vip-n02" data-zone-code="vip" data-seat-number="N02" cx="330" cy="420" r="7" fill="#ffffff" stroke="#999999" />
  </g>
</svg>
```

Backend sẽ tạo dữ liệu tương ứng:

- `SeatZone.code = data-zone-code` sau khi normalize.
- `SeatZone.name = data-ticket-name` hoặc `data-zone-name`.
- `SeatZone.svgElementId = id` nếu có.
- `TicketType.name = data-ticket-name` hoặc `data-zone-name`.
- `TicketType.totalQuantity = số element ghế có data-seat-number trong zone`.
- `TicketType.remaining = totalQuantity`.
- `TicketType.price = data-price`.
- `TicketType.maxPerUser = data-max-per-user` hoặc `4`.

## 4. Validate và sanitize bảo mật

Backend chỉ chấp nhận:

- File có đuôi `.svg` hoặc MIME `image/svg+xml`.
- Dung lượng tối đa `1 MB`.
- SVG inline có `<svg ...>` và `</svg>`.
- Ít nhất một vùng có đủ `data-zone-code`, `data-price`.
- Ít nhất một ghế có đủ `data-zone-code`, `data-seat-number`.
- `data-zone-code` không trùng trong cùng file.
- `data-seat-number` không trùng trong cùng zone.
- Ghế không được tham chiếu đến zone chưa khai báo.
- Mỗi zone phải có ít nhất một ghế.
- Nếu có `data-total-quantity`, giá trị này phải bằng số ghế đếm được trong zone.
- `data-total-quantity` và `data-max-per-user` là số nguyên dương nếu được khai báo.
- `data-price` là số không âm.

Nội dung bị reject ngay nếu có:

- Tag nguy hiểm: `script`, `iframe`, `object`, `embed`, `foreignObject`, `image`, `use`.
- Event handler dạng `onclick`, `onload`, ...
- URL/payload nguy hiểm như `javascript:` hoặc `data:text/html`.

Whitelist tag được giữ lại khi sanitize:

```txt
svg, g, path, rect, circle, ellipse, line, polyline, polygon, text, tspan, title, desc
```

Whitelist attribute được giữ lại khi sanitize:

```txt
id, class, viewBox, xmlns, x, y, x1, y1, x2, y2, cx, cy, r, rx, ry, d, points,
width, height, fill, stroke, stroke-width, opacity, transform, font-size,
text-anchor, data-zone-code, data-zone-name, data-ticket-name,
data-total-quantity, data-price, data-max-per-user, data-seat-number
```

## 5. Kịch bản lỗi

| Lỗi                                          | Xử lý                                                         |
| -------------------------------------------- | ------------------------------------------------------------- |
| File không phải `.svg`                       | Trả `400 Bad Request`                                         |
| SVG vượt 1 MB                                | Trả `400 Bad Request`                                         |
| SVG có script/event handler                  | Trả `400 Bad Request`                                         |
| Thiếu metadata hạng vé hoặc ghế              | Trả `400 Bad Request`                                         |
| `data-zone-code` trùng                       | Trả `400 Bad Request`                                         |
| `data-seat-number` trùng trong cùng zone     | Trả `400 Bad Request`                                         |
| Ghế tham chiếu zone chưa khai báo            | Trả `400 Bad Request`                                         |
| Không upload SVG và không nhập `ticketTypes` | Concert vẫn được tạo draft, admin có thể thêm ticket type sau |

## 6. Tiêu chí chấp nhận

- Admin tạo concert bằng form không upload SVG và nhập ticket type thủ công thành công.
- Admin chọn file SVG thì frontend gọi `POST /concerts` trước, sau đó gọi `POST /concerts/:id/seat-map-svg`.
- Backend tự tạo `SeatZone` và `TicketType` theo metadata zone + seat trong SVG.
- Tổng số vé của từng hạng bằng số ghế đếm được trong SVG.
- SVG lưu lên storage là bản đã sanitize, không giữ attribute/tag ngoài whitelist.
- SVG có `script`, `onload`, `javascript:` hoặc tag ngoài nhóm an toàn bị reject hoặc bị loại bỏ theo policy bảo mật.
- File sai định dạng, quá dung lượng hoặc thiếu metadata trả lỗi rõ ràng.
