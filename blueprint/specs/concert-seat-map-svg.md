# Đặc tả: Concert Seat Map SVG Upload

## 1. Mô tả

Khi tạo concert, admin có thể chọn một trong hai cách cấu hình hạng vé:

- Upload file `.svg` seat map có metadata hạng ghế ngay trong SVG.
- Không upload SVG và nhập thủ công `ticketTypes` như luồng hiện tại.

Nếu request có file SVG, backend ưu tiên dữ liệu trong SVG để tạo `SeatZone` và `TicketType`. Nếu không có file, backend dùng dữ liệu admin nhập trong body.

## 2. API tạo concert

### `POST /concerts`

- **Content-Type:** `multipart/form-data` khi upload SVG, hoặc JSON khi không upload.
- **Quyền:** `concert:create`.
- **Field file tùy chọn:** `file`.
- **Các field concert:** `name`, `description`, `artistName`, `venueName`, `venueAddress`, `eventDate`, `posterUrl`, `ticketTypes`.

Luồng ưu tiên dữ liệu:

1. Nếu có `file` SVG hợp lệ, backend sanitize SVG, upload bản đã sanitize lên storage và tự tạo ticket type từ metadata SVG.
2. Nếu không có `file`, backend dùng `ticketTypes` trong request body để tạo hạng vé.
3. Nếu cả hai cùng được gửi, metadata trong SVG là nguồn đúng cho hạng vé, `ticketTypes` thủ công bị bỏ qua để tránh lệch dữ liệu.

## 3. Cấu trúc SVG admin cần upload

Mỗi hạng ghế/vùng ghế phải là một SVG element có các attribute `data-*` sau:

| Attribute             |    Bắt buộc | Ý nghĩa                                                                           |
| --------------------- | ----------: | --------------------------------------------------------------------------------- |
| `id`                  | Khuyến nghị | ID element dùng để map `SeatZone.svgElementId`                                    |
| `data-zone-code`      |          Có | Mã vùng duy nhất trong concert, ví dụ `svip`, `vip`, `cat-1`                      |
| `data-zone-name`      |       Không | Tên vùng hiển thị trên seat map                                                   |
| `data-ticket-name`    |       Không | Tên hạng vé; nếu thiếu dùng `data-zone-name`, nếu vẫn thiếu dùng `data-zone-code` |
| `data-total-quantity` |          Có | Tổng số ghế/vé của hạng này                                                       |
| `data-price`          |          Có | Giá vé, số >= 0                                                                   |
| `data-max-per-user`   |       Không | Số vé tối đa mỗi user, mặc định `4`                                               |

Ví dụ SVG hợp lệ:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400">
  <g id="zone-svip"
     data-zone-code="svip"
     data-zone-name="SVIP"
     data-ticket-name="SVIP"
     data-total-quantity="120"
     data-price="2500000"
     data-max-per-user="2">
    <rect x="250" y="40" width="300" height="80" fill="#e5484d" />
    <text x="400" y="88" text-anchor="middle" fill="#ffffff">SVIP</text>
  </g>

  <g id="zone-vip"
     data-zone-code="vip"
     data-zone-name="VIP"
     data-ticket-name="VIP"
     data-total-quantity="300"
     data-price="1500000"
     data-max-per-user="4">
    <rect x="160" y="150" width="480" height="90" fill="#e0a82e" />
    <text x="400" y="200" text-anchor="middle" fill="#111111">VIP</text>
  </g>

  <g id="zone-cat-1"
     data-zone-code="cat-1"
     data-zone-name="CAT 1"
     data-ticket-name="CAT 1"
     data-total-quantity="600"
     data-price="900000">
    <rect x="80" y="270" width="640" height="90" fill="#3d6f8f" />
    <text x="400" y="320" text-anchor="middle" fill="#ffffff">CAT 1</text>
  </g>
</svg>
```

Backend sẽ tạo dữ liệu tương ứng:

- `SeatZone.code = data-zone-code` sau khi normalize.
- `SeatZone.name = data-ticket-name` hoặc `data-zone-name`.
- `SeatZone.svgElementId = id` nếu có.
- `TicketType.name = data-ticket-name` hoặc `data-zone-name`.
- `TicketType.totalQuantity = data-total-quantity`.
- `TicketType.remaining = data-total-quantity`.
- `TicketType.price = data-price`.
- `TicketType.maxPerUser = data-max-per-user` hoặc `4`.

## 4. Validate và sanitize bảo mật

Backend chỉ chấp nhận:

- File có đuôi `.svg` hoặc MIME `image/svg+xml`.
- Dung lượng tối đa `1 MB`.
- SVG inline có `<svg ...>` và `</svg>`.
- Ít nhất một vùng có đủ `data-zone-code`, `data-total-quantity`, `data-price`.
- `data-zone-code` không trùng trong cùng file.
- `data-total-quantity` và `data-max-per-user` là số nguyên dương.
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
data-total-quantity, data-price, data-max-per-user
```

## 5. Kịch bản lỗi

| Lỗi                                          | Xử lý                                                         |
| -------------------------------------------- | ------------------------------------------------------------- |
| File không phải `.svg`                       | Trả `400 Bad Request`                                         |
| SVG vượt 1 MB                                | Trả `400 Bad Request`                                         |
| SVG có script/event handler                  | Trả `400 Bad Request`                                         |
| Thiếu metadata hạng vé                       | Trả `400 Bad Request`                                         |
| `data-zone-code` trùng                       | Trả `400 Bad Request`                                         |
| Không upload SVG và không nhập `ticketTypes` | Concert vẫn được tạo draft, admin có thể thêm ticket type sau |

## 6. Tiêu chí chấp nhận

- Admin tạo concert bằng form không upload SVG và nhập ticket type thủ công thành công.
- Admin tạo concert bằng `multipart/form-data` có `file` SVG thành công.
- Backend tự tạo `SeatZone` và `TicketType` theo metadata SVG.
- SVG lưu lên storage là bản đã sanitize, không giữ attribute/tag ngoài whitelist.
- SVG có `script`, `onload`, `javascript:` hoặc tag ngoài nhóm an toàn bị reject hoặc bị loại bỏ theo policy bảo mật.
- File sai định dạng, quá dung lượng hoặc thiếu metadata trả lỗi rõ ràng.
