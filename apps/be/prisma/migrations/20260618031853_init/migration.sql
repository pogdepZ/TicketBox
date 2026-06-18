/*
  Warnings:

  - The values [CONFLICT] on the enum `CheckinResult` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CheckinResult_new" AS ENUM ('ACCEPTED', 'REJECTED', 'DUPLICATE');
ALTER TABLE "checkin_events" ALTER COLUMN "result" TYPE "CheckinResult_new" USING ("result"::text::"CheckinResult_new");
ALTER TYPE "CheckinResult" RENAME TO "CheckinResult_old";
ALTER TYPE "CheckinResult_new" RENAME TO "CheckinResult";
DROP TYPE "public"."CheckinResult_old";
COMMIT;
