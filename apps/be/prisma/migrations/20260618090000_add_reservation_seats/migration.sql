-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "concert_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "reservation_seats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reservation_id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "seat_number" VARCHAR(30) NOT NULL,
    "status" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reservation_seats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reservation_seats_concert_id_seat_number_idx" ON "reservation_seats"("concert_id", "seat_number");

-- CreateIndex
CREATE INDEX "reservation_seats_reservation_id_idx" ON "reservation_seats"("reservation_id");

-- CreateIndex
CREATE INDEX "reservation_seats_ticket_type_id_idx" ON "reservation_seats"("ticket_type_id");

-- CreateIndex
CREATE INDEX "reservation_seats_status_expires_at_idx" ON "reservation_seats"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_concert_id_seat_number_key" ON "tickets"("concert_id", "seat_number");

-- AddForeignKey
ALTER TABLE "reservation_seats" ADD CONSTRAINT "reservation_seats_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_seats" ADD CONSTRAINT "reservation_seats_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_seats" ADD CONSTRAINT "reservation_seats_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
