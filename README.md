# TicketBox

![pnpm](https://img.shields.io/badge/pnpm-10.33.4-F69220?logo=pnpm&logoColor=white)
![Turbo](https://img.shields.io/badge/Turbo-2.9.14-EF4444?logo=turborepo&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111111)
![Expo](https://img.shields.io/badge/Expo-56-000020?logo=expo&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

TicketBox là hệ thống đặt vé sự kiện/concert theo mô hình monorepo. Project gồm backend NestJS + Prisma, frontend Next.js và ứng dụng mobile Expo phục vụ check-in tại cổng sự kiện.

## Mục Lục

- [Tổng quan](#tổng-quan)
- [Kiến trúc thư mục](#kiến-trúc-thư-mục)
- [Công nghệ chính](#công-nghệ-chính)
- [Yêu cầu cài đặt](#yêu-cầu-cài-đặt)
- [Chạy local](#chạy-local)
- [Biến môi trường](#biến-môi-trường)
- [Scripts thường dùng](#scripts-thường-dùng)
- [Tài liệu API](#tài-liệu-api)
- [Tài khoản seed](#tài-khoản-seed)
- [Troubleshooting](#troubleshooting)

## Tổng Quan

TicketBox hỗ trợ các luồng chính:

- Quản lý concert, poster, seat map, khu vực ghế và loại vé.
- Đăng ký, đăng nhập, refresh token và phân quyền theo RBAC.
- Đặt giữ vé, tạo order, thanh toán qua VNPay/MoMo và sinh vé QR.
- Xem vé đã mua, mã QR và thông tin sự kiện trên frontend.
- Check-in vé bằng mobile app, có hỗ trợ sync/offline flow.
- Import guest list, thông báo, dashboard doanh thu và AI artist bio.

## Kiến Trúc Thư Mục

```text
.
+-- apps
|   +-- be                # Backend NestJS, Prisma, worker, API modules
|   +-- fe                # Frontend Next.js
|   +-- checkin-mobile    # Expo React Native app cho nhân viên check-in
+-- blueprint             # Tài liệu/bản thiết kế phụ trợ
+-- docker-compose.yml    # Postgres, Redis, Mailhog, MinIO
+-- package.json          # Root scripts dùng Turbo
+-- pnpm-workspace.yaml   # Cấu hình workspace
+-- turbo.json            # Pipeline build/dev/lint
```

## Công Nghệ Chính

| Nhóm | Công nghệ |
| --- | --- |
| Package manager | ![pnpm](https://img.shields.io/badge/pnpm-10.33.4-F69220?logo=pnpm&logoColor=white) |
| Monorepo runner | ![Turbo](https://img.shields.io/badge/Turbo-2.9.14-EF4444?logo=turborepo&logoColor=white) |
| Backend | ![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white) |
| Database/cache | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white) ![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white) |
| Queue | ![BullMQ](https://img.shields.io/badge/BullMQ-5-CB3837?logo=npm&logoColor=white) |
| Frontend | ![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white) ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111111) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white) |
| Mobile | ![Expo](https://img.shields.io/badge/Expo-56-000020?logo=expo&logoColor=white) ![React Native](https://img.shields.io/badge/React_Native-0.85-61DAFB?logo=react&logoColor=111111) |
| Local infrastructure | ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white) ![Mailhog](https://img.shields.io/badge/Mailhog-SMTP-22C55E) ![MinIO](https://img.shields.io/badge/MinIO-S3_Compatible-C72E49?logo=minio&logoColor=white) |
| Tích hợp | ![VNPay](https://img.shields.io/badge/VNPay-Payment-005BAC) ![MoMo](https://img.shields.io/badge/MoMo-Payment-A50064) ![Google OAuth](https://img.shields.io/badge/Google_OAuth-Auth-4285F4?logo=google&logoColor=white) ![Gemini](https://img.shields.io/badge/Gemini-AI-8E75B2?logo=googlegemini&logoColor=white) |

## Yêu Cầu Cài Đặt

- Node.js phiên bản mới phù hợp với Next/Nest hiện tại.
- `pnpm` theo version trong repo:

```bash
corepack enable
corepack prepare pnpm@10.33.4 --activate
```

- Docker Desktop hoặc Docker Engine để chạy database/cache/storage local.
- Expo Go hoặc Android/iOS simulator nếu chạy app check-in mobile.

## Chạy Local

### 1. Cài dependencies

```bash
pnpm install
```

### 2. Khởi động dịch vụ hạ tầng

```bash
docker compose up -d
```

Các service local:

| Service | URL/Port | Ghi chú |
| --- | --- | --- |
| PostgreSQL | `localhost:5432` | Database chính |
| Redis | `localhost:6379` | Queue/cache/waiting room |
| Mailhog SMTP | `localhost:1025` | SMTP local |
| Mailhog UI | `http://localhost:8025` | Xem email local |
| MinIO API | `http://localhost:9000` | S3-compatible storage |
| MinIO Console | `http://localhost:9001` | Quản lý bucket |

### 3. Cấu hình backend env

Tạo hoặc cập nhật file `apps/be/.env`. Giá trị local tối thiểu nên gồm:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nest_prisma_db?schema=public"
PORT=3001

JWT_ACCESS_SECRET="change-me-access"
JWT_REFRESH_SECRET="change-me-refresh"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
JWT_TICKET_SECRET="change-me-ticket"

REDIS_HOST=localhost
REDIS_PORT=6379

SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
MAIL_FROM="TicketBox <noreply@ticketbox.local>"
APP_BASE_URL="http://localhost:3000"

AWS_ACCESS_KEY_ID="minioadmin"
AWS_SECRET_ACCESS_KEY="minioadmin"
AWS_S3_REGION="us-east-1"
AWS_S3_BUCKET="ticketbox-media"
AWS_S3_ENDPOINT="http://localhost:9000"
AWS_S3_FORCE_PATH_STYLE=true
```

Thêm các biến sau nếu cần chạy đầy đủ tích hợp thật:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

GEMINI_API_KEY=
GEMINI_MODEL="gemini-1.5-flash"
GEMINI_MAX_TOKENS=2048

VNP_TMN_CODE=
VNP_HASH_SECRET=
VNP_URL="https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
VNP_RETURN_URL="http://localhost:3000/checkout/result"

MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=
MOMO_ENDPOINT=
MOMO_REDIRECT_URL=
MOMO_IPN_URL=
```

### 4. Chạy migration và seed data

```bash
pnpm --filter @repo/be exec prisma migrate dev
pnpm --filter @repo/be exec prisma generate
pnpm --filter @repo/be db:seed
```

### 5. Chạy backend API

```bash
pnpm --filter @repo/be dev
```

Backend mặc định chạy tại:

```text
http://localhost:3001
```

Kiểm tra health:

```bash
curl http://localhost:3001/health
```

### 6. Chạy frontend

Mở terminal khác:

```bash
pnpm --filter @repo/fe dev
```

Frontend chạy tại:

```text
http://localhost:3000
```

Frontend browser gọi backend qua Next rewrite `/api`; server-side fetch đang trỏ về `http://127.0.0.1:3001`.

### 7. Chạy check-in mobile

Mở terminal khác:

```bash
pnpm --filter @repo/checkin-mobile dev
```

Mặc định app dùng:

```text
http://10.0.2.2:3000
```

Nếu backend local đang chạy ở `3001`, đặt env khi start Expo:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001 pnpm --filter @repo/checkin-mobile dev
```

Trên thiết bị thật, thay `10.0.2.2` bằng IP LAN của máy đang chạy backend.

## Biến Môi Trường

Backend đọc env từ `apps/be/.env`. Các nhóm biến quan trọng:

| Nhóm | Biến |
| --- | --- |
| Database | `DATABASE_URL` |
| Server | `NODE_ENV`, `PORT`, `APP_BASE_URL` |
| JWT/Auth | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `JWT_TICKET_SECRET` |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` |
| Mail | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` |
| S3/MinIO | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_REGION`, `AWS_S3_BUCKET`, `AWS_S3_ENDPOINT`, `AWS_S3_FORCE_PATH_STYLE` |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` |
| AI Bio | `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_MAX_TOKENS` |
| Payment | `VNP_TMN_CODE`, `VNP_HASH_SECRET`, `VNP_URL`, `VNP_RETURN_URL`, `MOMO_*` |
| Seed | `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_FULL_NAME` |

Không commit secret thật lên git. Nếu cần chia sẻ cấu hình, tạo file `.env.example` chỉ gồm tên biến và giá trị placeholder.

## Scripts Thường Dùng

Root monorepo:

| Lệnh | Tác dụng |
| --- | --- |
| `pnpm dev` | Chạy `turbo run dev` cho các app |
| `pnpm build` | Build các package/app |
| `pnpm lint` | Chạy lint qua Turbo |

Backend:

| Lệnh | Tác dụng |
| --- | --- |
| `pnpm --filter @repo/be dev` | Chạy Nest API watch mode |
| `pnpm --filter @repo/be dev:worker` | Chạy worker entry |
| `pnpm --filter @repo/be build` | Build backend |
| `pnpm --filter @repo/be start` | Chạy `dist/main.js` |
| `pnpm --filter @repo/be migrate:dev` | Chạy migration dev |
| `pnpm --filter @repo/be migrate:deploy` | Apply migration production |
| `pnpm --filter @repo/be migrate:status` | Xem trạng thái migration |
| `pnpm --filter @repo/be migrate:studio` | Mở Prisma Studio |
| `pnpm --filter @repo/be db:seed` | Seed role, permission và demo data |

Frontend:

| Lệnh | Tác dụng |
| --- | --- |
| `pnpm --filter @repo/fe dev` | Chạy Next dev server |
| `pnpm --filter @repo/fe build` | Build frontend |
| `pnpm --filter @repo/fe start` | Chạy Next production server |
| `pnpm --filter @repo/fe lint` | Lint frontend |

Mobile:

| Lệnh | Tác dụng |
| --- | --- |
| `pnpm --filter @repo/checkin-mobile dev` | Chạy Expo |
| `pnpm --filter @repo/checkin-mobile android` | Mở Android target |
| `pnpm --filter @repo/checkin-mobile ios` | Mở iOS target |
| `pnpm --filter @repo/checkin-mobile web` | Chạy Expo web |

## Tài Liệu API

- Backend API README chi tiết: `apps/be/README.md`
- Postman collection: `apps/be/ticketbox.postman_collection.json`
- Response thành công được wrap trong `data`.
- Lỗi được wrap với `success: false`, `message` và `metadata`.
- Auth dùng JWT access token qua header:

```http
Authorization: Bearer <accessToken>
```

- Refresh token được lưu trong httpOnly cookie `refreshToken` với browser flow.
- Check-in mobile gửi thêm header:

```http
X-TicketBox-Client: checkin-mobile
```

## Tài Khoản Seed

Seed script có thể đọc các biến:

```env
SEED_ADMIN_EMAIL=admin@gmail.com
SEED_ADMIN_PASSWORD=123456
SEED_ADMIN_FULL_NAME="System Admin"
```

Nếu không set, backend seed dùng giá trị mặc định trong `apps/be/prisma/seed.ts`.

## Troubleshooting

### Frontend không gọi được API

- Đảm bảo backend đang chạy ở `http://localhost:3001`.
- Đảm bảo `apps/fe/next.config.mjs` rewrite `/api` về đúng backend.
- Nếu gọi refresh/logout trên browser, request cần `credentials: "include"`.

### Lỗi Prisma không kết nối được database

- Kiểm tra `docker compose ps`.
- Kiểm tra `DATABASE_URL` trong `apps/be/.env`.
- Chạy lại:

```bash
pnpm --filter @repo/be exec prisma migrate dev
```

### Mobile app không kết nối backend

- Android emulator dùng `http://10.0.2.2:3001`.
- iOS simulator có thể dùng `http://localhost:3001`.
- Thiết bị thật phải dùng IP LAN của máy tính và cùng mạng Wi-Fi.

### Không nhận được email local

- Kiểm tra Mailhog UI tại `http://localhost:8025`.
- Đảm bảo `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `SMTP_SECURE=false`.

### Upload file/asset lỗi

- Kiểm tra MinIO đang chạy tại `http://localhost:9001`.
- Đảm bảo bucket trong env trùng với bucket được tạo bởi `docker-compose.yml`.
