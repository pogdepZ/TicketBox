/*
  Warnings:

  - A unique constraint covering the columns `[concert_id,email]` on the table `guest_list` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[concert_id,phone]` on the table `guest_list` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "GuestRowStatus" ADD VALUE 'DUPLICATE';

-- AlterTable
ALTER TABLE "guest_import_batches" ADD COLUMN     "duplicate_rows" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "guest_import_rows" ALTER COLUMN "full_name" SET DATA TYPE TEXT,
ALTER COLUMN "email" SET DATA TYPE TEXT,
ALTER COLUMN "phone" SET DATA TYPE TEXT,
ALTER COLUMN "guest_type" SET DATA TYPE TEXT,
ALTER COLUMN "guest_code" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "guest_list_concert_id_email_key" ON "guest_list"("concert_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "guest_list_concert_id_phone_key" ON "guest_list"("concert_id", "phone");
