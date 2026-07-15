-- DropForeignKey
ALTER TABLE "checkin_events" DROP CONSTRAINT "checkin_events_ticket_id_fkey";

-- AlterTable
ALTER TABLE "checkin_events" ADD COLUMN     "guest_id" UUID,
ALTER COLUMN "ticket_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "checkin_events_guest_id_idx" ON "checkin_events"("guest_id");

-- AddForeignKey
ALTER TABLE "checkin_events" ADD CONSTRAINT "checkin_events_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_events" ADD CONSTRAINT "checkin_events_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guest_list"("id") ON DELETE SET NULL ON UPDATE CASCADE;
