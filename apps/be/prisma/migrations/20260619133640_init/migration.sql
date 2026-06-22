-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "payment_grace_until" TIMESTAMPTZ(6),
ADD COLUMN     "released_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "orders_status_payment_grace_until_idx" ON "orders"("status", "payment_grace_until");

-- CreateIndex
CREATE INDEX "orders_released_at_idx" ON "orders"("released_at");
