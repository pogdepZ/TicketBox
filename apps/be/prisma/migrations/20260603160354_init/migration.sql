-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'DELETED');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('GLOBAL', 'CONCERT', 'GATE');

-- CreateEnum
CREATE TYPE "ConcertStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ArtistBioStatus" AS ENUM ('EMPTY', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "TicketTypeStatus" AS ENUM ('ACTIVE', 'PAUSED', 'SOLD_OUT', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('HELD', 'CONFIRMED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_PROCESSING', 'PAID', 'PAYMENT_FAILED', 'EXPIRED', 'CANCELLED', 'REFUND_REQUIRED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('VNPAY', 'MOMO');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('VNPAY', 'MOMO');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ACTIVE', 'USED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CheckinDeviceStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'LOST');

-- CreateEnum
CREATE TYPE "CheckinMode" AS ENUM ('ONLINE', 'OFFLINE_SYNC');

-- CreateEnum
CREATE TYPE "CheckinResult" AS ENUM ('ACCEPTED', 'REJECTED', 'CONFLICT');

-- CreateEnum
CREATE TYPE "GuestImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "GuestRowStatus" AS ENUM ('PENDING', 'VALID', 'INVALID');

-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('ACTIVE', 'CHECKED_IN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'PUSH', 'SMS', 'ZALO');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "WaitingRoomStatus" AS ENUM ('WAITING', 'ADMITTED', 'EXPIRED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255),
    "full_name" VARCHAR(100) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(100) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "scope_type" "ScopeType" NOT NULL DEFAULT 'GLOBAL',
    "scope_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "artist_name" VARCHAR(200),
    "artist_bio" TEXT,
    "artist_bio_status" "ArtistBioStatus" NOT NULL DEFAULT 'EMPTY',
    "venue_name" VARCHAR(200) NOT NULL,
    "venue_address" TEXT NOT NULL,
    "event_date" TIMESTAMPTZ(6) NOT NULL,
    "poster_url" VARCHAR(500),
    "seat_map_svg_url" VARCHAR(500),
    "status" "ConcertStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "concerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "concert_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(7),
    "svg_element_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seat_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "concert_id" UUID NOT NULL,
    "seat_zone_id" UUID,
    "name" VARCHAR(50) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "total_quantity" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "max_per_user" INTEGER NOT NULL DEFAULT 4,
    "sale_start_at" TIMESTAMPTZ(6),
    "sale_end_at" TIMESTAMPTZ(6),
    "status" "TicketTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'HELD',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reservation_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "reservation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_ticket_quotas" (
    "user_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "held_quantity" INTEGER NOT NULL DEFAULT 0,
    "paid_quantity" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_ticket_quotas_pkey" PRIMARY KEY ("user_id","ticket_type_id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "reservation_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "payment_retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_retry_at" TIMESTAMPTZ(6),
    "total_amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethod",
    "payment_ref" VARCHAR(100),
    "paid_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "gateway_transaction_id" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "signature_valid" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "ticket_code" VARCHAR(50) NOT NULL,
    "qr_payload" TEXT NOT NULL,
    "seat_number" VARCHAR(30),
    "status" "TicketStatus" NOT NULL DEFAULT 'ACTIVE',
    "scanned_at" TIMESTAMPTZ(6),
    "scanned_by" UUID,
    "scanned_device" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkin_devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "device_code" VARCHAR(100) NOT NULL,
    "staff_user_id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "gate_name" VARCHAR(100),
    "status" "CheckinDeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_sync_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkin_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkin_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "staff_user_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "client_event_id" VARCHAR(100) NOT NULL,
    "scanned_at_client" TIMESTAMPTZ(6),
    "scanned_at_server" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode" "CheckinMode" NOT NULL,
    "result" "CheckinResult" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkin_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_import_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "concert_id" UUID NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "file_hash" VARCHAR(128),
    "status" "GuestImportStatus" NOT NULL DEFAULT 'PENDING',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "valid_rows" INTEGER NOT NULL DEFAULT 0,
    "invalid_rows" INTEGER NOT NULL DEFAULT 0,
    "error_report_url" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "guest_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_import_rows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "full_name" VARCHAR(100),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "guest_type" VARCHAR(50),
    "guest_code" VARCHAR(50),
    "validation_status" "GuestRowStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_list" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "concert_id" UUID NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "guest_type" VARCHAR(50),
    "guest_code" VARCHAR(50) NOT NULL,
    "status" "GuestStatus" NOT NULL DEFAULT 'ACTIVE',
    "csv_batch_id" UUID,
    "scanned_at" TIMESTAMPTZ(6),
    "scanned_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "concert_id" UUID NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "file_type" VARCHAR(50),
    "original_file_name" VARCHAR(255),
    "status" "AssetStatus" NOT NULL DEFAULT 'UPLOADED',
    "extracted_text" TEXT,
    "generated_bio" TEXT,
    "error_message" TEXT,
    "uploaded_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "artist_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "channel" "NotificationChannel" NOT NULL,
    "template" VARCHAR(50) NOT NULL,
    "payload" JSONB,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMPTZ(6),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "key" VARCHAR(128) NOT NULL,
    "user_id" UUID,
    "request_hash" VARCHAR(128) NOT NULL,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'PROCESSING',
    "response_status" INTEGER,
    "response_body" JSONB,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "waiting_room_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "concert_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(128) NOT NULL,
    "position" INTEGER,
    "status" "WaitingRoomStatus" NOT NULL DEFAULT 'WAITING',
    "admitted_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waiting_room_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(50),
    "resource_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE INDEX "user_roles_scope_type_scope_id_idx" ON "user_roles"("scope_type", "scope_id");

-- CreateIndex
CREATE INDEX "concerts_status_event_date_idx" ON "concerts"("status", "event_date");

-- CreateIndex
CREATE UNIQUE INDEX "seat_zones_concert_id_code_key" ON "seat_zones"("concert_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "seat_zones_id_concert_id_key" ON "seat_zones"("id", "concert_id");

-- CreateIndex
CREATE INDEX "ticket_types_concert_id_idx" ON "ticket_types"("concert_id");

-- CreateIndex
CREATE INDEX "ticket_types_sale_start_at_sale_end_at_idx" ON "ticket_types"("sale_start_at", "sale_end_at");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_types_concert_id_name_key" ON "ticket_types"("concert_id", "name");

-- CreateIndex
CREATE INDEX "reservations_user_id_idx" ON "reservations"("user_id");

-- CreateIndex
CREATE INDEX "reservations_status_expires_at_idx" ON "reservations"("status", "expires_at");

-- CreateIndex
CREATE INDEX "reservation_items_ticket_type_id_idx" ON "reservation_items"("ticket_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "reservation_items_reservation_id_ticket_type_id_key" ON "reservation_items"("reservation_id", "ticket_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_reservation_id_key" ON "orders"("reservation_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "orders_payment_ref_key" ON "orders"("payment_ref");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_status_expires_at_idx" ON "orders"("status", "expires_at");

-- CreateIndex
CREATE INDEX "order_items_ticket_type_id_idx" ON "order_items"("ticket_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_order_id_ticket_type_id_key" ON "order_items"("order_id", "ticket_type_id");

-- CreateIndex
CREATE INDEX "payment_events_order_id_idx" ON "payment_events"("order_id");

-- CreateIndex
CREATE INDEX "payment_events_created_at_idx" ON "payment_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_gateway_gateway_transaction_id_event_type_key" ON "payment_events"("gateway", "gateway_transaction_id", "event_type");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_code_key" ON "tickets"("ticket_code");

-- CreateIndex
CREATE INDEX "tickets_order_id_idx" ON "tickets"("order_id");

-- CreateIndex
CREATE INDEX "tickets_owner_user_id_idx" ON "tickets"("owner_user_id");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_ticket_type_id_idx" ON "tickets"("ticket_type_id");

-- CreateIndex
CREATE INDEX "tickets_ticket_code_status_idx" ON "tickets"("ticket_code", "status");

-- CreateIndex
CREATE UNIQUE INDEX "checkin_devices_device_code_key" ON "checkin_devices"("device_code");

-- CreateIndex
CREATE INDEX "checkin_devices_staff_user_id_idx" ON "checkin_devices"("staff_user_id");

-- CreateIndex
CREATE INDEX "checkin_devices_concert_id_idx" ON "checkin_devices"("concert_id");

-- CreateIndex
CREATE INDEX "checkin_events_ticket_id_idx" ON "checkin_events"("ticket_id");

-- CreateIndex
CREATE INDEX "checkin_events_device_id_idx" ON "checkin_events"("device_id");

-- CreateIndex
CREATE INDEX "checkin_events_result_idx" ON "checkin_events"("result");

-- CreateIndex
CREATE INDEX "checkin_events_created_at_idx" ON "checkin_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "checkin_events_device_id_client_event_id_key" ON "checkin_events"("device_id", "client_event_id");

-- CreateIndex
CREATE INDEX "guest_import_batches_concert_id_idx" ON "guest_import_batches"("concert_id");

-- CreateIndex
CREATE INDEX "guest_import_batches_concert_id_file_hash_idx" ON "guest_import_batches"("concert_id", "file_hash");

-- CreateIndex
CREATE INDEX "guest_import_batches_status_idx" ON "guest_import_batches"("status");

-- CreateIndex
CREATE INDEX "guest_import_rows_batch_id_idx" ON "guest_import_rows"("batch_id");

-- CreateIndex
CREATE INDEX "guest_list_concert_id_idx" ON "guest_list"("concert_id");

-- CreateIndex
CREATE INDEX "guest_list_guest_code_idx" ON "guest_list"("guest_code");

-- CreateIndex
CREATE UNIQUE INDEX "guest_list_concert_id_guest_code_key" ON "guest_list"("concert_id", "guest_code");

-- CreateIndex
CREATE INDEX "artist_assets_concert_id_idx" ON "artist_assets"("concert_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "idempotency_records_expires_at_idx" ON "idempotency_records"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "waiting_room_sessions_token_key" ON "waiting_room_sessions"("token");

-- CreateIndex
CREATE INDEX "waiting_room_sessions_concert_id_status_idx" ON "waiting_room_sessions"("concert_id", "status");

-- CreateIndex
CREATE INDEX "waiting_room_sessions_token_idx" ON "waiting_room_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "waiting_room_sessions_concert_id_user_id_key" ON "waiting_room_sessions"("concert_id", "user_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concerts" ADD CONSTRAINT "concerts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_zones" ADD CONSTRAINT "seat_zones_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_seat_zone_id_concert_id_fkey" FOREIGN KEY ("seat_zone_id", "concert_id") REFERENCES "seat_zones"("id", "concert_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_items" ADD CONSTRAINT "reservation_items_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_items" ADD CONSTRAINT "reservation_items_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ticket_quotas" ADD CONSTRAINT "user_ticket_quotas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ticket_quotas" ADD CONSTRAINT "user_ticket_quotas_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_scanned_by_fkey" FOREIGN KEY ("scanned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_devices" ADD CONSTRAINT "checkin_devices_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_devices" ADD CONSTRAINT "checkin_devices_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_events" ADD CONSTRAINT "checkin_events_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_events" ADD CONSTRAINT "checkin_events_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_events" ADD CONSTRAINT "checkin_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "checkin_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_import_batches" ADD CONSTRAINT "guest_import_batches_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_import_rows" ADD CONSTRAINT "guest_import_rows_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "guest_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_list" ADD CONSTRAINT "guest_list_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_list" ADD CONSTRAINT "guest_list_csv_batch_id_fkey" FOREIGN KEY ("csv_batch_id") REFERENCES "guest_import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_list" ADD CONSTRAINT "guest_list_scanned_by_fkey" FOREIGN KEY ("scanned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_assets" ADD CONSTRAINT "artist_assets_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_assets" ADD CONSTRAINT "artist_assets_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiting_room_sessions" ADD CONSTRAINT "waiting_room_sessions_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiting_room_sessions" ADD CONSTRAINT "waiting_room_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
