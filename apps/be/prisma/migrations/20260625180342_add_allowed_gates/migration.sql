-- AlterTable
ALTER TABLE "guest_list" ADD COLUMN     "allowed_gates" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ticket_types" ADD COLUMN     "allowed_gates" TEXT[] DEFAULT ARRAY[]::TEXT[];
