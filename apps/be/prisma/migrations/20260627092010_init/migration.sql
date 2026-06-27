/*
  Warnings:

  - A unique constraint covering the columns `[dedupe_key]` on the table `notifications` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "concert_id" UUID,
ADD COLUMN     "dedupe_key" VARCHAR(200);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");

-- CreateIndex
CREATE INDEX "notifications_concert_id_idx" ON "notifications"("concert_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
