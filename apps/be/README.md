# TicketBox Backend API

README nay mo ta cac API hien co cua backend NestJS trong `apps/be` de FE tich hop.

## Base URL

Local default:

```text
http://localhost:3000
```

Postman collection:

```text
apps/be/ticketbox.postman_collection.json
```

## Run Local

Tu root repo:

```bash
docker compose up -d
pnpm --filter @repo/be exec prisma migrate dev
pnpm --filter @repo/be exec prisma generate
pnpm --filter @repo/be db:seed
pnpm --filter @repo/be dev
```

Backend doc bien moi truong tu `apps/be/.env`.

## Response Format

Tat ca response thanh cong duoc wrap boi global interceptor:

```json
{
  "statusCode": 200,
  "message": "Request successful",
  "data": {},
  "metadata": {
    "statusCode": 200,
    "method": "GET",
    "path": "/health",
    "timestamp": "2026-06-06T00:00:00.000Z"
  }
}
```

Tat ca response loi duoc wrap boi global exception filter:

```json
{
  "success": false,
  "message": "You do not have permission",
  "metadata": {
    "statusCode": 403,
    "method": "POST",
    "path": "/concerts",
    "timestamp": "2026-06-06T00:00:00.000Z"
  }
}
```

FE nen doc du lieu chinh tu `response.data`.

## Auth

Backend dung JWT access token va refresh token cookie.

- Access token tra ve trong body khi login/refresh.
- FE gui access token bang header:

```http
Authorization: Bearer <accessToken>
```

- Refresh token nam trong httpOnly cookie ten `refreshToken`.
- Cookie path: `/auth/refresh`.
- Khi goi `/auth/refresh`, FE can gui cookie kem request.
- CORS dang bat `credentials: true`, FE nen dung `credentials: "include"` neu goi refresh/logout qua browser.

## RBAC

He thong hien tai la RBAC thuan, khong con data scope.

### Roles va Permissions

`customer`

```text
concert:read
order:create
order:read_own
payment:create
ticket:read_own
```

`admin`

```text
user:manage
concert:read_admin
concert:create
concert:update
concert:cancel
ticket_type:manage
order:read_admin
ticket:read_admin
revenue:read
guest_import:manage
artist_bio:manage
checker:manage
```

`checker`

```text
checkin:scan
checkin:sync
checkin:snapshot_read
ticket:verify
```

Response user khong co `scopeType` hoac `scopeId`.

## Data Shapes

### AuthUser

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "phone": "0900000000",
  "fullName": "TicketBox User",
  "status": "ACTIVE",
  "roles": [
    {
      "name": "customer",
      "permissions": [
        "concert:read",
        "order:create",
        "order:read_own",
        "payment:create",
        "ticket:read_own"
      ]
    }
  ]
}
```

### Concert

```json
{
  "id": "uuid",
  "name": "TicketBox Live",
  "description": "A sample concert",
  "artistName": "The TicketBox Band",
  "artistBio": null,
  "artistBioStatus": "empty",
  "venueName": "TicketBox Arena",
  "venueAddress": "123 Nguyen Hue, District 1, Ho Chi Minh City",
  "eventDate": "2026-07-01T12:00:00.000Z",
  "seatMapSvg": "<svg></svg>",
  "posterUrl": "https://example.com/poster.png",
  "status": "draft",
  "createdBy": "uuid",
  "createdAt": "2026-06-06T00:00:00.000Z",
  "updatedAt": "2026-06-06T00:00:00.000Z"
}
```

Concert status:

```text
draft
published
cancelled
completed
```

Artist bio status:

```text
empty
processing
done
failed
```

## Endpoints

### Health

#### `GET /health`

Public.

Response `200`:

```json
{
  "statusCode": 200,
  "message": "Request successful",
  "data": {
    "status": "ok"
  },
  "metadata": {
    "statusCode": 200,
    "method": "GET",
    "path": "/health",
    "timestamp": "2026-06-06T00:00:00.000Z"
  }
}
```

### Auth

#### `POST /auth/register`

Public. Tao user moi va gan role `customer`.

Request body:

```json
{
  "email": "customer@example.com",
  "phone": "0900000000",
  "password": "password123",
  "fullName": "TicketBox Customer",
  "status": "ACTIVE"
}
```

Fields:

| Field | Required | Notes |
| --- | --- | --- |
| `email` | yes | Email, max 255 |
| `phone` | no | String, max 20 |
| `password` | yes | Min 6, max 72 |
| `fullName` | yes | String, max 100 |
| `status` | no | `ACTIVE`, `BLOCKED`, `DELETED` |

Response `201`, `data` la `AuthUser`:

```json
{
  "statusCode": 201,
  "message": "Request successful",
  "data": {
    "id": "uuid",
    "email": "customer@example.com",
    "phone": "0900000000",
    "fullName": "TicketBox Customer",
    "status": "ACTIVE",
    "roles": [
      {
        "name": "customer",
        "permissions": [
          "concert:read",
          "order:create",
          "order:read_own",
          "payment:create",
          "ticket:read_own"
        ]
      }
    ]
  },
  "metadata": {
    "statusCode": 201,
    "method": "POST",
    "path": "/auth/register",
    "timestamp": "2026-06-06T00:00:00.000Z"
  }
}
```

Common errors:

| Status | Message |
| --- | --- |
| `409` | `Email already exists` |
| `500` | `Default customer role is not seeded` |

#### `POST /auth/login`

Public. Dang nhap bang email/password. Backend set `refreshToken` httpOnly cookie va tra `accessToken`.

Request body:

```json
{
  "email": "customer@example.com",
  "password": "password123"
}
```

Response `201`:

```json
{
  "statusCode": 201,
  "message": "Request successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "customer@example.com",
      "phone": "0900000000",
      "fullName": "TicketBox Customer",
      "status": "ACTIVE",
      "roles": [
        {
          "name": "customer",
          "permissions": [
            "concert:read",
            "order:create",
            "order:read_own",
            "payment:create",
            "ticket:read_own"
          ]
        }
      ]
    },
    "accessToken": "jwt"
  },
  "metadata": {
    "statusCode": 201,
    "method": "POST",
    "path": "/auth/login",
    "timestamp": "2026-06-06T00:00:00.000Z"
  }
}
```

Common errors:

| Status | Message |
| --- | --- |
| `401` | `Invalid email or password` |

#### `POST /auth/refresh`

Public theo route, nhung yeu cau cookie `refreshToken`.

Request:

```http
Cookie: refreshToken=<refreshToken>
```

Response `201`:

```json
{
  "statusCode": 201,
  "message": "Request successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "customer@example.com",
      "phone": "0900000000",
      "fullName": "TicketBox Customer",
      "status": "ACTIVE",
      "roles": [
        {
          "name": "customer",
          "permissions": [
            "concert:read",
            "order:create",
            "order:read_own",
            "payment:create",
            "ticket:read_own"
          ]
        }
      ]
    },
    "accessToken": "new-jwt"
  },
  "metadata": {
    "statusCode": 201,
    "method": "POST",
    "path": "/auth/refresh",
    "timestamp": "2026-06-06T00:00:00.000Z"
  }
}
```

Common errors:

| Status | Message |
| --- | --- |
| `401` | `Refresh token is missing` |
| `401` | `Invalid refresh token` |
| `401` | `User is not active` |

#### `GET /auth/profile`

Protected. Can header:

```http
Authorization: Bearer <accessToken>
```

Response `200`, `data` la `AuthUser`:

```json
{
  "statusCode": 200,
  "message": "Request successful",
  "data": {
    "id": "uuid",
    "email": "customer@example.com",
    "phone": "0900000000",
    "fullName": "TicketBox Customer",
    "status": "ACTIVE",
    "roles": [
      {
        "name": "customer",
        "permissions": [
          "concert:read",
          "order:create",
          "order:read_own",
          "payment:create",
          "ticket:read_own"
        ]
      }
    ]
  },
  "metadata": {
    "statusCode": 200,
    "method": "GET",
    "path": "/auth/profile",
    "timestamp": "2026-06-06T00:00:00.000Z"
  }
}
```

Common errors:

| Status | Message |
| --- | --- |
| `401` | Unauthorized / invalid token |

#### `POST /auth/logout`

Public. Clear cookie `refreshToken`.

Response `201`:

```json
{
  "statusCode": 201,
  "message": "Request successful",
  "data": {
    "message": "Logged out successfully"
  },
  "metadata": {
    "statusCode": 201,
    "method": "POST",
    "path": "/auth/logout",
    "timestamp": "2026-06-06T00:00:00.000Z"
  }
}
```

### Concerts

#### `POST /concerts`

Protected. Can permission:

```text
concert:create
```

Request headers:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Request body:

```json
{
  "name": "TicketBox Live",
  "description": "A sample concert",
  "artistName": "The TicketBox Band",
  "venueName": "TicketBox Arena",
  "venueAddress": "123 Nguyen Hue, District 1, Ho Chi Minh City",
  "eventDate": "2026-07-01T12:00:00.000Z",
  "seatMapSvg": "<svg viewBox=\"0 0 100 100\"></svg>",
  "posterUrl": "https://example.com/poster.png"
}
```

Fields:

| Field | Required | Notes |
| --- | --- | --- |
| `name` | yes | String, max 200 |
| `description` | no | String |
| `artistName` | no | String, max 200 |
| `venueName` | yes | String, max 200 |
| `venueAddress` | yes | String |
| `eventDate` | yes | ISO date string, phai lon hon thoi diem hien tai |
| `seatMapSvg` | no | Raw SVG string |
| `posterUrl` | no | String, max 500 |

Response `201`, `data` la `Concert` voi status `draft`.

Common errors:

| Status | Message |
| --- | --- |
| `401` | Missing/invalid token |
| `403` | `You do not have permission` |
| `400` | `eventDate must be greater than now` |

#### `GET /concerts`

Public. Lay danh sach concert co pagination/filter.

Query params:

| Param | Required | Default | Notes |
| --- | --- | --- | --- |
| `page` | no | `1` | Min 1 |
| `limit` | no | `10` | Min 1, max 100 |
| `status` | no | none | `draft`, `published`, `cancelled`, `completed` |
| `keyword` | no | none | Search theo `name`, `artistName`, `venueName` |
| `fromDate` | no | none | ISO date, filter `eventDate >= fromDate` |
| `toDate` | no | none | ISO date, filter `eventDate <= toDate` |

Example:

```http
GET /concerts?page=1&limit=10&status=published&keyword=live
```

Response `200`:

```json
{
  "statusCode": 200,
  "message": "Request successful",
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "TicketBox Live",
        "description": "A sample concert",
        "artistName": "The TicketBox Band",
        "artistBio": null,
        "artistBioStatus": "empty",
        "venueName": "TicketBox Arena",
        "venueAddress": "123 Nguyen Hue, District 1, Ho Chi Minh City",
        "eventDate": "2026-07-01T12:00:00.000Z",
        "seatMapSvg": "<svg></svg>",
        "posterUrl": "https://example.com/poster.png",
        "status": "published",
        "createdBy": "uuid",
        "createdAt": "2026-06-06T00:00:00.000Z",
        "updatedAt": "2026-06-06T00:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  },
  "metadata": {
    "statusCode": 200,
    "method": "GET",
    "path": "/concerts?page=1&limit=10&status=published&keyword=live",
    "timestamp": "2026-06-06T00:00:00.000Z"
  }
}
```

#### `GET /concerts/:id`

Public. Lay detail mot concert.

Response `200`, `data` la `Concert`.

Common errors:

| Status | Message |
| --- | --- |
| `404` | `Concert not found` |

#### `PATCH /concerts/:id`

Protected. Can permission:

```text
concert:update
```

Request body la partial cua create concert, them `artistBio`:

```json
{
  "description": "Updated description",
  "artistName": "Updated Artist",
  "artistBio": "Artist bio",
  "venueName": "Updated Venue",
  "venueAddress": "Updated Address",
  "eventDate": "2026-08-01T12:00:00.000Z",
  "seatMapSvg": "<svg></svg>",
  "posterUrl": "https://example.com/new-poster.png"
}
```

Business rules:

- Concert `cancelled` hoac `completed` khong duoc update.
- Concert `draft` duoc update cac field cua create DTO.
- Concert `published` chi duoc update:
  - `description`
  - `posterUrl`
  - `seatMapSvg`
  - `artistBio`
- Khong gui `status` trong body.
- Neu update `eventDate`, date moi phai lon hon hien tai.

Response `200`, `data` la `Concert`.

Common errors:

| Status | Message |
| --- | --- |
| `401` | Missing/invalid token |
| `403` | `You do not have permission` |
| `403` | `Cancelled or completed concerts cannot be updated` |
| `403` | `Field <field> cannot be updated after publish` |
| `404` | `Concert not found` |

#### `PATCH /concerts/:id/publish`

Protected. Can permission:

```text
concert:update
```

Request body: none.

Business rules:

- Chi concert `draft` moi publish duoc.
- Concert phai co `name`, `venueName`, `venueAddress`.
- `eventDate` phai lon hon hien tai.

Response `200`, `data` la `Concert` voi status `published`.

Common errors:

| Status | Message |
| --- | --- |
| `401` | Missing/invalid token |
| `403` | `You do not have permission` |
| `404` | `Concert not found` |
| `409` | `Only draft concerts can be published` |
| `400` | `eventDate must be greater than now` |

#### `PATCH /concerts/:id/cancel`

Protected. Can permission:

```text
concert:cancel
```

Request body:

```json
{
  "reason": "Cancelled by admin"
}
```

`reason` hien tai duoc validate nhung chua persist vao DB.

Business rules:

- Concert `completed` khong duoc cancel.
- Concert `cancelled` goi lai se tra ve concert hien tai.
- Concert `draft` hoac `published` se chuyen sang `cancelled`.

Response `200`, `data` la `Concert` voi status `cancelled`.

Common errors:

| Status | Message |
| --- | --- |
| `401` | Missing/invalid token |
| `403` | `You do not have permission` |
| `404` | `Concert not found` |
| `409` | `Completed concerts cannot be cancelled` |

#### `PATCH /concerts/:id/complete`

Protected. Can permission:

```text
concert:update
```

Request body: none.

Business rules:

- Chi concert `published` moi complete duoc.
- Chi complete duoc sau khi `eventDate` da qua.

Response `200`, `data` la `Concert` voi status `completed`.

Common errors:

| Status | Message |
| --- | --- |
| `401` | Missing/invalid token |
| `403` | `You do not have permission` |
| `404` | `Concert not found` |
| `409` | `Only published concerts can be completed` |
| `400` | `Concert can only be completed after eventDate` |

## Frontend Integration Notes

- Success response: doc du lieu tu `res.data.data`.
- Error response: doc message tu `res.data.message`.
- Authenticated request: gan `Authorization: Bearer ${accessToken}`.
- Refresh request tren browser: can gui cookie, vi du `fetch(url, { credentials: "include" })`.
- Role/permission tra ve trong user response de FE an/hien UI, nhung backend van la noi enforce quyen that.
- Ownership nhu `ticket:read_own`, `order:read_own` phai duoc enforce trong service endpoint tuong ung khi cac module ticket/order duoc implement.

## Current Implemented Modules

Hien tai `AppModule` dang register:

```text
Health
Auth
Concerts
```

Permissions cho order/payment/ticket/checker da duoc seed san, nhung endpoint tuong ung chua co trong code hien tai.
